# P0 审计：`data-dictionary.ts` vs Supabase 实表/查询方式（macro-trend-web）

> 范围：只做 **P0（会导致线上必然反复出 bug / 口径污染）** 的对表审计。
>
> 结论先行：当前 **`lib/config/data-dictionary.ts`（vendor symbol 视角）** 与 **Supabase 查询实际使用的 key（SQLite→Supabase 同构）** 存在结构性错位，导致大量“Supabase miss → 自动 fallback → 数据变成 indicative”。

---

## A. 事实基线（以“代码查询口径 + SQLite 同构”为准）

### A1) Supabase（被查询）的表/主键（来自 `lib/api/fallback-utils.ts`）

`fetchMarketQuoteWithFallback(symbol, region, category)` 在 Supabase 侧的查询规则是：

| category | Supabase table | key field | 取值字段 |
|---|---|---|---|
| `EQUITY` / `BOND` | `assets_equity` | `ticker` | `close` |
| `COMMODITY` | `assets_commodity` | `ticker` | `close` |
| `FX` | `assets_fx` | `pair` | `close` |

> 关键点：**FX 不是用 `ticker`，而是用 `pair`**。

### A2) Supabase 的字段集合（以 SQLite `macro_quant.db` 为“同构源”推断）

原因：`scripts/sync_sqlite_to_supabase.mjs` 直接 `select * from assets_* / macro_*` 然后 upsert/insert 到 Supabase，对应字段必须同构。

- `assets_equity`（SQLite schema）：`date, ticker, name, market, asset_class, open, high, low, close, ...`
- `assets_fx`：`date, pair, open, high, low, close, ...`
- `assets_commodity`：`date, ticker, name, category, open, high, low, close, ...`
- `macro_us`（SQLite schema）：包含 `yield_10y, yield_2y, ism_*, unemployment_rate, cpi_yoy, core_cpi_yoy, ppi_yoy, fed_funds_rate, dxy, ...`
- `macro_cn`：包含 `pmi, cpi_yoy, ppi_yoy, m2_yoy, lpr_1y, lpr_5y, ...`

> **反例提醒：** repo 内 `supabase/schema.sql` 仍是旧结构（`asset_prices`），对现用表（`assets_*`, `macro_*`）没有指导意义，属于 P0 文档漂移。

---

## B. P0 必修冲突清单（你点名的 3 个 + 额外会炸的字段错位）

### B1) `SP500` vs `SPX`（S&P 500）

**现状冲突：**
- `data-dictionary.ts`：`US_SPX: "^GSPC"`（Yahoo symbol）
- 真值/同构（SQLite→Supabase）：`assets_equity.ticker = "SPX"`（内部 canonical）
- API 侧：`/app/api/market-data/route.ts` 当前会把 `^GSPC` 当成 Supabase `ticker` 去查（miss）

**直接后果：**
- Supabase miss → fallback 到 Yahoo → 被标为 `indicative`，同时失去“官方现货收盘价/真值”口径。

**P0 结论：**
- `^GSPC` 只能作为 **vendor symbol（外部）**
- Supabase key 必须用 **`SPX`（内部 canonical ticker）**

---

### B2) `DXY` vs `DX=F` vs `USDX.FX`（美元指数）

**现状冲突：**
- `data-dictionary.ts`：`FX_DXY: "DX=F"`（Yahoo futures symbol）
- 代码查询规则：FX 在 Supabase 必须用 `assets_fx.pair`
- 真值/同构（SQLite→Supabase）：`assets_fx.pair = "USDX.FX"`（Wind 风格 pair）
- API 侧：`/app/api/market-data/route.ts` 虽然写了 `pair: "USDX.FX"`，但实际调用 `fetchMarketQuoteWithFallback(config.ticker || config.symbol)`，**完全忽略 `pair` 字段**

**直接后果：**
- 用 `DX=F` 去查 `assets_fx.pair` → 100% miss → fallback（indicative）

**P0 结论：**
- DXY 的 **Supabase key** 必须是 `assets_fx.pair = "USDX.FX"`
- `DX=F` / `DX-Y.NYB` 仅作为 **vendor symbol（Yahoo）** 的候选

---

### B3) `US10Y` 命名语义（yield vs price）

这里是最危险的：**同名不同物理量**。

**至少存在三类“10Y 美债”概念：**
1) **收益率（Yield, %）**：`macro_us.yield_10y`（字段级指标）
2) **期货/债券价格（Price/Settle）**：SQLite `assets_equity.ticker = "US_10Y"` 的 `close`（形如 112.8125 的价格型数值）
3) （历史脚本）`assets_bond.ticker = "US10Y_T_BOND_F"` 的 `dirty_price`/`ytm`（更偏交易/结算口径）

**现状冲突：**
- `data-dictionary.ts` 把 `US_10Y: "US10Y"` 放在 `SYMBOLS`（market symbols）里，但 `US10Y` 被注释成“来自 FRED 的收益率”。
- 实际上 **FRED 10Y yield** 对应的是 `macro_us.yield_10y`（字段），不应该走 `assets_equity.ticker` 或 Yahoo symbol。

**直接后果：**
- UI/API 不小心把 `US_10Y`（价格）当 `US10Y`（收益率）展示 → 量纲错、策略解释错。

**P0 结论（强制拆分）：**
- `US10Y` 只保留给 **Yield(%) 指标**（macro indicator）
- 价格型（期货/指数/ETF）必须有单独 canonical id（例如 `US10Y_FUT_PRICE` / `US_10Y_FUT`）

---

### B4) `INDICATOR_DB_COLUMNS` 与真实 `macro_us/macro_cn` 字段不一致（额外 P0）

`data-dictionary.ts` 当前包含：
- `us_sofr → "sofr"`
- `us_fci → "fci"`
- `us_m2_yoy → "m2_yoy"`
- `us_core_pce_yoy → "core_pce_yoy"`

但 SQLite `macro_us` **并不存在**这些列（至少在当前库快照中）：
- `macro_us` 列表里没有 `sofr / fci / m2_yoy / core_pce_yoy`

**直接后果：**
- Dashboard/Macro State 一旦引用这些 indicatorId → 走 Supabase 查询时 100% miss 或报错（视 PostgREST 行为）→ fallback 变 indicative 或 OFF。

**P0 结论：**
- 要么：下线这些 indicatorId（直到 DB 真有字段）
- 要么：对 Supabase/SQLite 做 schema migration 增加列，并把 ETL/cron 填上

---

## C. 推荐最终 Canonical（按“内部 canonical id → vendor symbol → Supabase key”三层拆分）

> 目标：任何业务逻辑只认 **canonical id**；
> vendor symbol 只用于外部抓取；
> Supabase key 只用于落库/查询。

### C1) Equity / Index（EOD 真值）

| canonical id（推荐） | 语义 | vendor symbol（Yahoo 等） | Supabase key（表/键） |
|---|---|---|---|
| `SPX` | S&P 500 现货指数收盘 | `^GSPC` | `assets_equity.ticker = 'SPX'` |
| `NDX` | Nasdaq 100 现货指数收盘 | `^NDX` | `assets_equity.ticker = 'NDX'` |
| `DJI` | Dow 30 | `^DJI` | `assets_equity.ticker = 'DJI'` |
| `RTY` | Russell 2000（你现在用的是 RTY） | `^RUT`（若用） | `assets_equity.ticker = 'RTY'` |
| `HS300` | 沪深300（现货） | `000300.SH`（展示用） | `assets_equity.ticker = 'HS300'` |
| `ZZ500` | 中证500（现货） | `000905.SH`（展示用） | `assets_equity.ticker = 'ZZ500'` |
| `HSI` | 恒生指数（现货） | `HSI` / `^HSI` | `assets_equity.ticker = 'HSI'` |
| `HSTECH` | 恒生科技（现货） | `^HSTECH`（展示/抓取） | `assets_equity.ticker = 'HSTECH'` |

> 注：`data-dictionary.ts` 当前 CN/HK 用的是 Eastmoney/Yahoo 风格 symbol（如 `000300.SH`, `^HSTECH`），但真值库 canonical ticker 是 `HS300/HSTECH`。必须选一个为“内部 canonical”。

---

### C2) FX（必须走 `assets_fx.pair`）

| canonical id（推荐） | 语义 | vendor symbol（Yahoo） | Supabase key（表/键） |
|---|---|---|---|
| `DXY` | 美元指数 | `DX-Y.NYB`（现货指数）或 `DX=F`（期货） | `assets_fx.pair = 'USDX.FX'` |

---

### C3) US10Y：强制拆分（yield vs price）

| canonical id（推荐） | 语义 | vendor symbol | Supabase key |
|---|---|---|---|
| `US10Y_YIELD` | 10Y Treasury Yield（%） | FRED `DGS10`（首选），Yahoo `^TNX`（注意 *10） | `macro_us.yield_10y`（按 date） |
| `US10Y_FUT_PRICE` | 10Y 期货/价格型 proxy（112.8125 这类） | （不要用 FRED） | `assets_equity.ticker = 'US_10Y'` |

**命名强约束：**
- UI/文案必须写清楚 `Yield(%)` vs `Price/Settle`。

---

### C4) Macro indicators（字段对齐版）

以当前 SQLite/Supabase 同构为准，能稳定对齐的字段：

| indicator canonical id | Supabase（table.field） | data-dictionary 当前映射 | 状态 |
|---|---|---|---|
| `us_ism_services_pmi` | `macro_us.ism_services` | ✅ | OK |
| `us_ism_manufacturing_pmi` | `macro_us.ism_manufacturing` | ✅ | OK |
| `us_unemployment_rate` | `macro_us.unemployment_rate` | ✅ | OK |
| `us_cpi_yoy` | `macro_us.cpi_yoy` | ✅ | OK |
| `us_core_cpi_yoy` | `macro_us.core_cpi_yoy` | ✅ | OK |
| `us_fed_funds_rate` | `macro_us.fed_funds_rate` | ✅ | OK |
| `us_10y_yield` | `macro_us.yield_10y` | ✅ | OK |
| `us_2y_yield` | `macro_us.yield_2y` | ✅ | OK |
| `cn_pmi_mfg` | `macro_cn.pmi` | ✅ | OK |
| `cn_cpi_yoy` | `macro_cn.cpi_yoy` | ✅ | OK |
| `cn_ppi_yoy` | `macro_cn.ppi_yoy` | ✅ | OK |
| `cn_m2_yoy` | `macro_cn.m2_yoy` | ✅ | OK |
| `cn_lpr_1y` | `macro_cn.lpr_1y` | ✅ | OK |
| `cn_lpr_5y` | `macro_cn.lpr_5y` | ✅ | OK |

需要 **P0 修正/落库迁移** 的（当前 data-dictionary 有，但 DB 没有列）：
- `us_sofr → macro_us.sofr`（缺列）
- `us_fci → macro_us.fci`（缺列）
- `us_m2_yoy → macro_us.m2_yoy`（缺列）
- `us_core_pce_yoy → macro_us.core_pce_yoy`（缺列）

---

## D. 迁移步骤（含回滚提示）

### D1) 迁移目标（最小可行 P0）
1) **把 Supabase 查询 key 修正到真实 key**：
   - `^GSPC → SPX`
   - `DX=F/DXY → USDX.FX`（FX pair）
2) **US10Y 拆分**：
   - yield 一律走 `macro_us.yield_10y`
   - price 一律走 `assets_equity.US_10Y`
3) **清理/冻结 data-dictionary 里“DB 不存在字段”的 indicator 映射**（或者补 schema）

---

### D2) 推荐实施顺序（代码层，不动 DB 也能先止血）

**Step 0 — 增加“兼容层”开关（便于回滚）**
- 在服务端引入 `CANONICAL_V2_ENABLED`（env 或常量）
- v2 打开时才启用新 canonical 映射；否则沿用旧逻辑

**Step 1 — 修正 `market-data` 的 ASSET_CONFIG 与调用方式**
- SPX：把 Supabase ticker 改为 `SPX`（不要用 `^GSPC` 查 Supabase）
- DXY：调用 `fetchMarketQuoteWithFallback('USDX.FX', 'GLOBAL', 'FX')`
  - 或者在 `fetchAllQuotesWithFallback` 里：`category===FX ? (config.pair ?? config.ticker) : config.ticker`

**Step 2 — US10Y 从“市场资产”移出，作为 macro indicator**
- `market snapshot` 不再把 `US10Y` 当成 `assets_equity.ticker`/Yahoo symbol
- 统一通过 `fetchMacroWithFallback('macro_us','yield_10y','US')`

**Step 3 — data-dictionary.ts 结构升级（推荐，但可后置）**
- 把当前 `SYMBOLS`（vendor symbol）升级为三段式：
  - `canonicalId`（内部）
  - `vendorSymbols`（yahoo/eastmoney/fred）
  - `supabase`（table + keyField + key + valueField）

---

### D3) 数据层迁移（可选，解决 alias）
当业务仍需要接受 `^GSPC / DX=F` 作为输入时，给 Supabase 增加 **alias 映射层**：
- 方案 A：新增表 `ticker_aliases`（参考 `data/migrations/001_ticker_aliases.sql`）同步到 Supabase
- 方案 B：服务端在查询前做 canonicalize（输入 alias → canonical）

> P0 建议优先方案 B（不改 DB），方案 A 作为长期治理。

---

### D4) 回滚提示（必须写在 SOP 里）

**代码回滚：**
- 保留旧 ASSET_CONFIG（或旧 canonicalize 逻辑）在同一文件内
- 通过 `CANONICAL_V2_ENABLED=false` 一键退回旧行为

**数据回滚（若你做了 alias 写入/补列）：**
- 对新增 alias 行：按 `source` 或 `is_proxy` 标记可批量删除
- 对新增列：不影响旧读逻辑；回滚只需停止写入（cron/etl）即可

---

## E. 你需要主 Agent 拍板的“最终取舍”（只列 P0）

1) **SPX 是否作为全局 canonical id？**
   - 我建议：是（因为真值库已经是 `SPX/NDX/RTY/DJI`）
2) **DXY 的 Yahoo vendor symbol 选哪个？**
   - 我建议：`DX-Y.NYB`（更像现货指数），但 Supabase key 仍是 `USDX.FX`
3) **US10Y：UI 主展示是 Yield(%) 还是 Price/Settle？**
   - 我建议：宏观面板默认 **Yield(%)**；交易/回测页面再单列 price。
