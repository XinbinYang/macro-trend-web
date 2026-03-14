# EXECUTION_STATUS — 执行状态看板（macro-trend-web）

## 用途
本文件是一页式“项目执行看板”，供杨总/团队随时打开快速了解：
- 当前最关键的 P0/P1/P2 事项在做什么（TODO/DOING/DONE/BLOCKED）
- 卡点是什么、需要谁决策
- 完成后对应的验收与回滚点

## 更新频率（强制）
- **每天至少 1 次**（如当日无推进，则写明 `No change`）。
- **每次进入/退出 DOING、每次上线**：必须更新。
- DONE 项：必须补齐 `commit` + `acceptance`。

## 状态字段约定
- `Owner`：负责人（人/子任务/agent）
- `Commit`：相关 commit hash（或 `TBD`）
- `Acceptance`：local/staging/prod 验收口径与结果
- `Rollback`：一键回滚方式（开关/脚本/commit）

---

## 🔴 P0（会导致线上必然反复出 bug / 口径污染）

### TODO
- [ ] **建立“上线必验收”强制流程**（把验收结果写回 WORKLOG）
  - Owner: 主 Agent
  - Commit: TBD
  - Acceptance: TBD
  - Rollback: N/A

### DOING
- [ ] **TBD**
  - Owner: TBD
  - Commit: TBD
  - Acceptance: TBD
  - Rollback: TBD

### BLOCKED
- [ ] **TBD（需要决策/权限/数据源）**
  - Blocker: TBD
  - Needed: TBD

### DONE
- [x] **文档：WORKLOG + EXECUTION_STATUS 落地**
  - Owner: Data-Nexus subagent（scribe）
  - Commit: e79d6d2
  - Acceptance: PASS（文档结构/字段齐备）
  - Rollback: revert e79d6d2

---

## 🟡 P1（重要：影响效率/可维护性/性能，但不至于立刻炸）

### TODO
- [ ] **把关键 SOP/Checklist 统一入口链接到本看板**（减少“文档散落”）
  - Owner: TBD
  - Commit: TBD

### DOING
- [ ] **TBD**

### BLOCKED
- [ ] **TBD**

### DONE
- [ ] （空）

---

## 🟢 P2（优化项：体验/重构/长期治理）

### TODO
- [ ] **看板字段自动化（可选）**：从 PR/issue 或 commit message 自动汇总到文档
  - Owner: TBD

### DOING
- [ ] **TBD**

### BLOCKED
- [ ] **TBD**

### DONE
- [ ] （空）

---

## 更新规程（落地版）

### 1) 里程碑更新（Milestone → WORKLOG）
每完成一个可验收里程碑，必须在 `docs/WORKLOG.md` 新增一条（或补全当日条目），至少包含：
- Decision / Done / Open / Risks / Rollback
- `commit`（最终合入 hash）
- `checkpoint`（可读命名）
- `Online Acceptance`（环境 + 结果 + 口径 + 证据）

### 2) 上线更新（Release/Hotfix → WORKLOG + 看板）
每次上线必须：
- 在 WORKLOG 新增“上线条目”，并写：
  - prod 验收口径（至少 3 条：关键页面/接口/数据点）
  - 验收结果 PASS/FAIL
  - 若 FAIL：是否回滚、回滚点是什么、后续修复计划
- 在本看板将相关事项从 DOING → DONE，并补齐 `commit/acceptance/rollback`。

### 3) 变更最小纪律
- 任何无法当场验收的项，必须写进 BLOCKED，并明确 Needed。
- 不允许“Done 但缺 commit/验收”的悬空状态（最多保留 24 小时）。
