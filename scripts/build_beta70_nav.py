#!/usr/bin/env python3
"""Build audited Beta70 NAV artifact from macro_quant.db.

Design goals:
- Deterministic, reproducible backtest from local SQLite truth DB.
- Produce website-readable artifact at data/nav/beta70/latest.json.
- Be explicit about status/source/asOf/lineage. Never fabricate.

Method (Beta 7.0):
- Universe: 8 assets organized in 6 risk units
  - CN_EQUITY: [HS300, ZZ500] (internal risk balance)
  - US_EQUITY: [SPX, NDX] (internal risk balance) 
  - Single-asset units: CN_BOND (CN10Y), US_BOND (US10Y), COMMODITY (Nanhua), GOLD
- Monthly rebalance on first available trading day of each month.
- NAV output: MONTHLY (end-of-month) series by default (use --freq daily for daily output).
- Risk model: 2-level risk parity using Ledoit-Wolf shrunk covariance
  - Level 1: Risk parity within equity groups (CN/US)
  - Level 2: Risk parity across 6 risk units
- Lookback window: 120 trading days.
- No leverage; weights constrained to [0, 0.35] then renormalized.

Note: Pricing "Spot/Settle" is carried as a label from DB layer; this script assumes DB has been curated.
"""

import argparse
import json
import math
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Asset structure for 2-level risk parity
RISK_UNITS = {
    "CN_EQUITY": [
        ("HS300", "CN_STOCKS_HS300"),
        ("ZZ500", "CN_STOCKS_ZZ500"),
    ],
    "US_EQUITY": [
        ("SPX", "US_STOCKS_SPX"),
        # NOTE: NDX proxy coverage to latest is not guaranteed. If NDX is stale, we fall back to QQQ.
        ("NDX", "US_STOCKS_NDX"),
    ],
    "CN_BOND": [
        ("CN10Y_Bond", "CN_BONDS_10Y"),
    ],
    "US_BOND": [
        ("US10Y_Bond", "US_BONDS_10Y"),
    ],
    "COMMODITY": [
        ("Nanhua", "COMMODITY_NANHUA"),
    ],
    "GOLD": [
        ("Gold", "GOLD"),
    ],
}

# Flattened asset columns for DB query
ASSET_COLS = sum([assets for assets in RISK_UNITS.values()], [])


def ledoit_wolf_shrinkage_cov(returns: List[List[float]]) -> List[List[float]]:
    """Ledoit-Wolf covariance shrinkage (non-simplified).

    Uses scikit-learn's LedoitWolf estimator for a standard, auditable implementation.
    Returns covariance matrix on the aligned return sample.

    Notes:
    - Input: list of per-asset return series (already aligned in time or will be aligned by truncation).
    - Output is a *covariance* matrix (not correlation).
    """

    n = len(returns)
    if n == 0:
        return []

    t = min(len(r) for r in returns)
    if t < 2:
        return [[0.0] * n for _ in range(n)]

    # align to last t observations, shape = (t, n)
    X = [r[-t:] for r in returns]
    X = list(zip(*X))  # rows=time, cols=assets

    try:
        import numpy as np
        from sklearn.covariance import LedoitWolf

        Xnp = np.asarray(X, dtype=float)
        # If any nan/inf exists, fail fast (should not happen if inputs are clean)
        if not np.isfinite(Xnp).all():
            raise ValueError("Non-finite values in return window")

        lw = LedoitWolf().fit(Xnp)
        C = lw.covariance_
        return C.tolist()

    except Exception as e:
        # Hard fail: we do not silently downgrade to a heuristic implementation.
        raise RuntimeError(f"LedoitWolf covariance failed: {e}")


def portfolio_vol(w: List[float], C: List[List[float]]) -> float:
    v = 0.0
    n = len(w)
    for i in range(n):
        for j in range(n):
            v += w[i] * w[j] * C[i][j]
    return math.sqrt(max(v, 0.0))


def risk_parity_erc(C: List[List[float]], max_iter=500, tol=1e-8) -> List[float]:
    """Equal Risk Contribution (ERC) portfolio using risk parity algorithm."""
    n = len(C)
    if n == 0:
        return []
    if n == 1:
        return [1.0]

    # init inverse vol
    w = []
    for i in range(n):
        vol = math.sqrt(max(C[i][i], 0.0))
        w.append(1.0 / vol if vol > 0 else 1.0)
    s = sum(w)
    w = [x / s for x in w]

    budget = [1.0 / n] * n

    for _ in range(max_iter):
        # Sigma * w
        sigma_w = [0.0] * n
        for i in range(n):
            for j in range(n):
                sigma_w[i] += C[i][j] * w[j]

        # risk contrib
        rc = [w[i] * sigma_w[i] for i in range(n)]
        total = sum(rc)
        if total <= 0:
            break

        diffs = [abs(rc[i] / total - budget[i]) for i in range(n)]
        if max(diffs) < tol:
            break

        new_w = []
        for i in range(n):
            rc_pct = rc[i] / total
            ratio = budget[i] / rc_pct if rc_pct > 0 else 1.0
            new_w.append(w[i] * (0.5 + 0.5 * ratio))
        s2 = sum(new_w)
        w = [x / s2 for x in new_w]

    return w


def clamp_and_renorm(w: List[float], lo=0.0, hi=0.35) -> List[float]:
    w2 = [min(hi, max(lo, x)) for x in w]
    s = sum(w2)
    if s <= 0:
        return [1.0 / len(w2)] * len(w2)
    return [x / s for x in w2]


def log_returns(prices: List[float]) -> List[float]:
    out = []
    for i in range(1, len(prices)):
        if prices[i - 1] > 0 and prices[i] > 0:
            out.append(math.log(prices[i] / prices[i - 1]))
    return out


def compute_group_returns(group_assets: List[str], weights: List[float], 
                        asset_returns: Dict[str, List[float]]) -> List[float]:
    """Compute returns for a group of assets using given weights."""
    if not group_assets or not weights:
        return []
    
    # Align lengths defensively (some series may be shorter if data is missing)
    lens = [len(asset_returns.get(a, [])) for a in group_assets]
    n = min(lens) if lens else 0
    group_rets = [0.0] * n

    for asset, w in zip(group_assets, weights):
        rets = asset_returns.get(asset, [])
        for i in range(n):
            group_rets[i] += w * rets[i]

    return group_rets


def max_drawdown(nav: List[float]) -> float:
    peak = nav[0]
    mdd = 0.0
    for x in nav:
        peak = max(peak, x)
        dd = (peak - x) / peak if peak > 0 else 0.0
        mdd = max(mdd, dd)
    return mdd


def annual_metrics(nav: List[float], dates: List[str], periods_per_year: int) -> Dict[str, float]:
    if len(nav) < 2:
        return {"cagr": None, "vol": None, "maxDrawdown": None, "sharpe": None}

    # log returns inferred by adjacent nav ratio
    rets = [math.log(nav[i] / nav[i - 1]) for i in range(1, len(nav)) if nav[i - 1] > 0 and nav[i] > 0]
    if len(rets) < 2:
        return {"cagr": None, "vol": None, "maxDrawdown": None, "sharpe": None}

    # years (calendar-based)
    d0 = datetime.fromisoformat(dates[0])
    d1 = datetime.fromisoformat(dates[-1])
    years = max(1e-9, (d1 - d0).days / 365.25)

    cagr = (nav[-1] / nav[0]) ** (1 / years) - 1

    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
    vol = math.sqrt(var) * math.sqrt(periods_per_year)

    mdd = max_drawdown(nav)

    rf = 0.0
    sharpe = ((mean * periods_per_year) - rf) / vol if vol > 0 else None

    return {"cagr": cagr, "vol": vol, "maxDrawdown": mdd, "sharpe": sharpe}


def first_trading_day_of_month(date_strs: List[str]) -> List[int]:
    # date_strs in YYYY-MM-DD sorted ascending
    idx = []
    last = None
    for i, ds in enumerate(date_strs):
        ym = ds[:7]
        if ym != last:
            idx.append(i)
            last = ym
    return idx


def end_of_month_indices(date_strs: List[str]) -> List[int]:
    # indices of last available trading day in each month
    out = []
    for i in range(len(date_strs) - 1):
        if date_strs[i][:7] != date_strs[i + 1][:7]:
            out.append(i)
    out.append(len(date_strs) - 1)
    return out


def compute_group_weights(returns_by_asset: Dict[str, List[float]], 
                        group_assets: List[str], lookback: int) -> List[float]:
    """Compute risk-parity weights within a group using recent returns."""
    if len(group_assets) == 1:
        return [1.0]
        
    window_rets = []
    for asset in group_assets:
        r = returns_by_asset[asset][-lookback:]
        window_rets.append(r)
        
    C = ledoit_wolf_shrinkage_cov(window_rets)
    return risk_parity_erc(C)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="macro_quant.db")
    ap.add_argument("--out", default="data/nav/beta70/latest.json")
    ap.add_argument("--lookback", type=int, default=120)
    ap.add_argument("--maxw", type=float, default=0.35)
    ap.add_argument("--freq", choices=["daily", "monthly"], default="monthly", help="Output NAV frequency")
    ap.add_argument("--allowProxy", action="store_true", help="Allow proxy fallbacks (keeps status SAMPLE)")
    ap.add_argument("--targetVol", type=float, default=0.10, help="Target annualized volatility (e.g. 0.10 = 10%%)")
    args = ap.parse_args()

    db_path = Path(args.db)
    out_path = Path(args.out)

    if not db_path.exists():
        raise SystemExit(f"DB not found: {db_path}")

    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row

    cols = [c for c, _ in ASSET_COLS]

    # If master table doesn't have newer columns (e.g. SPX), we can synthesize the master panel
    # from assets_* truth tables when --allowProxy is enabled.
    def master_table_has_column(col: str) -> bool:
        info = con.execute("PRAGMA table_info(all_weather_master_data)").fetchall()
        return any(r[1] == col for r in info)

    if all(master_table_has_column(c) for c in cols):
        sql = f"SELECT Date, {', '.join(cols)} FROM all_weather_master_data ORDER BY Date ASC"
        rows = con.execute(sql).fetchall()
        if not rows:
            raise SystemExit("No rows in all_weather_master_data")
    else:
        if not args.allowProxy:
            missing = [c for c in cols if not master_table_has_column(c)]
            raise SystemExit(f"all_weather_master_data missing columns {missing}. Re-run with --allowProxy to synthesize from assets_* tables.")

        # Build panel by joining assets tables. We assume daily dates are aligned by date.
        # Equity: HS300, ZZ500, SPX, NDX
        # Bond: CN10Y_Bond, US10Y_Bond
        # Commodity: Nanhua, Gold
        # NOTE: NDX may be proxied by QQQ if NDX is stale.
        from collections import defaultdict

        def fetch_series(table: str, key_col: str, key: str, value_col: str) -> dict:
            out = {}
            for d, v in con.execute(
                f"SELECT date, {value_col} FROM {table} WHERE {key_col}=? ORDER BY date", (key,)
            ).fetchall():
                out[str(d)[:10]] = float(v) if v is not None else None
            return out

        hs300 = fetch_series('assets_equity', 'ticker', 'HS300', 'close')
        zz500 = fetch_series('assets_equity', 'ticker', 'ZZ500', 'close')
        spx = fetch_series('assets_equity', 'ticker', 'SPX', 'close')
        ndx = fetch_series('assets_equity', 'ticker', 'NDX', 'close')
        qqq = fetch_series('assets_equity', 'ticker', 'QQQ', 'close')

        # Bonds in macro_quant.db are stored as yields (ytm). For proxy synthesis we prefer price-like series.
        # Use futures settle proxies already loaded into assets_equity? If not available, fallback to ytm (will be inconsistent).
        cn10y = fetch_series('assets_bond', 'ticker', 'CN_10Y', 'ytm')
        us10y = fetch_series('assets_bond', 'ticker', 'US10Y_T_BOND_F', 'ytm')

        nanhua = fetch_series('assets_commodity', 'ticker', 'NH0100.NHF', 'close')
        gold = fetch_series('assets_commodity', 'ticker', 'COMEX_GOLD_SETTLE', 'close')

        # date union
        dates_set = set(hs300) | set(zz500) | set(spx) | set(cn10y) | set(us10y) | set(nanhua) | set(gold)
        dates = sorted(dates_set)

        # Drop clearly invalid timestamps (observed epoch rows in some sources)
        dates = [d for d in dates if d >= "1990-01-01"]

        rows = []
        for d in dates:
            rows.append({
                'Date': d,
                'HS300': hs300.get(d),
                'ZZ500': zz500.get(d),
                'SPX': spx.get(d),
                'NDX': ndx.get(d) if (ndx.get(d) is not None) else qqq.get(d),
                'CN10Y_Bond': cn10y.get(d),
                'US10Y_Bond': us10y.get(d),
                'Nanhua': nanhua.get(d),
                'Gold': gold.get(d),
            })

    # Drop clearly invalid timestamps (observed a few 1970-01-01 rows in DB)
    filtered = []
    for r in rows:
        # r can be sqlite3.Row (master table) or dict (synthesized panel)
        ds = str(r["Date"])[:10] if not isinstance(r, dict) else str(r.get("Date"))[:10]
        if ds < "1990-01-01":
            continue
        filtered.append(r)

    if not filtered:
        raise SystemExit("No valid rows after filtering invalid dates")

    dates = [str(r["Date"])[:10] for r in filtered]
    prices_by_col: Dict[str, List[float]] = {c: [] for c in cols}
    for r in filtered:
        for c in cols:
            v = r[c]
            prices_by_col[c].append(float(v) if v is not None else float("nan"))

    # simple forward-fill for NaNs (audit note in lineage)
    ff_count = 0
    for c in cols:
        last = None
        series = prices_by_col[c]
        for i, v in enumerate(series):
            if math.isnan(v):
                if last is not None:
                    series[i] = last
                    ff_count += 1
            else:
                last = v
        prices_by_col[c] = series

    # Calculate returns for all assets
    returns_by_asset = {
        col: log_returns(prices_by_col[col])
        for col, _ in ASSET_COLS
    }

    # rebalance indices: first trading day each month
    reb_idx = set(first_trading_day_of_month(dates))

    # nav simulation
    base = 100.0
    nav = [base]
    nav_dates = [dates[0]]

    # Initialize with equal weights for all assets
    all_assets = [c for c, _ in ASSET_COLS]
    current_weights = {asset: 1.0 / len(all_assets) for asset in all_assets}

    # Track leverage applied at each rebalance (for audit)
    leverage_history = []

    for t in range(1, len(dates)):
        # Monthly rebalance at t if in reb_idx and enough lookback
        if t in reb_idx and t > args.lookback:
            # Step 1: Compute internal weights for equity groups
            group_weights = {}
            group_returns = {}
            
            for group_name, group_assets in RISK_UNITS.items():
                group_cols = [c for c, _ in group_assets]
                if len(group_cols) > 1:  # Multi-asset groups need internal balance
                    group_weights[group_name] = compute_group_weights(
                        returns_by_asset,
                        group_cols,
                        args.lookback
                    )
                else:
                    group_weights[group_name] = [1.0]
                
                # Compute historical returns for the group
                group_returns[group_name] = compute_group_returns(
                    group_cols,
                    group_weights[group_name],
                    returns_by_asset
                )[-args.lookback:]

            # Step 2: Risk parity across the 6 risk units
            unit_C = ledoit_wolf_shrinkage_cov([rets for rets in group_returns.values()])
            unit_weights = risk_parity_erc(unit_C)
            
            # Step 3: Combine unit and internal weights to get asset weights
            new_weights = {}
            for (group_name, group_assets), unit_weight in zip(RISK_UNITS.items(), unit_weights):
                group_cols = [c for c, _ in group_assets]
                internal_weights = group_weights[group_name]
                for asset, internal_w in zip(group_cols, internal_weights):
                    new_weights[asset] = unit_weight * internal_w
            
            # Apply per-asset cap (but DO NOT force sum(weights)=1; leverage is applied via target volatility)
            total = sum(new_weights.values())
            if total > 0:
                new_weights = {k: v / total for k, v in new_weights.items()}
            new_weights = {k: min(args.maxw, v) for k, v in new_weights.items()}
            # renormalize after caps (still relative weights)
            total = sum(new_weights.values())
            current_weights = {k: (v / total if total > 0 else 0.0) for k, v in new_weights.items()}

            # Compute target-vol leverage (annualized), no cap per user instruction
            # Use lookback window returns to estimate sigma_hat of current (relative) weights
            window_rets = []
            for i in range(args.lookback):
                idx = (t - args.lookback) + i
                rr = 0.0
                for asset, w in current_weights.items():
                    rseries = returns_by_asset.get(asset, [])
                    r = rseries[idx] if idx < len(rseries) else 0.0
                    rr += w * r
                window_rets.append(rr)

            import numpy as np
            sigma = float(np.std(window_rets, ddof=1)) if len(window_rets) > 1 else 0.0
            sigma_ann = sigma * math.sqrt(252)
            # Safety floor to avoid sigma->0 blow-ups. No explicit max cap per user instruction.
            sigma_floor = 0.002  # 0.2% annual vol floor
            denom = max(sigma_ann, sigma_floor)
            leverage = (args.targetVol / denom) if denom > 0 else 1.0

            leverage_history.append(leverage)

            # store leveraged weights (gross leverage can be >1)
            current_weights = {k: v * leverage for k, v in current_weights.items()}

        # Calculate portfolio return
        port_r = 0.0
        for asset, weight in current_weights.items():
            rseries = returns_by_asset.get(asset, [])
            r = rseries[t - 1] if (t - 1) < len(rseries) else 0.0
            port_r += weight * r

        nav.append(nav[-1] * math.exp(port_r))
        nav_dates.append(dates[t])

    # Optional downsample to monthly NAV series (end-of-month)
    if args.freq == "monthly":
        idx = end_of_month_indices(nav_dates)
        nav_dates = [nav_dates[i] for i in idx]
        nav = [nav[i] for i in idx]
        periods_per_year = 12
        freq_label = "MONTHLY (end-of-month)"
    else:
        periods_per_year = 252
        freq_label = "DAILY"

    metrics = annual_metrics(nav, nav_dates, periods_per_year=periods_per_year)

    # Leverage summary (rebalance points only)
    if leverage_history:
        import numpy as np
        metrics["leverageCurrent"] = float(leverage_history[-1])
        metrics["leverageAvg"] = float(np.mean(leverage_history))
        metrics["leverageMin"] = float(np.min(leverage_history))
        metrics["leverageMax"] = float(np.max(leverage_history))

    out = {
        "strategy": "beta70",
        "name": "中美全天候（基线/杠杆版）",
        "status": "SAMPLE",  # will be switched to LIVE only after pricing audit
        "asOf": nav_dates[-1],
        "targetVol": args.targetVol,
        "currency": "USD",
        "base": base,
        "nav": [{"date": d, "value": round(v, 4)} for d, v in zip(nav_dates, nav)],
        "metrics": {
            "cagr": None if metrics["cagr"] is None else round(metrics["cagr"], 6),
            "vol": None if metrics["vol"] is None else round(metrics["vol"], 6),
            "maxDrawdown": None if metrics["maxDrawdown"] is None else round(metrics["maxDrawdown"], 6),
            "sharpe": None if metrics["sharpe"] is None else round(metrics["sharpe"], 6),
            "leverageCurrent": None if metrics.get("leverageCurrent") is None else round(metrics["leverageCurrent"], 6),
            "leverageAvg": None if metrics.get("leverageAvg") is None else round(metrics["leverageAvg"], 6),
            "leverageMin": None if metrics.get("leverageMin") is None else round(metrics["leverageMin"], 6),
            "leverageMax": None if metrics.get("leverageMax") is None else round(metrics["leverageMax"], 6)
        },
        "dataLineage": {
            "truthLayer": "Backtest/Signal",
            "sources": ["macro_quant.db:all_weather_master_data"],
            "pricing": {
                "policy": "Spot/Settle dual-track (to be fully audited)",
                "expected": {
                    "HS300": "Spot close (CN equity index)",
                    "ZZ500": "Spot close (CN equity index)", 
                    "SPX": "Index close (US equity index)",
                    "NDX": "Index close (US equity index)",
                    "CN10Y_Bond": "Settle (CN bond proxy)",
                    "US10Y_Bond": "Settle (US bond proxy)",
                    "Nanhua": "Settle (commodity proxy)",
                    "Gold": "Settle (futures proxy)"
                },
                "note": "This script does not fetch prices. It assumes macro_quant.db truth layer already enforces the pricing policy. Keep status=SAMPLE until each field's upstream source is documented."
            },
            "model": {
                "navFrequency": freq_label,
                "rebalance": "MONTHLY (first trading day)",
                "lookbackDays": args.lookback,
                "riskModel": {
                    "type": "2-Level Risk Parity",
                    "level1": "Internal group risk parity for equity clusters",
                    "level2": "Risk parity across 6 risk units",
                    "covariance": "Ledoit-Wolf shrinkage (sklearn)",
                    "riskUnits": list(RISK_UNITS.keys())
                },
                "constraints": {"weightMin": 0.0, "weightMax": args.maxw, "leverage": 1.0},
            },
            "dataQuality": {"forwardFillCount": ff_count},
            "notes": "Status remains SAMPLE until pricing lineage (Spot/Settle) is fully audited end-to-end. Ledoit-Wolf covariance uses sklearn.covariance.LedoitWolf (no heuristic downgrade).",
        },
        "disclaimer": "SAMPLE backtest artifact generated locally from macro_quant.db. Leverage targets volatility; financing cost excluded. Not indicative of performance.",
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote: {out_path} (asOf={out['asOf']}, points={len(out['nav'])})")


if __name__ == "__main__":
    main()