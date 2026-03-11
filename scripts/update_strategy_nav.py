#!/usr/bin/env python3
"""\
每日策略净值更新脚本（占位版）

目的：
- 为网站的“策略净值追踪”提供一个自动更新管道（GitHub Actions / cron）
- 当前版本仅生成“模拟净值”（用于前端联调与管道打通）

重要原则（请保持一致）：
- 展示层可以使用模拟/Indicative 数据，但必须明确标注。
- 回测真值/实盘信号必须来自 Master + 官方结算镜像（Spot/Settle 双轨），模拟数据不得混入。

后续替换点：
- 将 generate_mock_nav_data() 替换为真实回测引擎输出
- 或直接从 macro_quant.db / parquet 真值库计算并写入
"""

import os
import sys
from datetime import datetime, timedelta

import numpy as np
from supabase import create_client

# Supabase 配置（在 GitHub Actions secrets 中注入）
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xmdvozykqwolmfaycgyz.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")


def get_supabase_client():
    if not SUPABASE_KEY:
        print("Error: SUPABASE_KEY not set")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def generate_mock_nav_data(days: int = 30):
    """生成最近 N 天的模拟净值数据（跳过周末）"""

    strategies = [
        {"id": "beta-7-0", "name": "Beta 7.0"},
        {"id": "alpha-2-0", "name": "Alpha 2.0"},
        {"id": "mix-55", "name": "5:5 Mix"},
        {"id": "mix-73", "name": "7:3 Mix"},
    ]

    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    data = []

    for strategy in strategies:
        nav = 1.0
        current_date = start_date

        while current_date <= end_date:
            if current_date.weekday() >= 5:  # weekend
                current_date += timedelta(days=1)
                continue

            # 模拟日收益（占位用）
            if strategy["id"] == "beta-7-0":
                daily_return = np.random.normal(0.0003, 0.008)
            elif strategy["id"] == "alpha-2-0":
                daily_return = np.random.normal(0.0005, 0.012)
            elif strategy["id"] == "mix-55":
                daily_return = np.random.normal(0.0004, 0.009)
            else:
                daily_return = np.random.normal(0.00035, 0.0085)

            nav *= (1.0 + daily_return)

            data.append(
                {
                    "strategy_id": strategy["id"],
                    "strategy_name": strategy["name"],
                    "date": current_date.strftime("%Y-%m-%d"),
                    "nav": round(float(nav), 6),
                    "daily_return": round(float(daily_return) * 100, 4),
                    "cumulative_return": round(float((nav - 1.0) * 100), 4),
                    "data_source": "mock",  # 关键：明确标注
                }
            )

            current_date += timedelta(days=1)

    return data


def upsert_strategy_nav(supabase, rows):
    # 批量 upsert（supabase-py 支持直接传 list）
    supabase.table("strategy_nav").upsert(rows, on_conflict="strategy_id,date").execute()


def main():
    print(f"Starting NAV update at {datetime.now().isoformat()}")

    supabase = get_supabase_client()
    rows = generate_mock_nav_data(days=30)
    print(f"Generated {len(rows)} rows")

    upsert_strategy_nav(supabase, rows)
    print("NAV update completed")


if __name__ == "__main__":
    main()
