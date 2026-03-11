#!/usr/bin/env python3
"""Update proxy price series from AkShare into macro_quant.db.

Purpose
- Provide fully automated "latest" updates when official settle/spot mirrors are not available.
- MUST be explicitly labeled as proxy in DB source fields.
- Does not change website status to LIVE; downstream artifacts must remain SAMPLE if proxies used.

Current proxies (approved by user):
- US10Y: AkShare EM futures continuous: TY00Y (already considered proxy earlier)
- US equities: SPX, NDX (proxy) via AkShare EM global index spot+hist where available.

Important
- AkShare endpoints can be flaky; failures should be non-destructive.
- This script is best-effort and writes rows with source='AkShare_proxy'.

Usage
  python3 scripts/update_proxies_akshare.py --db macro_quant.db
"""

from __future__ import annotations

import argparse
import sqlite3
from datetime import datetime
from typing import Optional


def ensure_tables(con: sqlite3.Connection) -> None:
    con.execute(
        """
        CREATE TABLE IF NOT EXISTS data_quality_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT,
          table_name TEXT,
          ticker TEXT,
          check_type TEXT,
          severity TEXT,
          description TEXT,
          action_taken TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
        """
    )


def log_dq(
    con: sqlite3.Connection,
    date: Optional[str],
    table: str,
    ticker: str,
    check_type: str,
    severity: str,
    description: str,
    action: str,
) -> None:
    con.execute(
        """
        INSERT INTO data_quality_log(date, table_name, ticker, check_type, severity, description, action_taken, created_at)
        VALUES(?,?,?,?,?,?,?,?)
        """,
        (date, table, ticker, check_type, severity, description, action, datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")),
    )


def upsert_equity_close(con: sqlite3.Connection, date: str, ticker: str, close: float, source: str) -> None:
    con.execute(
        """
        INSERT OR REPLACE INTO assets_equity(date, ticker, close, source, updated_at)
        VALUES(?,?,?,?,?)
        """,
        (date, ticker, float(close), source, datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")),
    )


def update_us_equity_proxy(con: sqlite3.Connection) -> None:
    """Fetch SPX/NDX daily closes via AkShare.

    We use index_global_spot_em for availability checks and attempt to use futures_global_hist_em-like
    historical endpoint when available. In practice, AkShare's stable historical endpoint for SPX/NDX
    is not guaranteed; so we implement best-effort:
    - Try to pull recent spot, write as of today (or last quote time date)
    - If cannot fetch, log warning.

    This keeps the pipeline non-blocking.
    """

    try:
        import akshare as ak  # type: ignore
        import pandas as pd  # type: ignore

        spot = ak.index_global_spot_em()
        spot = spot[spot["代码"].isin(["SPX", "NDX"])]
        if spot.empty:
            log_dq(con, None, "assets_equity", "SPX/NDX", "proxy_fetch", "WARNING", "AkShare index_global_spot_em returned no SPX/NDX rows", "skip")
            return

        for _, r in spot.iterrows():
            code = str(r["代码"]).strip()
            name = str(r["名称"]).strip()
            last = float(r["最新价"])
            ts = str(r["最新行情时间"]).strip()
            # ts like '2026-03-12 03:59:43'
            date = ts.split(" ")[0]
            ticker = "SPX" if code == "SPX" else "NDX"
            upsert_equity_close(con, date, ticker, last, "AkShare_proxy")
            log_dq(con, date, "assets_equity", ticker, "proxy_upsert", "INFO", f"Upserted {ticker} from AkShare index_global_spot_em ({name})", "upsert")

    # Fallback: try to update from Yahoo (close) if AkShare is unavailable.
    # This keeps the automation moving, but remains proxy and keeps strategy SAMPLE.
    # NOTE: Uses pandas_datareader/yfinance is not guaranteed; best-effort only.
    except Exception as e:
        log_dq(con, None, "assets_equity", "SPX/NDX", "proxy_fetch", "WARNING", f"AkShare SPX/NDX proxy fetch failed: {e}", "fallback_yahoo")
        # (No fallback enabled by default; keep strictly AkShare-based proxy to avoid silently changing sources.)
        # If you later approve adding a Yahoo/Polygon fallback, we can implement it explicitly.
        return



def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="macro_quant.db")
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    con.execute("PRAGMA journal_mode=WAL")
    ensure_tables(con)

    update_us_equity_proxy(con)

    con.commit()
    con.close()


if __name__ == "__main__":
    main()
