# 研究生产线 SOP（R&D Line）— V1

目标：**快、可复现、可审计（truth-first）**。任何不确定来源必须显式标注 `LIVE / OFF / SAMPLE / MOCK`，避免“看起来很真”的伪真值。

---

## 0. 任务准入（Intake）
每个任务必须有：
- 一句话目标（Goal）
- 交付物（至少一个）：`artifact / API / UI / doc / migration`
- 状态预期：默认 `SAMPLE`，除非证据链闭环

---

## 1. 任务分类（用于自动适配 SUBAGENT）

| 类型 | 典型工作 | 风险等级 |
|---|---|---|
| Data/ETL | 新数据源接入、去重、别名、DQ、Truth 表写入 | 高 |
| Strategy/Engine | 权重/杠杆/再平衡/回测、产物生成 | 高 |
| Artifact/API/UI | 网站展示、API 契约、指标图表 | 中 |
| Audit/Gating | 口径、lineage、proxy 规则、LIVE/SAMPLE 闸门 | 高 |
| Ops/Automation | Actions/cron、部署、权限、repo hygiene | 中 |

触发“高风险”的关键词：`proxy / alias / 真值 / LIVE / 杠杆 / target vol / 资金成本 / 交易指令`。

---

## 2. SUBAGENT 自动适配规则（默认三叉戟）

### A) 轻任务（低风险/小改动）
- Subagent：Engineer
- 主线程：lint/build + 合并

### B) 标准任务（默认）
- Subagent：Engineer + Auditor
- 主线程：合并 + 验收 + Live Tracker 单次编辑

### C) 高风险任务（涉及真值/杠杆/LIVE/资金）
- Subagent：Engineer + Auditor + Reviewer
- 主线程：必须增加“变更清单 + 回滚点”

---

## 3. 数据准入铁律（R&D 仍强制）
- 允许来源：**杨总 Master 文件 + AkShare 官方镜像**（其余一律视为 proxy/外部参考）
- ETL 分层：Raw → Staging → Clean → Truth → Artifacts
- 默认禁止“数值校准/对齐”（只做选择/标准化 + 异常记录）；校准需显式批准

---

## 4. Proxy & Alias 铁律（关键）
- Alias：允许（例如 `^GSPC -> SPX`），必须可追溯
- Proxy：允许（用于不断档），但必须：
  - 写入 lineage（original_ticker/proxy_source/reason）
  - 写入 `data_quality_log`
  - **策略状态保持 `SAMPLE`**，禁止暗升 `LIVE`

唯一预授权的指数→替代品 proxy：`NDX -> QQQ`（仅当主序列触发 DQ 失败时）。

---

## 5. 验收清单（Definition of Done）
- 可复现：脚本/迁移/命令可跑
- 可审计：artifact 带 `asOf/status/dataLineage`，DQ 有记录
- 工程质量：`npm run lint && npm run build` 通过
- 对外汇报：Discord 仅 **编辑 pinned Live Tracker 一次**（不刷屏）

---

## 6. 汇报模板（Live Tracker 单次编辑）
- DONE：3 条内
- RESULT：`asOf / status / 关键字段`
- GATING：为什么不能 LIVE
- COMMIT：1~2 个
- NEXT：下一步拍板点（若需要）
