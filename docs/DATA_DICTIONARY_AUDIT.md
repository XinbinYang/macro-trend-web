# Data Dictionary Audit — macro-trend-web

> 目标：把“历史（日更入库）”与“实时（监控/TTL cache）”彻底分层，并用单一命名体系消灭 Symbol/Indicator 漂移。

## 0. 现状结论（核心问题）
当前存在**三套命名体系并行**，导致：
- UI/监控侧用 vendor symbol（`^GSPC`, `GC=F`, `DX=F`, `US10Y`…）
- Supabase/接口侧用业务 key（`SPX`, `NDX`, `US_10Y`, `HS300`…）
- SQLite/真值库（`macro_quant.db`）用 canonical ticker（含 alias 规则）

结果：
- 有数据但“看起来像 OFF”（查错 key）
- 有数据但其实是 Indicative（Supabase miss → 自动 fallback）
- 同名不同物理量（yield vs price）污染风险

## 1. 已有“单一字典源”的雏形（建议升级为唯一真名册）
- `lib/config/data-dictionary.ts`
  - 明确禁止 ad-hoc aliases
  - 已包含 symbols/indicators、region/category、DB 字段映射

**建议：**所有 API 路由与前端组件的 symbol/indicatorId 一律从该文件引用，逐步删除散落常量（如 `/api/market-data` 的 `ASSET_CONFIG`）。

## 2. 必修漂移/冲突点（P0）
### P0-1 `SP500` vs `SPX`
- `/api/market-data` 将 `^GSPC` 映射到 Supabase ticker=`SP500`
- 但真值库通常只有 `SPX`（导致 Supabase miss，自动 fallback 到 Yahoo，口径变成 Indicative）

### P0-2 `DXY` vs `DX=F` vs `USDX.FX`
- `assets_fx` 实际键通常是 `pair=USDX.FX`
- 但接口/配置常用 `DXY` 或 `DX=F` 直接查，容易 miss

### P0-3 US10Y 语义混淆（必须拆分）
- `US10Y`（收益率 %）
- `US_10Y`（价格型 proxy/期货/指数）
- `us_10y_yield`（宏观指标）

同名不同物理量，必须在命名与展示上强制区分。

### P0-4 宏观指标 ID 漂移
- 前端可能引用 `cn_unemployment` 等不存在的 id
- 实际 CN 失业在 `macro_cn.unemployment`（legacy 映射为 `unemployment_urban`）

### P0-5 schema 文档漂移
- `supabase/schema.sql` 仍是旧结构（如 `asset_prices`），与现用表 `assets_equity/assets_bond/assets_commodity/assets_fx/macro_us/macro_cn` 不一致

## 3. 数据分层（与杨总拍板一致）
### 3.1 历史层（EOD 日更入库，Supabase）
用于：曲线、走势、分析指标、验证条。
- CN rates：2/5/10Y（国债曲线点位）
- CN credit spread：AAA中短票5Y - 国债5Y（bp）
- US 宏观：UNRATE / M2 YoY / FCI 等（按 cadence 入库）

### 3.2 实时层（监控/TTL cache，不写库）
用于：watchlist/资产看板。
- Yahoo/Eastmoney（必须标注 `indicative`）
- 必须有并发/超时护栏 + OFF 降级

## 4. 迁移步骤（建议执行顺序）
1) 把所有 symbol/indicatorId 的引用集中到 `lib/config/data-dictionary.ts`
2) 修正 `^GSPC -> SPX` 的 Supabase key，补齐 FX 的 pair 查询规范（USDX.FX）
3) 统一 US10Y 系列命名（yield vs price）
4) 补齐 CN 失业等缺口：要么补指标 id，要么前端不展示该项
5) 更新 `supabase/schema.sql` 以反映真实表结构（文档可信化）
