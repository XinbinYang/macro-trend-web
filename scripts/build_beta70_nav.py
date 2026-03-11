#!/usr/bin/env python3
"""Build audited Beta70 NAV artifact from macro_quant.db.

Design goals:
- Deterministic, reproducible backtest from local SQLite truth DB.
- Produce website-readable artifact at data/nav/beta70/latest.json.
- Be explicit about status/source/asOf/lineage. Never fabricate.

Method (default):
- Universe columns from all_weather_master_data: HS300, ZZ500, CN10Y_Bond, NDX, US10Y_Bond, Nanhua, Gold
- Monthly rebalance on first available trading day of each month.
- NAV output: MONTHLY (end-of-month) series by default (use --freq daily for daily output).
- Risk model: Equal Risk Contribution (risk parity) using Ledoit-Wolf shrunk covariance.
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
from typing import Dict, List, Tuple


ASSET_COLS = [
    ("HS300", "CN_STOCKS_HS300"),
    ("ZZ500", "CN_STOCKS_ZZ500"),
    ("CN10Y_Bond", "CN_BONDS_10Y"),
    ("NDX", "US_STOCKS_NDX"),
    ("US10Y_Bond", "US_BONDS_10Y"),
    ("Nanhua", "COMMODITY_NANHUA"),
    ("Gold", "GOLD"),
]


def ledoit_wolf_shrinkage_cov(returns: List[List[float]]) -> List[List[float]]:
    """Simple Ledoit-Wolf shrinkage to constant-correlation prior.

    This is a pragmatic implementation to stabilize covariance in noisy settings.
    Returns daily covariance matrix.
    """
    n = len(returns)
    t = min(len(r) for r in returns)
    if n == 0 or t < 2:
        return [[0.0] * n for _ in range(n)]

    # align
    X = [r[-t:] for r in returns]

    # compute sample covariance
    means = [sum(x) / t for x in X]
    S = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i, n):
            cov = 0.0
            for k in range(t):
                cov += (X[i][k] - means[i]) * (X[j][k] - means[j])
            cov /= (t - 1)
            S[i][j] = cov
            S[j][i] = cov

    # constant correlation prior
    var = [S[i][i] for i in range(n)]
    std = [math.sqrt(max(v, 0.0)) for v in var]
    rho_sum = 0.0
    cnt = 0
    for i in range(n):
        for j in range(i + 1, n):
            denom = std[i] * std[j]
            if denom > 0:
                rho_sum += S[i][j] / denom
                cnt += 1
    rho = rho_sum / cnt if cnt else 0.0

    F = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i == j:
                F[i][j] = var[i]
            else:
                F[i][j] = rho * std[i] * std[j]

    # shrinkage intensity (heuristic): clamp to [0,1]
    # Full LW needs phi/gamma; we use a stable heuristic depending on t and n.
    # More data -> less shrink. More assets -> more shrink.
    alpha = min(1.0, max(0.0, (n + 1) / max(10.0, t)))

    C = [[(1 - alpha) * S[i][j] + alpha * F[i][j] for j in range(n)] for i in range(n)]
    return C


def portfolio_vol(w: List[float], C: List[List[float]]) -> float:
    v = 0.0
    n = len(w)
    for i in range(n):
        for j in range(n):
            v += w[i] * w[j] * C[i][j]
    return math.sqrt(max(v, 0.0))


def risk_parity_erc(C: List[List[float]], max_iter=500, tol=1e-8) -> List[float]:
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="macro_quant.db")
    ap.add_argument("--out", default="data/nav/beta70/latest.json")
    ap.add_argument("--lookback", type=int, default=120)
    ap.add_argument("--maxw", type=float, default=0.35)
    ap.add_argument("--freq", choices=["daily", "monthly"], default="monthly", help="Output NAV frequency")
    args = ap.parse_args()

    db_path = Path(args.db)
    out_path = Path(args.out)

    if not db_path.exists():
        raise SystemExit(f"DB not found: {db_path}")

    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row

    cols = [c for c, _ in ASSET_COLS]
    sql = f"SELECT Date, {', '.join(cols)} FROM all_weather_master_data ORDER BY Date ASC"
    rows = con.execute(sql).fetchall()
    if not rows:
        raise SystemExit("No rows in all_weather_master_data")

    # Drop clearly invalid timestamps (observed a few 1970-01-01 rows in DB)
    filtered = []
    for r in rows:
        ds = str(r["Date"])[:10]
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

    # rebalance indices: first trading day each month
    reb_idx = set(first_trading_day_of_month(dates))

    # nav simulation
    base = 100.0
    nav = [base]
    nav_dates = [dates[0]]

    # initialize weights equal
    n_assets = len(cols)
    w = [1.0 / n_assets] * n_assets

    # precompute daily returns per asset from prices
    asset_rets = [log_returns(prices_by_col[c]) for c in cols]
    # align asset returns to dates[1:]

    for t in range(1, len(dates)):
        # monthly rebalance at t if in reb_idx and enough lookback
        if t in reb_idx and t > args.lookback:
            # build lookback return series ending at t-1 (since returns indexed from 1)
            window_rets = []
            for i in range(n_assets):
                r = asset_rets[i]
                # r index corresponds to date index+1
                end = t - 1
                start = max(0, end - args.lookback)
                # slice returns for [start, end)
                window_rets.append(r[start:end])

            C = ledoit_wolf_shrinkage_cov(window_rets)
            w = risk_parity_erc(C)
            w = clamp_and_renorm(w, lo=0.0, hi=args.maxw)

        # portfolio return at t uses asset returns at t-1
        port_r = 0.0
        for i in range(n_assets):
            r = asset_rets[i][t - 1]
            port_r += w[i] * r

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

    out = {
        "strategy": "beta70",
        "name": "全球宏观对冲 (Beta 7.0)",
        "status": "SAMPLE",  # will be switched to LIVE only after pricing audit
        "asOf": nav_dates[-1],
        "currency": "USD",
        "base": base,
        "nav": [{"date": d, "value": round(v, 4)} for d, v in zip(nav_dates, nav)],
        "metrics": {
            "cagr": None if metrics["cagr"] is None else round(metrics["cagr"], 6),
            "vol": None if metrics["vol"] is None else round(metrics["vol"], 6),
            "maxDrawdown": None if metrics["maxDrawdown"] is None else round(metrics["maxDrawdown"], 6),
            "sharpe": None if metrics["sharpe"] is None else round(metrics["sharpe"], 6),
        },
        "dataLineage": {
            "truthLayer": "Backtest/Signal",
            "sources": ["macro_quant.db:all_weather_master_data"],
            "pricing": "From DB (Spot/Settle curated upstream)",
            "model": {
                "navFrequency": freq_label,
                "rebalance": "MONTHLY (first trading day)",
                "lookbackDays": args.lookback,
                "riskModel": "ERC Risk Parity + Ledoit-Wolf shrinkage covariance",
                "constraints": {"weightMin": 0.0, "weightMax": args.maxw, "leverage": 1.0},
            },
            "dataQuality": {"forwardFillCount": ff_count},
            "notes": "Status remains SAMPLE until pricing lineage (Spot/Settle) is fully audited end-to-end.",
        },
        "disclaimer": "SAMPLE backtest artifact generated locally from macro_quant.db. Not indicative of performance.",
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote: {out_path} (asOf={out['asOf']}, points={len(out['nav'])})")


if __name__ == "__main__":
    main()
