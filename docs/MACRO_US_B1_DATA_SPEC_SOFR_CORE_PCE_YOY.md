# B 第一批 — US Macro 数据口径与字段规范（SOFR + Core PCE YoY）

> 目的：为 Supabase `macro_us` 表补齐 **SOFR（日频）** 与 **Core PCE YoY（月频）** 两个字段的**可执行口径**，避免前后端/接口/时间对齐出现“看似有数但口径漂移”。

---

## 1) 目标表与新增列（Schema Proposal）

- **目标表**：`macro_us`
- **新增列命名（建议锁死）**：
  - `sofr`
  - `core_pce_yoy`

> 命名原则：与现有字段（`yield_10y`, `fed_funds_rate`, `cpi_yoy`）一致，使用 snake_case、含义直观、避免带 `us_` 前缀（`us_` 前缀留给前端指标 ID，如 `us_sofr`）。

---

## 2) 指标口径（Data Definition）

### 2.1 SOFR（Secured Overnight Financing Rate）

- **字段名**：`macro_us.sofr`
- **来源（Source for ingestion / indicative）**：FRED
  - **FRED series_id**：`SOFR`
  - 页面：<https://fred.stlouisfed.org/series/SOFR>
- **频率（Cadence）**：日频（**business day**，节假日/周末通常无观测）
- **单位（Unit）**：`%`（年化利率百分数口径，例如 5.20 表示 5.20%）
- **时间对齐规则（date alignment / EOD）**：
  1. 采用 FRED `observation.date` 作为 `macro_us.date`（`YYYY-MM-DD`），不引入时分秒。
  2. 该 date 解释为 **US 当日 EOD 的官方发布值**（EOD=该日期的发布/定盘值，而非本地时区 24:00）。
  3. **不做 forward-fill**（不在周末/假日补值）；读取端如需连续曲线，可用 last-non-null（项目已实现 12mo window 回溯）。

- **落库建议（可执行）**：
  - 抓取最新 N 天（建议 30–90 天回补），按 `date` upsert。
  - `source`（若表内存在）建议写：`FRED`，并在 UI 侧继续标注 `Indicative`（直到 Truth 源接管）。


### 2.2 Core PCE YoY（核心PCE同比）

- **字段名**：`macro_us.core_pce_yoy`
- **推荐口径（锁定）**：由 Core PCE Price Index 计算 YoY（可复现、可审计）
  - **FRED index series_id**：`PCEPILFE`
  - 页面：<https://fred.stlouisfed.org/series/PCEPILFE>

- **频率（Cadence）**：月频
- **单位（Unit）**：`%`
- **计算口径（Calculation）**：

  ```text
  core_pce_yoy_t = (I_t / I_{t-12} - 1) * 100
  ```

  - `I_t` 为当月 Core PCE index
  - 入库精度建议保留 ≥4 位小数（float），展示层格式化为 2 位

- **时间对齐规则（monthly -> date / EOD）**：
  - FRED 月度观测通常用 `YYYY-MM-01` 表示“该月”。为与本项目 `macro_us` 月度快照（常用 month-end，如 `2026-02-28`）一致，建议落库时：
    1. `YYYY-MM-01` 映射为该月 **month-end** 作为 `macro_us.date`
    2. 对外展示 `asOf` 同样使用 month-end

- **关于“直接 YoY series”**（可选，不建议作为主口径）：
  - FRED 同一 index series 支持 `units=pc1` 返回 year-ago percent change；
  - 但仍建议以 index-level + 本地计算 YoY 为主，以保证一致性与可追溯。

---

## 3) 字段与前端指标 ID 对应关系（Mapping）

- `us_sofr`  → `macro_us.sofr`
- `us_core_pce_yoy` → `macro_us.core_pce_yoy`

> 说明：当前 macro framework 配置里已存在 `us_sofr/us_core_pce_yoy` 指标 ID，但标注为 `PENDING_SCHEMA`；本文件用于把字段口径补齐，供后续入库链路落地。

---

## 4) 线上验收 Checklist（上线/回归必过）

### 4.1 数据入库与表结构
- [ ] Supabase `macro_us` 表存在列：`sofr`、`core_pce_yoy`
- [ ] `sofr`：最近 >=5 个 business days 非空
- [ ] `core_pce_yoy`：最新月非空
- [ ] `date` 对齐符合：
  - [ ] `sofr`：business day
  - [ ] `core_pce_yoy`：month-end

### 4.2 接口/API
- [ ] `/api/macro-indicators`：
  - [ ] `id=us_sofr` 的 `value/asOf/source` 非空
  - [ ] `id=us_core_pce_yoy` 的 `value/asOf/source` 非空
- [ ] `/api/dashboard` / `/api/macro-state`：维度计算无报错；缺数允许 fallback，但必须标注 `source/is_stale`

### 4.3 页面/UI
- [ ] 宏观页/首页宏观卡：
  - [ ] “政策利率(SOFR)” 有数、单位 `%`、显示 `asOf + source`
  - [ ] “核心PCE同比” 有数、单位 `%`、显示 `asOf + source`
- [ ] 来源标注符合 Truth/Indicative 规范（FRED=Indicative，不得冒充 Truth）

---

## 5) 实施注意事项（避免踩坑）

- **SOFR ≠ Fed Funds**：SOFR 是担保隔夜回购利率；可作为“政策”维度 main，FedFunds 可作 aux（项目配置已如此）。
- **同表承载月度+日度**：必须严格遵守 date 对齐；读取端使用 last-non-null（12mo window）避免“最新行缺字段导致 UI 变 —”。
