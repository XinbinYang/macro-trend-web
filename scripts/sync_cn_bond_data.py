#!/usr/bin/env python3
"""
中国债券数据同步脚本
- 国债期货日度数据 (中金所)
- 中债估值收益率曲线
- 数据归档到 data/bond-cn/archive/

运行频率: 每日 17:30 CST (期货收盘后)
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Optional


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def ensure_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def fetch_bond_futures_akshare() -> Optional[list[dict]]:
    """从 AkShare 获取国债期货日度数据"""
    try:
        import akshare as ak
        
        # 获取国债期货主力合约行情
        # TS: 2年期, TF: 5年期, T: 10年期, TL: 30年期
        contracts = {
            "TS": "2年期国债期货",
            "TF": "5年期国债期货", 
            "T": "10年期国债期货",
            "TL": "30年期国债期货",
        }
        
        results = []
        for code, name in contracts.items():
            try:
                # 获取期货行情
                df = ak.futures_zh_realtime(symbol=code)
                if df is None or df.empty:
                    continue
                    
                latest = df.iloc[0]
                results.append({
                    "symbol": f"{code}2506",  # 主力合约代码，实际应从合约映射表获取
                    "name": name,
                    "price": float(latest.get("最新价", 0)),
                    "change": float(latest.get("涨跌", 0)),
                    "changePercent": float(latest.get("涨跌幅", 0)),
                    "volume": int(latest.get("成交量", 0)),
                    "openInterest": int(latest.get("持仓量", 0)),
                    "timestamp": now_iso(),
                    "source": "AkShare",
                    "dataType": "EOD",
                    "status": "LIVE",
                })
            except Exception as e:
                print(f"[WARN] Failed to fetch {code}: {e}")
                continue
        
        return results if results else None
        
    except ImportError:
        print("[WARN] akshare not installed, skipping")
        return None
    except Exception as e:
        print(f"[ERROR] AkShare fetch failed: {e}")
        return None


def fetch_yield_curve_akshare() -> Optional[dict]:
    """从 AkShare 获取中债估值收益率曲线"""
    try:
        import akshare as ak
        
        # 获取中债国债收益率曲线
        df = ak.bond_china_yield()
        if df is None or df.empty:
            return None
        
        # 取最新日期
        latest = df.iloc[0]
        
        # 提取各期限收益率
        maturities = {}
        for col in df.columns:
            if "收益率" in col:
                # 从列名提取期限，如 "1年期收益率" -> "1Y"
                maturity = col.replace("年期收益率", "").replace("年", "")
                if maturity in ["1", "2", "3", "5", "7", "10", "30"]:
                    key = f"{maturity}Y" if maturity != "30" else "30Y"
                    try:
                        maturities[key] = float(latest[col])
                    except (ValueError, TypeError):
                        continue
        
        return {
            "date": today_str(),
            "maturities": maturities,
            "source": "AkShare",
            "status": "LIVE",
        }
        
    except ImportError:
        print("[WARN] akshare not installed, skipping")
        return None
    except Exception as e:
        print(f"[ERROR] Yield curve fetch failed: {e}")
        return None


def load_previous_data(data_dir: Path) -> Optional[dict]:
    """加载之前的最新数据"""
    latest_path = data_dir / "latest.json"
    if latest_path.exists():
        try:
            return json.loads(latest_path.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def save_data(data_dir: Path, data: dict) -> None:
    """保存数据到 latest.json 和归档"""
    # 保存到 latest.json
    latest_path = data_dir / "latest.json"
    ensure_dir(latest_path)
    latest_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"[INFO] Saved to {latest_path}")
    
    # 归档
    archive_dir = data_dir / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    
    date_str = data.get("date", today_str())
    archive_path = archive_dir / f"{date_str}.json"
    archive_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"[INFO] Archived to {archive_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync China bond data")
    parser.add_argument(
        "--out-dir",
        default="data/bond-cn",
        help="Output directory for bond data"
    )
    parser.add_argument(
        "--skip-futures",
        action="store_true",
        help="Skip futures data fetch"
    )
    parser.add_argument(
        "--skip-yield",
        action="store_true",
        help="Skip yield curve fetch"
    )
    args = parser.parse_args()
    
    data_dir = Path(args.out_dir)
    
    print(f"[INFO] Starting bond data sync at {now_iso()}")
    
    # 加载之前的数据 (用于失败时回退)
    previous = load_previous_data(data_dir)
    
    # 获取期货数据
    futures = None
    if not args.skip_futures:
        print("[INFO] Fetching futures data...")
        futures = fetch_bond_futures_akshare()
    
    # 获取收益率曲线
    yield_curve = None
    if not args.skip_yield:
        print("[INFO] Fetching yield curve...")
        yield_curve = fetch_yield_curve_akshare()
    
    # 构建输出
    payload = {
        "date": today_str(),
        "updatedAt": now_iso(),
        "futures": futures if futures else (previous.get("futures", []) if previous else []),
        "yieldCurve": yield_curve if yield_curve else (previous.get("yieldCurve") if previous else None),
        "source": "AkShare" if (futures or yield_curve) else (previous.get("source", "OFF") if previous else "OFF"),
        "status": "LIVE" if (futures or yield_curve) else (previous.get("status", "OFF") if previous else "OFF"),
    }
    
    # 保存数据
    save_data(data_dir, payload)
    
    print(f"[INFO] Bond data sync completed. Status: {payload['status']}")
    
    # 输出统计
    if payload["futures"]:
        print(f"[INFO] Futures: {len(payload['futures'])} contracts")
    if payload["yieldCurve"]:
        maturities = payload["yieldCurve"].get("maturities", {})
        print(f"[INFO] Yield curve: {len(maturities)} maturities")


if __name__ == "__main__":
    main()
