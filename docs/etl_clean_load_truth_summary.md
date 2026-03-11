# ETL Clean & Load Truth - Implementation Summary

## Deliverable
- **Script**: `scripts/etl_clean_load_truth.py`

## Implementation Overview

### Source Priority
1. **Wind** (priority 1) - Primary source
2. **Provided mirrors** (priority 2) - Secondary sources
3. **AkShare_proxy** (priority 3) - Tertiary sources

### Deduplication Logic
- Group records by (date, ticker)
- Within each group, select highest priority source
- If same source, select latest import_ts (if available)
- Log all duplicate resolutions to `data_quality_log`

### Date Normalization
- Normalize all dates to ISO 8601 format (YYYY-MM-DD)
- Filter out invalid/epoch dates (before 1990-01-01)
- Handle various input formats: YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD, timestamps

### Data Quality Logging
The following events are logged to `data_quality_log`:
- **duplicate_resolved**: When multiple sources provide data for same (date, ticker)
- **large_discrepancy**: When values from different sources differ by > 5%
- **missing_block**: When data gaps > 7 days are detected
- **missing_ticker**: When expected tickers have no data

## Asset Mapping: Staged asset_code → macro_quant ticker

### Bond Futures
| Staged asset_code | macro_quant ticker | Exchange |
|-------------------|-------------------|----------|
| CN_Bond_10Y, T_CFE | CN_10Y | CFFEX |
| TS_CFE | CN_2Y | CFFEX |
| TF_CFE | CN_5Y | CFFEX |
| TL_CFE | CN_30Y | CFFEX |
| US_Bond_10Y, TY_CBT | US10Y_T_BOND_F | CBOT |
| TU_CBT | US_2Y | CBOT |
| FV_CBT | US_5Y | CBOT |
| TN_CBT | US_ULTRA10Y | CBOT |
| US_CBT | US_LONG | CBOT |
| UL_CBT | US_ULTRA | CBOT |

### Equity Indices
| Staged asset_code | macro_quant ticker |
|-------------------|-------------------|
| HSI | HSI |
| FTSE | FTSE |
| NIKKEI | NIKKEI |
| STOXX50 | STOXX50 |

### Commodities
| Staged asset_code | macro_quant ticker |
|-------------------|-------------------|
| Brent_Crude | BRENT_CRUDE |
| WTI_Crude | WTI_CRUDE |
| Copper | COPPER |
| Silver | SILVER |
| Corn | CORN |
| Soybean | SOYBEAN |
| Wheat | WHEAT |
| Natural_Gas | NATURAL_GAS |

### FX Rates
| Staged asset_code | macro_quant ticker |
|-------------------|-------------------|
| AUDUSD | AUDUSD |
| EURUSD | EURUSD |
| GBPUSD | GBPUSD |
| NZDUSD | NZDUSD |
| USDCAD | USDCAD |
| USDCHF | USDCHF |
| USDJPY | USDJPY |

## Target Schema (macro_quant.db)

### assets_equity
| Column | Type | Description |
|--------|------|-------------|
| date | TEXT | Trading date (YYYY-MM-DD) |
| ticker | TEXT | Asset ticker symbol |
| close | REAL | Closing price |
| source | TEXT | Data source |
| updated_at | TEXT | Timestamp of last update |

### assets_bond
| Column | Type | Description |
|--------|------|-------------|
| date | TEXT | Trading date (YYYY-MM-DD) |
| ticker | TEXT | Asset ticker symbol |
| ytm | REAL | Yield/settle price (mapped from value) |
| source | TEXT | Data source |
| updated_at | TEXT | Timestamp of last update |

### assets_commodity
| Column | Type | Description |
|--------|------|-------------|
| date | TEXT | Trading date (YYYY-MM-DD) |
| ticker | TEXT | Asset ticker symbol |
| close | REAL | Settle price |
| source | TEXT | Data source |
| updated_at | TEXT | Timestamp of last update |

### assets_fx
| Column | Type | Description |
|--------|------|-------------|
| date | TEXT | Trading date (YYYY-MM-DD) |
| pair | TEXT | FX pair (e.g., EURUSD) |
| close | REAL | Closing rate |
| source | TEXT | Data source |
| updated_at | TEXT | Timestamp of last update |

### data_quality_log
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-increment primary key |
| date | TEXT | Date of issue |
| table_name | TEXT | Affected table |
| ticker | TEXT | Affected ticker |
| check_type | TEXT | Type of check (duplicate_resolved, large_discrepancy, missing_block) |
| severity | TEXT | INFO, WARNING, ERROR |
| description | TEXT | Detailed description |
| action_taken | TEXT | Action taken to resolve |
| created_at | TEXT | Timestamp of log entry |

## Usage

### Run with staging DB (default)
```bash
python3 scripts/etl_clean_load_truth.py
```

### Run with source DB directly
```bash
python3 scripts/etl_clean_load_truth.py --use-source
```

### Dry run (no DB writes)
```bash
python3 scripts/etl_clean_load_truth.py --dry-run
```

## Data Statistics (Latest Run)

| Asset Class | Records | Tickers | Date Range |
|-------------|---------|---------|------------|
| Equity | 21,541 | 4 | 2004-01-02 to 2026-03-11 |
| Bond | 28,504 | 10 | 2004-12-31 to 2026-03-11 |
| Commodity | 39,663 | 8 | 2004-01-02 to 2026-03-11 |
| FX | 37,702 | 7 | 2004-01-02 to 2026-03-11 |

## Data Quality Summary (Latest Run)

| Check Type | Severity | Count |
|------------|----------|-------|
| duplicate_resolved | INFO | 15,614 |
| missing_block | WARNING | 2,286 |

## Constraints Met
- ✅ Deterministic (same input → same output)
- ✅ No huge DB committed (uses INSERT OR REPLACE)
- ✅ Source priority enforced
- ✅ Deduplication with logging
- ✅ Date normalization
- ✅ Data quality logging
