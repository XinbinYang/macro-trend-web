#!/usr/bin/env python3
"""
Beta 7.5 自适应全天候策略 - 每日净值更新
6资产 + 相关性干预引擎
"""

import os
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime
from supabase import create_client

SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

# 修复：使用绝对路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'macro_quant.db')

def get_supabase_client():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not set")
        exit(1)
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def run_beta_75_backtest():
    print(f"Opening database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    
    asset_map = {
        'CN_Equity': '000300.sh',
        'CN_Bond': 'CBA00362',
        'US_Equity': 'NDX.GI',
        'US_Bond': 'TY.CBT',
        'Commodity': '期货结算价(连续):WTI原油',
        'Gold': 'GC.CMX'
    }
    
    dfs = []
    for name, ticker in asset_map.items():
        if name in ['CN_Bond', 'US_Bond']:
            table = 'assets_bond'
            price_col = 'ytm'
        elif name == 'Commodity':
            table = 'assets_commodity'
            price_col = 'close'
        else:
            table = 'assets_equity'
            price_col = 'close'
        
        query = f"SELECT date, {price_col} as price FROM {table} WHERE ticker = '{ticker}' AND date >= '2006-01-01' ORDER BY date"
        df = pd.read_sql_query(query, conn)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date').rename(columns={'price': name})
        dfs.append(df)
    
    data = pd.concat(dfs, axis=1).sort_index().ffill().dropna()
    returns = data.pct_change().dropna()
    returns = returns[(returns < 0.5) & (returns > -0.5)].dropna()
    
    base_weights = np.array([0.15, 0.25, 0.15, 0.20, 0.10, 0.15])
    
    portfolio_results = []
    dates = returns.index
    
    for i in range(20, len(dates)):
        current_date = dates[i]
        window_rets = returns.iloc[i-20:i]
        corr_matrix = window_rets.corr()
        
        cn_bond_equity_corr = corr_matrix.loc['CN_Bond', 'CN_Equity'] if 'CN_Bond' in corr_matrix.columns and 'CN_Equity' in corr_matrix.columns else 0
        
        adj_weights = base_weights.copy()
        if cn_bond_equity_corr > 0.3:
            reduction = adj_weights[1] * 0.2
            adj_weights[1] -= reduction
            adj_weights[5] += reduction
        
        day_ret = np.dot(returns.iloc[i], adj_weights)
        portfolio_results.append({'date': current_date, 'return': day_ret})
    
    perf_df = pd.DataFrame(portfolio_results).set_index('date')
    perf_df['cum_return'] = (1 + perf_df['return']).cumprod()
    
    latest_nav = perf_df['cum_return'].iloc[-1]
    latest_date = perf_df.index[-1].strftime('%Y-%m-%d')
    
    total_years = len(perf_df) / 252
    annual_return = (perf_df['cum_return'].iloc[-1]) ** (1/total_years) - 1
    
    conn.close()
    
    return {
        'date': latest_date,
        'nav': float(latest_nav),
        'annual_return': float(annual_return),
        'strategy': 'Beta 7.5'
    }
def update_supabase(supabase, result):
    try:
        supabase.table('strategy_nav').upsert({
            'strategy_id': 'beta-7-5',
            'strategy_name': 'Beta 7.5 自适应全天候',
            'date': result['date'],
            'nav': round(result['nav'], 6),
            'daily_return': 0.0,
            'cumulative_return': round((result['nav'] - 1) * 100, 4),
        }, on_conflict='strategy_id,date').execute()
        
        print(f"Updated Beta 7.5 NAV: {result['nav']:.4f} (Date: {result['date']})")
        print(f"Annual Return: {result['annual_return']:.2%}")
        
    except Exception as e:
        print(f"Error updating Supabase: {e}")
        raise

def main():
    print(f"Starting Beta 7.5 NAV Update at {datetime.now()}")
    print(f"Database path: {DB_PATH}")
    
    supabase = get_supabase_client()
    print("Connected to Supabase")
    
    print("Running Beta 7.5 backtest...")
    result = run_beta_75_backtest()
    
    update_supabase(supabase, result)
    
    print("NAV update completed successfully")

if __name__ == '__main__':
    main()
