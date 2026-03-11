#!/usr/bin/env python3
"""Import user-provided Master US indices Excel into macro_quant.db.

This follows the Data Admission Iron Law: user-provided Master file is a top-priority truth source.

Input:
  ../data/us_indices_master_final.xlsx (relative to repo root)
  Columns: Date, SPX, NDX, DJI, RTY

Output:
  macro_quant.db assets_equity:
    - ticker=SPX / NDX / DJI / RTY
    - close=<value>
    - source=US_INDICES_MASTER_FINAL

Notes:
- Does not fabricate missing dates; only imports what exists.
- If a row already exists for same (date,ticker), existing higher-priority sources can be kept by the ETL priority rule.
"""

from __future__ import annotations

import argparse
import sqlite3
from datetime import datetime
from pathlib import Path

import pandas as pd


def ensure_assets_equity(con: sqlite3.Connection) -> None:
    # assets_equity already exists; this is defensive
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS assets_equity (
          date TEXT,
          ticker TEXT,
          name TEXT,
          market TEXT,
          asset_class TEXT,
          open REAL,
          high REAL,
          low REAL,
          close REAL,
          volume REAL,
          market_cap REAL,
          pe_ttm REAL,
          pb REAL,
          dividend_yield REAL,
          source TEXT,
          updated_at TEXT,
          PRIMARY KEY (date, ticker)
        )
        """
    )


SOURCE_PRIORITY = {
    # User-provided Master is highest truth.
    "US_INDICES_MASTER_FINAL": 1,
    # Other known sources
    "AKSHARE_OFFICIAL_SETTLE": 2,
    "Wind": 3,
    "provided_mirrors": 3,
    "Wind_proxy": 4,
    "AkShare_proxy": 4,
    "Yahoo_proxy": 4,
}


def upsert_close_if_higher_priority(con: sqlite3.Connection, date: str, ticker: str, close: float, source: str) -> bool:
    """Upsert only if the incoming source is higher priority than existing."""
    row = con.execute(
        "SELECT source FROM assets_equity WHERE date=? AND ticker=?",
        (date, ticker),
    ).fetchone()

    if row is not None and row[0] is not None:
        existing_source = str(row[0])
        p_old = SOURCE_PRIORITY.get(existing_source, 999)
        p_new = SOURCE_PRIORITY.get(source, 999)
        if p_new >= p_old:
            return False

    con.execute(
        """
        INSERT OR REPLACE INTO assets_equity(date, ticker, close, source, updated_at)
        VALUES(?,?,?,?,?)
        """,
        (date, ticker, float(close), source, datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")),
    )
    return True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="macro_quant.db")
    ap.add_argument("--xlsx", default=str(Path("..") / "data" / "us_indices_master_final.xlsx"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    xlsx_path = Path(args.xlsx)
    if not xlsx_path.exists():
        raise SystemExit(f"Master xlsx not found: {xlsx_path}")

    df = pd.read_excel(xlsx_path)
    if "Date" not in df.columns:
        raise SystemExit("Expected column Date")

    df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")

    tickers = [c for c in ["SPX", "NDX", "DJI", "RTY"] if c in df.columns]
    if not tickers:
        raise SystemExit("No expected ticker columns found")

    con = sqlite3.connect(args.db)
    con.execute("PRAGMA journal_mode=WAL")
    ensure_assets_equity(con)

    n = 0
    for _, r in df.iterrows():
        d = r["Date"]
        for t in tickers:
            v = r[t]
            if pd.isna(v):
                continue
            if not args.dry_run:
                upsert_close_if_higher_priority(con, d, t, float(v), "US_INDICES_MASTER_FINAL")
            n += 1

    if not args.dry_run:
        con.commit()
    con.close()

    print(f"Imported {n} close points from master into {args.db} ({'DRY' if args.dry_run else 'WRITE'})")


if __name__ == "__main__":
    main()
