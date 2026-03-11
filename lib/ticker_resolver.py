#!/usr/bin/env python3
"""Ticker alias/proxy resolver.

Rules:
- Canonical tickers are used throughout strategy/engine code.
- Alias tickers map to canonical tickers via macro_quant.db:ticker_aliases.
- Proxy aliases must be explicitly marked is_proxy=1.

This module is intentionally small and SQLite-friendly.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Optional, List, Tuple


@dataclass
class AliasInfo:
    canonical: str
    alias: str
    priority: int
    is_proxy: bool
    source: Optional[str]


class TickerResolver:
    def __init__(self, con: sqlite3.Connection):
        self.con = con

    def resolve(self, ticker: str) -> str:
        row = self.con.execute(
            """
            SELECT canonical_ticker
            FROM ticker_aliases
            WHERE alias_ticker = ?
            ORDER BY priority ASC
            LIMIT 1
            """,
            (ticker,),
        ).fetchone()
        return row[0] if row else ticker

    def alias_info(self, ticker: str) -> Optional[AliasInfo]:
        row = self.con.execute(
            """
            SELECT canonical_ticker, alias_ticker, priority, is_proxy, source
            FROM ticker_aliases
            WHERE alias_ticker = ?
            ORDER BY priority ASC
            LIMIT 1
            """,
            (ticker,),
        ).fetchone()
        if not row:
            return None
        return AliasInfo(
            canonical=row[0],
            alias=row[1],
            priority=int(row[2]),
            is_proxy=bool(row[3]),
            source=row[4],
        )

    def aliases_for(self, canonical: str) -> List[AliasInfo]:
        rows = self.con.execute(
            """
            SELECT canonical_ticker, alias_ticker, priority, is_proxy, source
            FROM ticker_aliases
            WHERE canonical_ticker = ?
            ORDER BY priority ASC
            """,
            (canonical,),
        ).fetchall()
        return [
            AliasInfo(
                canonical=r[0],
                alias=r[1],
                priority=int(r[2]),
                is_proxy=bool(r[3]),
                source=r[4],
            )
            for r in rows
        ]


def apply_migration(con: sqlite3.Connection, sql_path: str) -> None:
    with open(sql_path, "r", encoding="utf-8") as f:
        con.executescript(f.read())
