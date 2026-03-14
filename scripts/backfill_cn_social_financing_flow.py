#!/usr/bin/env python3
"""Backfill CN Social Financing Flow into Supabase macro_cn.

- Source: AkShare macro_china_shrzgm() (monthly flow, unit typically 100 million RMB)
- Target: Supabase table macro_cn column social_financing_flow (numeric)
- Strategy: write to month-end date rows; upsert only (date + social_financing_flow + source + updated_at)
- IMPORTANT: does not overwrite other macro_cn fields.

Usage:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 scripts/backfill_cn_social_financing_flow.py

"""

import os
import sys
import datetime as dt
import pandas as pd

try:
    import akshare as ak
except Exception as e:
    print("ERROR: akshare not available:", e)
    sys.exit(1)

try:
    from supabase import create_client
except Exception:
    print("ERROR: python supabase client not installed. Run: pip install supabase")
    sys.exit(1)

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(2)


def month_end_date(yyyymm: str) -> str:
    y = int(yyyymm[:4])
    m = int(yyyymm[4:6])
    # month end: first day next month - 1 day
    if m == 12:
        ny, nm = y + 1, 1
    else:
        ny, nm = y, m + 1
    d = dt.date(ny, nm, 1) - dt.timedelta(days=1)
    return d.isoformat()


def main():
    print("[CN][SHRZGM] fetching ak.macro_china_shrzgm() …")
    df = ak.macro_china_shrzgm()
    if df is None or df.empty:
        raise RuntimeError("AkShare returned empty dataframe")

    if "月份" not in df.columns or "社会融资规模增量" not in df.columns:
        raise RuntimeError(f"Unexpected columns: {list(df.columns)}")

    out = df[["月份", "社会融资规模增量"]].copy()
    out["month"] = out["月份"].astype(str).str.slice(0, 6)
    out["value"] = pd.to_numeric(out["社会融资规模增量"], errors="coerce")
    out = out.dropna(subset=["value", "month"])

    now = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

    rows = []
    for _, r in out.iterrows():
        yyyymm = str(r["month"])
        d = month_end_date(yyyymm)
        rows.append(
            {
                "date": f"{d}T00:00:00+00:00",
                "social_financing_flow": float(r["value"]),
                "source": "akshare_shrzgm",
                "updated_at": now,
            }
        )

    print(f"[CN][SHRZGM] months={len(rows)} range={rows[0]['date'][:10]}..{rows[-1]['date'][:10]}")

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # upsert in batches
    batch = 200
    for i in range(0, len(rows), batch):
        part = rows[i : i + batch]
        resp = sb.table("macro_cn").upsert(part, on_conflict="date").execute()
        # supabase-py returns data+count; errors raise
        _ = resp

    print("Done.")


if __name__ == "__main__":
    main()
