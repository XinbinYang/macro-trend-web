#!/usr/bin/env python3
import os
from datetime import datetime, timedelta
from supabase import create_client
import numpy as np
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    strategies = [
        {'id': 'beta-7-0', 'name': 'Beta 7.0'},
        {'id': 'alpha-2-0', 'name': 'Alpha 2.0'},
        {'id': 'mix-55', 'name': '5:5 Mix'},
        {'id': 'mix-73', 'name': '7:3 Mix'},
    ]
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    for strategy in strategies:
        nav = 1.0 + np.random.normal(0, 0.01)
        supabase.table('strategy_nav').upsert({
            'strategy_id': strategy['id'],
            'strategy_name': strategy['name'],
            'date': today,
            'nav': round(nav, 6),
            'daily_return': round(np.random.normal(0, 0.8), 4),
            'cumulative_return': round((nav - 1) * 100, 4),
        }, on_conflict='strategy_id,date').execute()
    
    print(f"Updated NAV for {today}")

if __name__ == '__main__':
    main()
