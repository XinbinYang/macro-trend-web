#!/usr/bin/env python3
"""
ETL Script: Stage market_data from Wind bundle to staging DB.
Extracts from unified_asset_prices (primary) and optional tables,
normalizes source names, and outputs to staged_prices.

Usage:
    python scripts/etl_stage_market_data.py [--include-optional]
"""

import sqlite3
import argparse
import os
from datetime import datetime

# Paths
SOURCE_DB = "data/sources/wind_bundle/market_data.db"
STAGING_DB = "data/staging/market_data_staging.db"


def normalize_source(source: str) -> str:
    """Normalize source names: Wind/wind -> Wind."""
    if source is None:
        return "Wind"
    s = source.strip()
    if s.lower() == "wind":
        return "Wind"
    return s


def get_connection(db_path: str) -> sqlite3.Connection:
    """Create DB connection with row factory."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def extract_unified_prices(conn_src: sqlite3.Connection) -> list:
    """Extract from unified_asset_prices (primary source)."""
    cursor = conn_src.cursor()
    cursor.execute("""
        SELECT date, asset_code, 'close' as field, price as value,
               source, source_code, NULL as import_ts,
               'unified_asset_prices' as raw_table
        FROM unified_asset_prices
        ORDER BY date, asset_code
    """)
    rows = cursor.fetchall()
    return [dict(r) for r in rows]


def extract_bond_futures_extended(conn_src: sqlite3.Connection) -> list:
    """Extract from bond_futures_extended (wide format -> long)."""
    cursor = conn_src.cursor()
    # Map column -> field name
    col_map = {
        'ts_cfe': 'settle',   # CFFEX 2-year
        'tf_cfe': 'settle',   # CFFEX 5-year
        't_cfe': 'settle',    # CFFEX 10-year
        'tl_cfe': 'settle',   # CFFEX 30-year
        'tu_cbt': 'settle',   # CBOT 2-year
        'fv_cbt': 'settle',   # CBOT 5-year
        'ty_cbt': 'settle',   # CBOT 10-year
        'tn_cbt': 'settle',   # CBOT Ultra 10-year
        'us_cbt': 'settle',   # CBOT Long-term
        'ul_cbt': 'settle',   # CBOT Ultra long-term
    }
    
    cursor.execute("SELECT * FROM bond_futures_extended ORDER BY date")
    rows = cursor.fetchall()
    
    result = []
    for row in rows:
        row_dict = dict(row)
        date = row_dict['date']
        import_ts = row_dict.get('import_timestamp')
        for col, field in col_map.items():
            value = row_dict.get(col)
            if value is not None:
                asset_code = col.upper()
                result.append({
                    'date': date,
                    'asset_code': asset_code,
                    'field': field,
                    'value': value,
                    'source': 'Wind',
                    'source_code': col,
                    'import_ts': import_ts,
                    'raw_table': 'bond_futures_extended'
                })
    return result


def extract_global_equity_indices(conn_src: sqlite3.Connection) -> list:
    """Extract from global_equity_indices."""
    cursor = conn_src.cursor()
    cursor.execute("""
        SELECT date, ticker as asset_code, 'index' as field, 
               close_price as value, 'Wind' as source, 
               ticker as source_code, NULL as import_ts,
               'global_equity_indices' as raw_table
        FROM global_equity_indices
        ORDER BY date, ticker
    """)
    rows = cursor.fetchall()
    return [dict(r) for r in rows]


def extract_global_fx_rates(conn_src: sqlite3.Connection) -> list:
    """Extract from global_fx_rates."""
    cursor = conn_src.cursor()
    cursor.execute("""
        SELECT date, pair as asset_code, 'close' as field,
               close_price as value, 'Wind' as source,
               pair as source_code, NULL as import_ts,
               'global_fx_rates' as raw_table
        FROM global_fx_rates
        ORDER BY date, pair
    """)
    rows = cursor.fetchall()
    return [dict(r) for r in rows]


def extract_global_commodity_futures(conn_src: sqlite3.Connection) -> list:
    """Extract from global_commodity_futures."""
    cursor = conn_src.cursor()
    cursor.execute("""
        SELECT date, ticker as asset_code, 'settle' as field,
               close_price as value, 'Wind' as source,
               ticker as source_code, NULL as import_ts,
               'global_commodity_futures' as raw_table
        FROM global_commodity_futures
        ORDER BY date, ticker
    """)
    rows = cursor.fetchall()
    return [dict(r) for r in rows]


def create_staging_table(conn_dst: sqlite3.Connection):
    """Create staged_prices table in staging DB."""
    cursor = conn_dst.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS staged_prices (
            date TEXT,
            asset_code TEXT,
            field TEXT,
            value REAL,
            source TEXT,
            source_code TEXT,
            import_ts TEXT,
            raw_table TEXT
        )
    """)
    conn_dst.commit()


def load_to_staging(conn_dst: sqlite3.Connection, records: list):
    """Insert normalized records into staging table."""
    cursor = conn_dst.cursor()
    cursor.executemany("""
        INSERT INTO staged_prices 
        (date, asset_code, field, value, source, source_code, import_ts, raw_table)
        VALUES (:date, :asset_code, :field, :value, :source, :source_code, :import_ts, :raw_table)
    """, records)
    conn_dst.commit()


def run_etl(include_optional: bool = False):
    """Main ETL pipeline."""
    print(f"[ETL] Starting staging ETL...")
    print(f"[ETL] Source: {SOURCE_DB}")
    print(f"[ETL] Dest:   {STAGING_DB}")
    
    # Connect to source
    src_conn = get_connection(SOURCE_DB)
    
    # Connect to destination (create if not exists)
    if os.path.exists(STAGING_DB):
        os.remove(STAGING_DB)
        print(f"[ETL] Removed existing staging DB")
    
    dst_conn = sqlite3.connect(STAGING_DB)
    create_staging_table(dst_conn)
    
    all_records = []
    
    # 1. Primary: unified_asset_prices
    print("[ETL] Extracting unified_asset_prices...")
    records = extract_unified_prices(src_conn)
    # Normalize source
    for r in records:
        r['source'] = normalize_source(r['source'])
    all_records.extend(records)
    print(f"[ETL]   -> {len(records)} records")
    
    # 2. Optional: additional tables
    if include_optional:
        print("[ETL] Extracting optional tables...")
        
        records = extract_bond_futures_extended(src_conn)
        all_records.extend(records)
        print(f"[ETL]   bond_futures_extended: {len(records)} records")
        
        records = extract_global_equity_indices(src_conn)
        all_records.extend(records)
        print(f"[ETL]   global_equity_indices: {len(records)} records")
        
        records = extract_global_fx_rates(src_conn)
        all_records.extend(records)
        print(f"[ETL]   global_fx_rates: {len(records)} records")
        
        records = extract_global_commodity_futures(src_conn)
        all_records.extend(records)
        print(f"[ETL]   global_commodity_futures: {len(records)} records")
    else:
        print("[ETL] Skipping optional tables (use --include-optional to include)")
    
    # Load to staging
    print(f"[ETL] Loading {len(all_records)} records to staging...")
    load_to_staging(dst_conn, all_records)
    
    # Verify
    cursor = dst_conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM staged_prices")
    count = cursor.fetchone()[0]
    print(f"[ETL] Staging complete: {count} total records")
    
    # Sample output
    print("[ETL] Sample records:")
    cursor.execute("SELECT * FROM staged_prices LIMIT 5")
    for row in cursor.fetchall():
        print(f"  {row}")
    
    src_conn.close()
    dst_conn.close()
    print("[ETL] Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL stage market data")
    parser.add_argument("--include-optional", action="store_true",
                        help="Include optional tables (bond_futures_extended, global_equity_indices, global_fx_rates, global_commodity_futures)")
    args = parser.parse_args()
    run_etl(include_optional=args.include_optional)
