#!/usr/bin/env python3
"""Apply SQLite migrations to macro_quant.db.

Usage:
  python3 scripts/apply_migrations.py --db macro_quant.db
"""

from __future__ import annotations

import argparse
import glob
import sqlite3
from pathlib import Path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", default="macro_quant.db")
    ap.add_argument("--migrations", default="data/migrations")
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    con.execute("PRAGMA journal_mode=WAL")

    migs = sorted(glob.glob(str(Path(args.migrations) / "*.sql")))
    if not migs:
        raise SystemExit(f"No migrations found in {args.migrations}")

    for m in migs:
        with open(m, "r", encoding="utf-8") as f:
            con.executescript(f.read())
        print(f"Applied: {m}")

    con.commit()
    con.close()


if __name__ == "__main__":
    main()
