# WORKLOG — 工作记录 / 审计追踪（macro-trend-web）

## 用途
本文件用于**按日期**记录本 repo 的关键工作推进，形成可审计的“决策—执行—验收—回滚”闭环，避免口径漂移与反复返工。

## 更新频率（强制）
- **每完成一个里程碑（Milestone）**：至少新增 1 条记录（含 commit/checkpoint/验收结果）。
- **每次上线/发布（含 hotfix）**：必须新增 1 条记录，并写明**线上验收结果**（成功/失败、验证口径、链接/截图位置）。
- **零碎小改动**：允许合并到同一天同一条记录内，但不得跨里程碑遗漏。

## 记录规范（每条必须具备的字段）
> 建议复制模板填写；如暂时无法给出某字段，必须写明原因与补全时间（例如 `TBD@2026-03-15`）。

- **日期**：以 HKT（GMT+8）为准。
- **关键决策（Decision）**：明确“为什么这么做/取舍是什么”。
- **完成项（Done）**：可验证的结果（文件、接口、页面、数据范围）。
- **未决项（Open / Next）**：下一步、依赖、负责人。
- **风险（Risks）**：可能导致线上错误/口径污染/数据漂移的点。
- **回滚点（Rollback）**：如何一键回退（开关/配置/回滚 commit/恢复脚本）。
- **Commit / Checkpoint**：
  - `commit`: 对应里程碑完成的 Git commit hash（或 PR merge commit）。
  - `checkpoint`: 可读的检查点命名（例如 `v2026-03-14-a` / `prod@2026-03-14-1800`）。
- **线上验收（Online Acceptance）**：
  - 环境：`local` / `staging` / `prod`
  - 结果：`PASS` / `FAIL` / `PARTIAL`
  - 口径：验证了哪些指标/页面/接口
  - 证据：URL、截图、日志位置（如有）

---

## 2026-03-14（Sat）

### 条目 001 — 建立工作记录与看板体系
- **Decision**：为提升可追踪性与“上线必验收”的纪律性，引入 WORKLOG + EXECUTION_STATUS 两份常驻文档。
- **Done**：
  - 新增 `docs/WORKLOG.md`
  - 新增 `docs/EXECUTION_STATUS.md`
- **Open / Next**：
  - 将本条目的 `commit`/`checkpoint` 在合并后补全（若当前为 TBD）。
- **Risks**：
  - 若团队不按频率更新，文档会退化为摆设；需在每次上线 checklist 中硬性要求填写。
- **Rollback**：
  - 文档变更可直接回滚对应 commit（不影响代码逻辑）。
- **Commit**：e79d6d2
- **Checkpoint**：v2026-03-14-a
- **Online Acceptance**：
  - 环境：N/A（文档变更）
  - 结果：PASS
  - 口径：文件存在、结构满足审计字段要求
  - 证据：repo `docs/` 目录
