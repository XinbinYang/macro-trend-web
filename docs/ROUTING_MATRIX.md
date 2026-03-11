# Routing Matrix (Task → Agent → DoD)

目的：把“动态适配”固化成可执行规则：给定任务类型与风险标签，自动选择 subagent，并定义最小交付（DoD）。

---

## 1) Task Types

### T1 — Web/UI (Next.js)
- 推荐 agent：`minimax-engineer`
- 如涉及跨模块契约/状态机：先 `claude-sonnet-agent` 出契约，再由 `minimax-engineer` 落地
- DoD：
  - 变更摘要 + 文件清单
  - 页面可验收路径
  - Main lint/build 通过

### T2 — API/Contracts
- 推荐 agent：`claude-sonnet-agent`（契约优先）
- 执行 agent：`minimax-engineer`
- DoD：
  - 输入/输出 schema（含 LIVE/OFF/SAMPLE/MOCK）
  - 错误码与降级策略（AI 必须真 AI）
  - 至少 1 个可复现实例（curl / web_fetch）

### T3 — Research/Strategy (Backtest/Signals)
- 推荐 agent：`claude-sonnet-agent`（研究设计） + `minimax-engineer`（代码化）
- 审计：`gemini-auditor`
- DoD：
  - 数据口径声明（可审计来源）
  - 可复现脚本/参数
  - 风险指标必备（CAGR/Vol/MaxDD/Sharpe）

### T4 — Audit/Sample Cleanup
- 推荐 agent：`gemini-auditor`（扫描清单）
- 执行 agent：`minimax-engineer`
- DoD：
  - 输出风险点清单（path + 严重级别）
  - P0 必须止血：写死“看似真实” → `SAMPLE/—` 或 `OFF`

### T5 — Chinese Copy / Reporting
- 推荐 agent：Kimi 2.5（中文主笔）
- DoD：
  - 结论先行（3–5 条）
  - 术语统一，口径符合 LIVE/OFF/SAMPLE/MOCK

---

## 2) Risk Tags（触发额外 gate）

- `AI`：必须返回 usage/source；失败 OFF；禁止模板冒充
- `DATA_TRUTH`：必须 asOf/source；禁止暗示实时
- `MOBILE`：必须做移动端可达性回归
- `DEPLOY`：必须更新 Discord 三条置顶

---

## 3) Subagent Delivery Format（统一）
每个 subagent 交付必须包含：
- Scope：allowed/forbidden paths
- Changes：<=5 bullets
- Files changed：list
- Verification：URLs/APIs
- Risks & rollback

