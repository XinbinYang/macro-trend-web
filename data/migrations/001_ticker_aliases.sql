-- 001_ticker_aliases.sql
-- Canonical ticker alias/proxy registry (SQLite)

BEGIN;

CREATE TABLE IF NOT EXISTS ticker_aliases (
  canonical_ticker TEXT NOT NULL,
  alias_ticker     TEXT NOT NULL PRIMARY KEY,
  priority         INTEGER NOT NULL DEFAULT 100,
  valid_from       TEXT,
  valid_until      TEXT,
  is_proxy         INTEGER NOT NULL DEFAULT 0,
  source           TEXT
);

CREATE INDEX IF NOT EXISTS idx_ticker_aliases_canonical ON ticker_aliases(canonical_ticker);

-- Seed aliases (keep small + auditable)
INSERT OR IGNORE INTO ticker_aliases(canonical_ticker, alias_ticker, priority, is_proxy, source) VALUES
  ('SPX', '^GSPC', 100, 1, 'Wind_bundle:index_historical_prices'),
  ('NDX', '^NDX', 100, 1, 'Yahoo-style index code (if available)'),
  ('NDX', 'QQQ',  200, 1, 'ETF proxy (only authorized index→ETF proxy)'),
  ('HSI', '^HSI', 100, 1, 'Wind_bundle:index_historical_prices'),
  ('NIKKEI', '^N225', 100, 1, 'Wind_bundle:index_historical_prices'),
  ('FTSE', '^FTSE', 100, 1, 'Wind_bundle:index_historical_prices');

COMMIT;
