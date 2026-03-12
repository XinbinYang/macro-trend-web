#!/usr/bin/env python3
"""Monthly China macro snapshot via AkShare (CPI + unemployment) -> data/macro/cn/latest.json

Design goals (conservative / cost-saving)
- Runs at most once per month (manual or cron).
- Writes a small, auditable artifact consumed by the web UI.
- If AkShare fails or returns NaN, keep previous file (non-destructive).

Output schema (latest.json)
{
  "region": "CN",
  "status": "LIVE" | "OFF",
  "updatedAt": "ISO",
  "asOf": "YYYY-MM" | null,
  "series": {
    "cpi_yoy": {"value": number|null, "asOf": "YYYY-MM"|null, "source": "AkShare"},
    "unemployment_urban": {"value": number|null, "asOf": "YYYY-MM"|null, "source": "AkShare"}
  },
  "notes": "..."
}
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple


def _now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _parse_month(s: str) -> Optional[str]:
    # Accept:
    # - '202602' -> '2026-02'
    # - '2026-02-01' -> '2026-02'
    # - '2008年02月份' -> '2008-02'
    s = str(s).strip()
    if not s:
        return None
    if len(s) == 6 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}"
    if len(s) >= 7 and s[4] == "-":
        return s[:7]
    if "年" in s and "月" in s:
        try:
            y = s.split("年")[0]
            m = s.split("年")[1].split("月")[0]
            m = m.zfill(2)
            if y.isdigit() and m.isdigit():
                return f"{y}-{m}"
        except Exception:
            return None
    return None


def _latest_valid(series_rows, date_col: str, value_col: str, *, reject_zeros: bool = False) -> Tuple[Optional[str], Optional[float]]:
    """Pick latest row with finite value.

    Some AkShare macro endpoints may append a "future" month row with 0.0 placeholders.
    For series like unemployment, we reject exact zeros by default to avoid false updates.
    """
    import math

    best_date = None
    best_val = None

    for _, r in series_rows.iterrows():
        d = _parse_month(r.get(date_col))
        v = r.get(value_col)
        try:
            v = float(v)
        except Exception:
            continue
        if v is None or math.isnan(v):
            continue
        if d is None:
            continue
        if reject_zeros and abs(v) < 1e-12:
            continue
        # keep the max lexicographically YYYY-MM
        if best_date is None or d > best_date:
            best_date, best_val = d, v

    return best_date, best_val


def fetch_cn_cpi_yoy() -> Tuple[Optional[str], Optional[float]]:
    import akshare as ak  # type: ignore

    df = ak.macro_china_cpi_yearly()  # cols: 商品, 日期, 今值, 预测值, 前值
    if df is None or df.empty:
        return None, None

    # Prefer CPI YoY; AkShare sometimes has NaN for the latest release day.
    # We pick the latest finite value.
    return _latest_valid(df, date_col="日期", value_col="今值", reject_zeros=False)


def fetch_cn_unemployment_urban() -> Tuple[Optional[str], Optional[float]]:
    import akshare as ak  # type: ignore

    df = ak.macro_china_urban_unemployment()  # cols: date, item, value
    if df is None or df.empty:
        return None, None

    # Prefer 全国城镇调查失业率
    sub = df[df["item"].astype(str).str.contains("全国城镇调查失业率", na=False)]
    if sub.empty:
        sub = df

    # Reject 0.0 placeholders
    return _latest_valid(sub, date_col="date", value_col="value", reject_zeros=True)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/macro/cn/latest.json")
    args = ap.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Keep previous on failure
    prev = None
    if out_path.exists():
        try:
            prev = json.loads(out_path.read_text(encoding="utf-8"))
        except Exception:
            prev = None

    try:
        cpi_asof, cpi = fetch_cn_cpi_yoy()
        u_asof, u = fetch_cn_unemployment_urban()

        status = "LIVE" if (cpi is not None or u is not None) else "OFF"
        asof = max([d for d in [cpi_asof, u_asof] if d is not None], default=None)

        payload = {
            "region": "CN",
            "status": status,
            "updatedAt": _now_iso(),
            "asOf": asof,
            "series": {
                "cpi_yoy": {"value": cpi, "asOf": cpi_asof, "source": "AkShare"},
                "unemployment_urban": {"value": u, "asOf": u_asof, "source": "AkShare"},
            },
            "notes": "Monthly snapshot. Indicative display only; not for backtest/signal truth layer.",
        }

        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {out_path} ({status}) asOf={asof}")

    except Exception as e:
        print(f"ERROR: {e}")
        if prev is not None:
            out_path.write_text(json.dumps(prev, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print("Restored previous file (non-destructive)")
        else:
            # Write explicit OFF
            payload = {
                "region": "CN",
                "status": "OFF",
                "updatedAt": _now_iso(),
                "asOf": None,
                "series": {
                    "cpi_yoy": {"value": None, "asOf": None, "source": "AkShare"},
                    "unemployment_urban": {"value": None, "asOf": None, "source": "AkShare"},
                },
                "notes": f"AkShare fetch failed: {e}",
            }
            out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
