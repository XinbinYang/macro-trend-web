# 中美全天候Beta（Beta70）— 审计 Checklist（SAMPLE → LIVE）

> 目标：把“中美全天候Beta”的展示从 **SAMPLE** 升级到 **LIVE**。
>
> 原则：宁可保持 SAMPLE/OFF，也不输出“看似真实但不可审计”的数据。

## 0) 当前产物与入口
- 产物文件（网站只读）：`data/nav/beta70/latest.json`
- API：`GET /api/nav?strategy=beta70`
- 生成脚本：`scripts/build_beta70_nav.py`
- 自动化：GitHub Actions `Build Beta70 NAV Artifact`（每日重建产物并 commit）

## 1) 输入数据源（必须唯一且可追溯）
- [ ] 输入 DB：`macro_quant.db`
- [ ] 输入表：`all_weather_master_data`
- [ ] 输入列（资产代理）：`HS300 / ZZ500 / CN10Y_Bond / NDX / US10Y_Bond / Nanhua / Gold`
- [ ] 产物写入 `dataLineage.sources`：`macro_quant.db:all_weather_master_data`

## 2) 频率口径（必须可复现）
- [ ] 输出净值频率：**MONTHLY（EOM）**
- [ ] 再平衡频率：**MONTHLY（每月首个交易日）**
- [ ] 回看窗口：`lookbackDays=120`（如修改必须进产物）
- [ ] `dataLineage.model.navFrequency` 明确标注 `MONTHLY (end-of-month)`

## 3) 模型口径（必须可解释）
- [ ] 风险模型：ERC Risk Parity
- [ ] 协方差：Ledoit-Wolf shrinkage（若为简化实现，必须在 notes 明确“简化版本”）
- [ ] 约束：权重区间 + 杠杆（目前 `weightMax=0.35`、`leverage=1.0`）

## 4) 数据质量（必须可监控）
- [ ] 异常日期过滤（当前已过滤 <1990 的噪点日期）
- [ ] 缺失值处理：forward fill，且在产物里记录 `forwardFillCount`
- [ ] 若 forwardFillCount 或异常行数超过阈值（待定），产物生成应失败并保留上一版

## 5) LIVE 切换门槛（最后一关）
仅当 1-4 全部满足，并且定价口径完成书面确认：
- [ ] 明确 Spot / Settle 口径（尤其债券）
- [ ] `latest.json.status` 从 `SAMPLE` → `LIVE`
- [ ] `dataLineage.pricing` 从泛描述升级为明确口径描述

---

## 验真（你随时可查）
- API：`/api/nav?strategy=beta70` → 看 `name/status/asOf/nav/metrics/dataLineage`
- 文件：`data/nav/beta70/latest.json`
