#!/usr/bin/env python3
"""
ETL Clean & Load Truth: Stage → macro_quant.db Truth Tables

Purpose:
    - Read from staging DB (or directly from wind_bundle if staging unavailable)
    - Apply source priority: Wind > provided mirrors > AkShare_proxy
    - Deduplicate per (date, ticker): highest priority source wins
    - Date normalization (ISO 8601 YYYY-MM-DD)
    - Write to macro_quant.db assets_* truth tables
    - Log data quality issues

Target Schema (macro_quant.db):
    - assets_equity: date, ticker, close, source, updated_at
    - assets_bond: date, ticker, close (or settle), source, updated_at
    - assets_commodity: date, ticker, close (or settle), source, updated_at
    - assets_fx: date, pair, close, source, updated_at
    - data_quality_log: id, date, table_name, ticker, check_type, severity, description, action_taken, created_at

Asset Code Mapping (staged → macro_quant ticker):
    Equity:
        - CN_Bond_10Y, T_CFE, TS_CFE, TF_CFE, TL_CFE → CN_10Y, CN_2Y, CN_5Y, CN_30Y (bonds actually)
        - US_Bond_10Y, TY_CBT, TU_CBT, FV_CBT, TN_CBT, US_CBT, UL_CBT → US10Y_T_BOND_F, etc.
        - HSI → HSI
        - FTSE, NIKKEI, STOXX50 → FTSE, NIKKEI, STOXX50
    Bond:
        - Same as above but mapped to bond table with settle field
    Commodity:
        - Brent_Crude, WTI_Crude, Copper, Silver, Corn, Soybean, Wheat, Natural_Gas → respective tickers
    FX:
        - AUDUSD, EURUSD, GBPUSD, NZDUSD, USDCAD, USDCHF, USDJPY, DXY → respective pairs
"""

import sqlite3
import argparse
import os
import sys
from datetime import datetime
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Set
from pathlib import Path

# Configuration
SOURCE_DB = "data/sources/wind_bundle/market_data.db"
STAGING_DB = "data/staging/market_data_staging.db"
TRUTH_DB = "macro_quant.db"

# Source priority (lower number = higher priority)
SOURCE_PRIORITY = {
    "Wind": 1,
    "wind": 1,
    "WIND": 1,
    "provided_mirrors": 2,
    "AkShare_proxy": 3,
    "akshare": 3,
    "AkShare": 3,
}

# Asset mapping: staged asset_code → (macro_quant ticker, asset_class, field_name)
# asset_class: equity, bond, commodity, fx
# Note: SPX/NDX proxies will be ingested separately from AkShare (see scripts/update_proxies_akshare.py)
ASSET_MAPPING = {
    # Bonds (China)
    "CN_Bond_10Y": ("CN_10Y", "bond", "settle"),
    "T_CFE": ("CN_10Y", "bond", "settle"),      # CFFEX 10-year
    "TS_CFE": ("CN_2Y", "bond", "settle"),      # CFFEX 2-year
    "TF_CFE": ("CN_5Y", "bond", "settle"),      # CFFEX 5-year
    "TL_CFE": ("CN_30Y", "bond", "settle"),     # CFFEX 30-year
    
    # Bonds (US)
    "US_Bond_10Y": ("US10Y_T_BOND_F", "bond", "settle"),
    "TY_CBT": ("US10Y_T_BOND_F", "bond", "settle"),   # CBOT 10-year
    "TU_CBT": ("US_2Y", "bond", "settle"),            # CBOT 2-year
    "FV_CBT": ("US_5Y", "bond", "settle"),            # CBOT 5-year
    "TN_CBT": ("US_ULTRA10Y", "bond", "settle"),      # CBOT Ultra 10-year
    "US_CBT": ("US_LONG", "bond", "settle"),          # CBOT Long-term
    "UL_CBT": ("US_ULTRA", "bond", "settle"),         # CBOT Ultra long-term
    
    # Equity Indices
    "HSI": ("HSI", "equity", "close"),
    "FTSE": ("FTSE", "equity", "close"),
    "NIKKEI": ("NIKKEI", "equity", "close"),
    "STOXX50": ("STOXX50", "equity", "close"),
    
    # Commodities
    "Brent_Crude": ("BRENT_CRUDE", "commodity", "settle"),
    "WTI_Crude": ("WTI_CRUDE", "commodity", "settle"),
    "Copper": ("COPPER", "commodity", "settle"),
    "Silver": ("SILVER", "commodity", "settle"),
    "Corn": ("CORN", "commodity", "settle"),
    "Soybean": ("SOYBEAN", "commodity", "settle"),
    "Wheat": ("WHEAT", "commodity", "settle"),
    "Natural_Gas": ("NATURAL_GAS", "commodity", "settle"),
    
    # FX
    "AUDUSD": ("AUDUSD", "fx", "close"),
    "EURUSD": ("EURUSD", "fx", "close"),
    "GBPUSD": ("GBPUSD", "fx", "close"),
    "NZDUSD": ("NZDUSD", "fx", "close"),
    "USDCAD": ("USDCAD", "fx", "close"),
    "USDCHF": ("USDCHF", "fx", "close"),
    "USDJPY": ("USDJPY", "fx", "close"),
}


@dataclass
class DataQualityLogEntry:
    date: Optional[str]
    table_name: str
    ticker: str
    check_type: str
    severity: str
    description: str
    action_taken: str


# Minimum valid date (filter out epoch/invalid dates)
MIN_VALID_DATE = "1990-01-01"

def normalize_date(date_str: str) -> Optional[str]:
    """Normalize date to ISO 8601 format (YYYY-MM-DD)."""
    if date_str is None:
        return None
    
    date_str = str(date_str).strip()
    
    # Handle timestamps (truncate to date first)
    if ' ' in date_str:
        date_str = date_str.split(' ')[0]
    
    # Already in YYYY-MM-DD format
    if len(date_str) == 10 and date_str[4] == '-' and date_str[7] == '-':
        # Filter out invalid/epoch dates
        if date_str < MIN_VALID_DATE:
            return None
        return date_str
    
    # Handle YYYY/MM/DD
    if '/' in date_str:
        parts = date_str.split('/')
        if len(parts) == 3:
            # Assume YYYY/MM/DD or MM/DD/YYYY
            if len(parts[0]) == 4:
                result = f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
            else:
                result = f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
            if result < MIN_VALID_DATE:
                return None
            return result
    
    # Handle YYYYMMDD
    if len(date_str) == 8 and date_str.isdigit():
        result = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        if result < MIN_VALID_DATE:
            return None
        return result
    
    return None


def get_source_priority(source: str) -> int:
    """Get priority for a source (lower = higher priority)."""
    if source is None:
        return 99
    return SOURCE_PRIORITY.get(source, 99)


def deduplicate_records(records: List[Dict]) -> Tuple[List[Dict], List[DataQualityLogEntry]]:
    """
    Deduplicate records per (date, ticker).
    - Group by (date, ticker)
    - Within each group, select highest priority source
    - If same source, select latest import_ts if available, else last record
    - Log anomalies (duplicates resolved, large discrepancies)
    """
    grouped: Dict[Tuple[str, str], List[Dict]] = {}
    
    for rec in records:
        key = (rec.get('date'), rec.get('ticker'))
        if key not in grouped:
            grouped[key] = []
        grouped[key].append(rec)
    
    deduped = []
    quality_logs = []
    
    for (date, ticker), group in grouped.items():
        if len(group) == 1:
            deduped.append(group[0])
            continue
        
        # Sort by source priority (asc), then by import_ts (desc, None last)
        def sort_key(r):
            priority = get_source_priority(r.get('source'))
            import_ts = r.get('import_ts')
            # None import_ts should be last
            ts_for_sort = import_ts if import_ts else '0000-00-00 00:00:00'
            return (priority, -ord(ts_for_sort[0]) if ts_for_sort else 0)
        
        # More robust sorting
        def robust_sort_key(r):
            priority = get_source_priority(r.get('source'))
            import_ts = r.get('import_ts')
            if import_ts:
                # Convert to comparable format (negate for descending)
                try:
                    ts_val = datetime.fromisoformat(str(import_ts).replace('Z', '+00:00'))
                    ts_score = -ts_val.timestamp()
                except:
                    ts_score = 0
            else:
                ts_score = 1  # No timestamp = lowest priority
            return (priority, ts_score)
        
        sorted_group = sorted(group, key=robust_sort_key)
        winner = sorted_group[0]
        deduped.append(winner)
        
        # Log duplicate resolution
        sources_involved = [r.get('source', 'unknown') for r in group]
        values = [r.get('value') for r in group if r.get('value') is not None]
        
        # Check for large discrepancies (> 5% difference)
        if len(values) >= 2:
            try:
                numeric_values = [float(v) for v in values if v is not None]
                if len(numeric_values) >= 2:
                    max_val = max(numeric_values)
                    min_val = min(numeric_values)
                    if max_val > 0 and min_val > 0:
                        pct_diff = abs(max_val - min_val) / ((max_val + min_val) / 2) * 100
                        if pct_diff > 5.0:
                            quality_logs.append(DataQualityLogEntry(
                                date=date,
                                table_name=f"assets_{winner.get('asset_class')}",
                                ticker=ticker,
                                check_type="large_discrepancy",
                                severity="WARNING",
                                description=f"Large value discrepancy ({pct_diff:.2f}%) between sources: {sources_involved}, values: {numeric_values}",
                                action_taken=f"Selected {winner.get('source')} (priority {get_source_priority(winner.get('source'))})"
                            ))
            except (ValueError, TypeError):
                pass
        
        quality_logs.append(DataQualityLogEntry(
            date=date,
            table_name=f"assets_{winner.get('asset_class')}",
            ticker=ticker,
            check_type="duplicate_resolved",
            severity="INFO",
            description=f"Resolved {len(group)} duplicates from sources: {sources_involved}",
            action_taken=f"Selected {winner.get('source')} (priority {get_source_priority(winner.get('source'))})"
        ))
    
    return deduped, quality_logs


def detect_missing_blocks(records: List[Dict], expected_tickers: Set[str]) -> List[DataQualityLogEntry]:
    """Detect missing date blocks for each ticker."""
    quality_logs = []
    
    # Group by ticker
    by_ticker: Dict[str, List[Dict]] = {}
    for rec in records:
        ticker = rec.get('ticker')
        if ticker not in by_ticker:
            by_ticker[ticker] = []
        by_ticker[ticker].append(rec)
    
    # Check for missing tickers entirely
    for ticker in expected_tickers:
        if ticker not in by_ticker:
            quality_logs.append(DataQualityLogEntry(
                date=None,
                table_name="assets_unknown",
                ticker=ticker,
                check_type="missing_ticker",
                severity="ERROR",
                description=f"Ticker {ticker} expected but no data found",
                action_taken="None - no data available"
            ))
    
    # Check for date gaps within each ticker
    for ticker, ticker_records in by_ticker.items():
        sorted_recs = sorted(ticker_records, key=lambda x: x.get('date', ''))
        if len(sorted_recs) < 2:
            continue
        
        dates = [r.get('date') for r in sorted_recs if r.get('date')]
        
        # Simple gap detection (business days)
        from datetime import datetime as dt
        for i in range(1, len(dates)):
            try:
                d1 = dt.strptime(dates[i-1], '%Y-%m-%d')
                d2 = dt.strptime(dates[i], '%Y-%m-%d')
                gap_days = (d2 - d1).days
                
                # Flag gaps > 5 business days (accounting for weekends)
                if gap_days > 7:
                    quality_logs.append(DataQualityLogEntry(
                        date=dates[i],
                        table_name=f"assets_{sorted_recs[0].get('asset_class', 'unknown')}",
                        ticker=ticker,
                        check_type="missing_block",
                        severity="WARNING",
                        description=f"Data gap of {gap_days} days between {dates[i-1]} and {dates[i]}",
                        action_taken="Logged for investigation"
                    ))
            except (ValueError, TypeError):
                continue
    
    return quality_logs


def extract_from_staging(staging_db: str) -> List[Dict]:
    """Extract and map records from staging DB."""
    if not os.path.exists(staging_db):
        print(f"[ETL] Staging DB not found: {staging_db}")
        return []
    
    conn = sqlite3.connect(staging_db)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM staged_prices ORDER BY date, asset_code")
    rows = cursor.fetchall()
    conn.close()
    
    records = []
    skipped_invalid_dates = 0
    for row in rows:
        asset_code = row['asset_code']
        if asset_code not in ASSET_MAPPING:
            continue
        
        ticker, asset_class, field_name = ASSET_MAPPING[asset_code]
        
        normalized_date = normalize_date(row['date'])
        if normalized_date is None:
            skipped_invalid_dates += 1
            continue
        
        record = {
            'date': normalized_date,
            'ticker': ticker,
            'asset_class': asset_class,
            'field': field_name,
            'value': row['value'],
            'source': row['source'],
            'source_code': row['source_code'],
            'import_ts': row['import_ts'],
            'raw_table': row['raw_table'],
        }
        records.append(record)
    
    if skipped_invalid_dates > 0:
        print(f"[ETL]   Filtered {skipped_invalid_dates} records with invalid dates")
    
    return records


def extract_from_source(source_db: str) -> List[Dict]:
    """Extract directly from source DB (fallback if staging unavailable)."""
    if not os.path.exists(source_db):
        print(f"[ETL] Source DB not found: {source_db}")
        return []
    
    conn = sqlite3.connect(source_db)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    records = []
    
    # Extract from unified_asset_prices
    cursor.execute("SELECT date, asset_code, price as value, source, source_code FROM unified_asset_prices ORDER BY date, asset_code")
    for row in cursor.fetchall():
        asset_code = row['asset_code']
        if asset_code not in ASSET_MAPPING:
            continue
        
        normalized_date = normalize_date(row['date'])
        if normalized_date is None:
            continue
        
        ticker, asset_class, field_name = ASSET_MAPPING[asset_code]
        records.append({
            'date': normalized_date,
            'ticker': ticker,
            'asset_class': asset_class,
            'field': field_name,
            'value': row['value'],
            'source': row['source'],
            'source_code': row['source_code'],
            'import_ts': None,
            'raw_table': 'unified_asset_prices',
        })
    
    # Extract from bond_futures_extended
    bond_cols = {
        'ts_cfe': ('CN_2Y', 'bond', 'settle'),
        'tf_cfe': ('CN_5Y', 'bond', 'settle'),
        't_cfe': ('CN_10Y', 'bond', 'settle'),
        'tl_cfe': ('CN_30Y', 'bond', 'settle'),
        'tu_cbt': ('US_2Y', 'bond', 'settle'),
        'fv_cbt': ('US_5Y', 'bond', 'settle'),
        'ty_cbt': ('US10Y_T_BOND_F', 'bond', 'settle'),
        'tn_cbt': ('US_ULTRA10Y', 'bond', 'settle'),
        'us_cbt': ('US_LONG', 'bond', 'settle'),
        'ul_cbt': ('US_ULTRA', 'bond', 'settle'),
    }
    
    cursor.execute("SELECT * FROM bond_futures_extended ORDER BY date")
    for row in cursor.fetchall():
        date = row['date']
        normalized_date = normalize_date(date)
        if normalized_date is None:
            continue
        import_ts = row['import_timestamp'] if 'import_timestamp' in row.keys() else None
        for col, (ticker, asset_class, field_name) in bond_cols.items():
            value = row[col]
            if value is not None:
                records.append({
                    'date': normalized_date,
                    'ticker': ticker,
                    'asset_class': asset_class,
                    'field': field_name,
                    'value': value,
                    'source': 'Wind',
                    'source_code': col,
                    'import_ts': import_ts,
                    'raw_table': 'bond_futures_extended',
                })
    
    # Extract from global_equity_indices
    cursor.execute("SELECT date, ticker, close_price as value FROM global_equity_indices ORDER BY date, ticker")
    for row in cursor.fetchall():
        ticker = row['ticker']
        if ticker in ASSET_MAPPING:
            normalized_date = normalize_date(row['date'])
            if normalized_date is None:
                continue
            mapped_ticker, asset_class, field_name = ASSET_MAPPING[ticker]
            records.append({
                'date': normalized_date,
                'ticker': mapped_ticker,
                'asset_class': asset_class,
                'field': field_name,
                'value': row['value'],
                'source': 'Wind',
                'source_code': ticker,
                'import_ts': None,
                'raw_table': 'global_equity_indices',
            })
    
    # Extract from global_commodity_futures
    cursor.execute("SELECT date, ticker, close_price as value FROM global_commodity_futures ORDER BY date, ticker")
    for row in cursor.fetchall():
        ticker = row['ticker']
        if ticker in ASSET_MAPPING:
            normalized_date = normalize_date(row['date'])
            if normalized_date is None:
                continue
            mapped_ticker, asset_class, field_name = ASSET_MAPPING[ticker]
            records.append({
                'date': normalized_date,
                'ticker': mapped_ticker,
                'asset_class': asset_class,
                'field': field_name,
                'value': row['value'],
                'source': 'Wind',
                'source_code': ticker,
                'import_ts': None,
                'raw_table': 'global_commodity_futures',
            })
    
    # Extract from global_fx_rates
    cursor.execute("SELECT date, pair, close_price as value FROM global_fx_rates ORDER BY date, pair")
    for row in cursor.fetchall():
        pair = row['pair']
        if pair in ASSET_MAPPING:
            normalized_date = normalize_date(row['date'])
            if normalized_date is None:
                continue
            mapped_ticker, asset_class, field_name = ASSET_MAPPING[pair]
            records.append({
                'date': normalized_date,
                'ticker': mapped_ticker,
                'asset_class': asset_class,
                'field': field_name,
                'value': row['value'],
                'source': 'Wind',
                'source_code': pair,
                'import_ts': None,
                'raw_table': 'global_fx_rates',
            })
    
    conn.close()
    return records


def write_to_truth_tables(truth_db: str, records: List[Dict], dry_run: bool = False) -> Dict[str, int]:
    """Write deduplicated records to truth tables."""
    if dry_run:
        print("[ETL] DRY RUN - not writing to database")
    
    conn = sqlite3.connect(truth_db)
    cursor = conn.cursor()
    
    # Group records by asset class
    by_class: Dict[str, List[Dict]] = {'equity': [], 'bond': [], 'commodity': [], 'fx': []}
    for rec in records:
        ac = rec.get('asset_class')
        if ac in by_class:
            by_class[ac].append(rec)
    
    counts = {}
    now = datetime.now().isoformat()
    
    # Write equity
    if by_class['equity']:
        if not dry_run:
            cursor.executemany("""
                INSERT OR REPLACE INTO assets_equity 
                (date, ticker, close, source, updated_at)
                VALUES (:date, :ticker, :value, :source, :updated_at)
            """, [{**r, 'updated_at': now} for r in by_class['equity']])
            conn.commit()
        counts['equity'] = len(by_class['equity'])
    
    # Write bonds (use close column for settle value)
    if by_class['bond']:
        if not dry_run:
            cursor.executemany("""
                INSERT OR REPLACE INTO assets_bond 
                (date, ticker, ytm, source, updated_at)
                VALUES (:date, :ticker, :value, :source, :updated_at)
            """, [{**r, 'updated_at': now} for r in by_class['bond']])
            conn.commit()
        counts['bond'] = len(by_class['bond'])
    
    # Write commodities
    if by_class['commodity']:
        if not dry_run:
            cursor.executemany("""
                INSERT OR REPLACE INTO assets_commodity 
                (date, ticker, close, source, updated_at)
                VALUES (:date, :ticker, :value, :source, :updated_at)
            """, [{**r, 'updated_at': now} for r in by_class['commodity']])
            conn.commit()
        counts['commodity'] = len(by_class['commodity'])
    
    # Write FX
    if by_class['fx']:
        if not dry_run:
            cursor.executemany("""
                INSERT OR REPLACE INTO assets_fx 
                (date, pair, close, source, updated_at)
                VALUES (:date, :ticker, :value, :source, :updated_at)
            """, [{**r, 'updated_at': now} for r in by_class['fx']])
            conn.commit()
        counts['fx'] = len(by_class['fx'])
    
    conn.close()
    return counts


def write_quality_logs(truth_db: str, logs: List[DataQualityLogEntry], dry_run: bool = False):
    """Write data quality logs to truth DB."""
    if dry_run or not logs:
        return
    
    conn = sqlite3.connect(truth_db)
    cursor = conn.cursor()
    
    cursor.executemany("""
        INSERT INTO data_quality_log 
        (date, table_name, ticker, check_type, severity, description, action_taken, created_at)
        VALUES (:date, :table_name, :ticker, :check_type, :severity, :description, :action_taken, :created_at)
    """, [{
        'date': log.date,
        'table_name': log.table_name,
        'ticker': log.ticker,
        'check_type': log.check_type,
        'severity': log.severity,
        'description': log.description,
        'action_taken': log.action_taken,
        'created_at': datetime.now().isoformat()
    } for log in logs])
    
    conn.commit()
    conn.close()


def run_etl(dry_run: bool = False, use_source: bool = False):
    """Main ETL pipeline."""
    print("=" * 60)
    print("ETL Clean & Load Truth: Stage → macro_quant.db")
    print("=" * 60)
    
    # Determine source
    if use_source or not os.path.exists(STAGING_DB):
        print(f"[ETL] Extracting from source DB: {SOURCE_DB}")
        records = extract_from_source(SOURCE_DB)
    else:
        print(f"[ETL] Extracting from staging DB: {STAGING_DB}")
        records = extract_from_staging(STAGING_DB)
    
    if not records:
        print("[ETL] ERROR: No records extracted")
        return
    
    print(f"[ETL] Extracted {len(records)} raw records")
    
    # Deduplicate
    print("[ETL] Deduplicating records...")
    deduped, quality_logs = deduplicate_records(records)
    print(f"[ETL]   -> {len(deduped)} unique records after deduplication")
    
    # Detect missing blocks
    print("[ETL] Checking for missing blocks...")
    expected_tickers = set(ASSET_MAPPING.values())
    expected_tickers = set(t[0] for t in expected_tickers)
    missing_logs = detect_missing_blocks(deduped, expected_tickers)
    quality_logs.extend(missing_logs)
    print(f"[ETL]   -> {len(missing_logs)} missing block issues detected")
    
    # Summary of quality issues
    if quality_logs:
        severity_counts = {}
        for log in quality_logs:
            severity_counts[log.severity] = severity_counts.get(log.severity, 0) + 1
        print(f"[ETL] Quality issues: {severity_counts}")
    
    # Write to truth tables
    print(f"[ETL] Writing to truth DB: {TRUTH_DB}")
    counts = write_to_truth_tables(TRUTH_DB, deduped, dry_run=dry_run)
    for asset_class, count in counts.items():
        print(f"[ETL]   -> assets_{asset_class}: {count} records")
    
    # Write quality logs
    print(f"[ETL] Writing {len(quality_logs)} quality log entries...")
    write_quality_logs(TRUTH_DB, quality_logs, dry_run=dry_run)
    
    print("=" * 60)
    print("[ETL] Complete")
    print("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL Clean & Load Truth")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB")
    parser.add_argument("--use-source", action="store_true", help="Use source DB directly (ignore staging)")
    args = parser.parse_args()
    
    run_etl(dry_run=args.dry_run, use_source=args.use_source)
