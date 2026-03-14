# P0 迁移 Checklist — Data Dictionary ↔ Supabase 对齐

> 用途：按勾选推进，避免“修一处、炸三处”。

---

## ✅ 0) 准入/前置确认
- [ ] 明确 Supabase 现用表：`assets_equity / assets_commodity / assets_fx / macro_us / macro_cn`
- [ ] 明确查询规则：FX 用 `assets_fx.pair`；其余用 `*.ticker`
- [ ] 确认 `supabase/schema.sql` 仅作旧文档，不作为真实 schema 依据（需要更新）

---

## 🔴 1) 必修冲突修复（P0）

### 1.1 SP500/SPX
- [ ] 统一内部 canonical：`SPX`
- [ ] `/app/api/market-data`：Supabase lookup key 改为 `SPX`（不要用 `^GSPC` 查 DB）
- [ ] 如需继续接受 `^GSPC` 输入：在服务端 canonicalize（`^GSPC → SPX`）
- [ ] 回归：Supabase 命中后 `isIndicative=false`

### 1.2 DXY/DX=F/USDX.FX
- [ ] 统一内部 canonical：`DXY`
- [ ] Supabase key 固定：`assets_fx.pair='USDX.FX'`
- [ ] 修复调用：`fetchMarketQuoteWithFallback` 入参对 FX 必须传 `pair`（`USDX.FX`），禁止传 `DX=F`
- [ ] 回归：DXY 不再走 Yahoo fallback

### 1.3 US10Y 语义拆分
- [ ] 确认“10Y”显示默认口径：Yield(%)（来自 `macro_us.yield_10y`）
- [ ] 明确价格型 proxy：`assets_equity.ticker='US_10Y'`（112.8125 这类）
- [ ] UI 文案强制区分：`US10Y Yield (%)` vs `US10Y Fut Price/Settle`

---

## 🔴 2) `data-dictionary.ts` 与 DB 字段对齐（P0）
- [ ] 逐条核对 `INDICATOR_DB_COLUMNS`：
  - [ ] `macro_us` 目前缺列：`sofr / fci / m2_yoy / core_pce_yoy`
  - [ ] 选择其一：
    - [ ] A) 暂时下线这些 indicator（避免 100% miss）
    - [ ] B) Supabase/SQLite 同步加列 + ETL/cron 写入

---

## 🟡 3) 兼容层与回滚
- [ ] 引入开关 `CANONICAL_V2_ENABLED`（env/const）
- [ ] 新逻辑只在开关打开时启用
- [ ] 回滚：关闭开关 → 恢复旧映射

---

## 🟡 4) 文档可信化（强制）
- [ ] 更新 `supabase/schema.sql`：补齐真实表结构（至少表名/主键/核心字段）
- [ ] 文档注明：旧 `asset_prices` 已废弃 or 仅示例

---

## 🟢 5) 回归测试（最小集）
- [ ] `SPX`：Supabase 命中 & 最新日期正确
- [ ] `USDX.FX`：Supabase 命中 & 不走 fallback
- [ ] `US10Y_YIELD`：来自 `macro_us.yield_10y`，单位 %
- [ ] `US_10Y`（价格）：来自 `assets_equity.close`，单位 price
- [ ] `isIndicative` 标记：Supabase 命中为 false，fallback 为 true
