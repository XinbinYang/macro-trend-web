# CN Macro Indicators — Auditable Data Sources & Roadmap

目标：为首页 🇨🇳 CN view 的“增长/通胀/政策/流动性”四卡提供**可审计**指标来源与接入路线图。

> 铁律：在未接入可审计源之前，CN view 必须保持 **OFF/—**，禁止写死数字与叙事冒充。

---

## 1) Minimal Closed Loop (5 indicators)

| Dimension | Indicator (CN) | Suggested id | Unit | Notes |
|---|---|---:|---:|---|
| Growth | Manufacturing PMI | `cn_pmi_mfg` | idx | 高频/偏领先，注意发布日滞后 |
| Inflation | CPI YoY | `cn_cpi_yoy` | % | 核心锚，月频 |
| Policy | MLF 1Y | `cn_mlf_1y` | % | 政策利率锚 |
| Liquidity (qty) | M2 YoY | `cn_m2_yoy` | % | 总量，月频 |
| Liquidity (price) | DR007 | `cn_dr007` | % | 价格，日频（交易日） |

---

## 2) Auditable Sources (first-party)

> 这里只定义“允许的来源类型”，具体抓取/镜像方式在 Phase 2 再落实现。

- **PBoC (中国人民银行)**：政策利率（如 MLF）、可能的公开市场操作相关公告
- **NBS (国家统计局)**：CPI、PMI（注意 PMI 也可能由 NBS/物流采购联合会发布，需确认最终可审计落点）
- **CFETS / interbank market official publication**：DR007（需选择可审计的官方发布入口/镜像）

每个指标的口径必须在接入时固定：
- `asOf`：该指标对应的官方发布日期（不是抓取时间）
- `updatedAt`：我们系统抓取/产物生成时间
- `source`：例如 `PBOC` / `NBS` / `CFETS`（或更精确的 code）
- 可选 `sourceUrl`：官方公告/数据页 URL（用于审计）

---

## 3) API Contract (align with /api/macro-indicators)

建议 CN 指标与现有 `/api/macro-indicators` 保持同构（LIVE/OFF 结构一致），扩展字段向后兼容：

### MacroIndicator
- `id: string`
- `name: string`
- `value: number | null`
- `unit: string` (`%` | `idx` | ...)
- `status: "LIVE" | "OFF"`
- `asOf: string | null` (YYYY-MM-DD)
- `source: string` (e.g. `NBS`, `PBOC`, `CFETS`, `OFF`)
- `sourceUrl?: string` (optional)

### MacroIndicatorsResponse
- `updatedAt: string`
- `indicators: MacroIndicator[]`

---

## 4) Roadmap

### Phase 1 — Offline verification (now)
- 只定义指标集、口径、产物格式
- CN view UI 维持 OFF/—

### Phase 2 — Automated collection
- 建立可审计采集/镜像/落盘流程（建议“方案A：离线产物 → 网站只读展示”）
- 每个指标保留原始源文件/快照（血缘）

### Phase 3 — Production hardening
- 缓存、失败告警、回滚
- UI 明确显示 `asOf/source`，并支持“最后更新时间”

