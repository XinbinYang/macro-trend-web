# Ticker Aliases / Proxy Registry

Purpose
- Keep **canonical tickers** stable in strategy/engine code.
- Allow **alias tickers** (different vendor symbols) to map into canonical tickers.
- Mark any alias as **proxy** (`is_proxy=1`) to enforce `status=SAMPLE` gating.

DB
- Table: `macro_quant.db:ticker_aliases`
- Migration: `data/migrations/001_ticker_aliases.sql`
- Apply: `python3 scripts/apply_migrations.py --db macro_quant.db`

Seeded mappings (V1)
- `SPX <- ^GSPC` (proxy)
- `NDX <- ^NDX` (proxy, if available)
- `NDX <- QQQ` (proxy; **only authorized index→ETF proxy**)
- `HSI <- ^HSI` (proxy)
- `NIKKEI <- ^N225` (proxy)
- `FTSE <- ^FTSE` (proxy)

Rules
- Any `is_proxy=1` usage must be recorded in lineage + `data_quality_log`.
- Any proxy usage keeps strategy output `SAMPLE`.
