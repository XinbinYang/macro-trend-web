# SUBAGENT Playbook (macro-trend-web)

目标：把 subagent 协同变成“可复用的执行操作系统”，做到 **快、稳、真、可审计**。

> 核心：Main 负责拆包/派工/集成上线；Subagent 负责模块内交付；所有输出用“可验证证据链”代替完整 CoT。

---

## 0. 执行铁律（必须遵守）

1) **Main 只做 4 件事**
- 拆任务成可并行包（含目录边界）
- 派工（spawn subagents）
- 集成（合并结果、修冲突）
- 验收与上线（lint/build/push + 更新置顶）

2) **Subagent 必须有目录边界**
- 每个 subagent 只允许修改指定目录/文件集合
- 禁止多个 subagent 同时改同一文件（除非 Main 明确批准）

3) **“真/假状态”必须显式**
- LIVE / AI / SAMPLE / MOCK / OFF
- AI 必须真 AI；失败=OFF，不准模板冒充

4) **合并前必跑**（Main 统一执行）
- `npm run lint`
- `npm run build`

5) **对外透明但不输出完整 CoT**
- 对外只输出：3 行决策摘要 + 可审计证据（commit/hash、文件路径、API、验收链接）

6) **Discord 只维护 3 条置顶**（只编辑不刷屏）
- Progress Panel（里程碑）
- Execution Log（事实流水）
- Live Tracker（NOW/PARALLEL/LAST/NEXT）

---

## 1. Agent 路由表（按任务类型自动选）

### Main (GPT‑5.2)
- 角色：总工/发布经理
- 适用：拆包、取舍、集成、验收、上线、口径把关

### minimax-engineer
- 角色：高吞吐工程实现
- 适用：Next.js/TS 实现、组件、API、性能、修 lint/build

### claude-sonnet-agent
- 角色：架构/接口/数据模型设计
- 适用：状态机、数据契约、边界条件、可扩展方案

### gemini-auditor
- 角色：扫描/审计/风险清单
- 适用：全站 SAMPLE/写死/误导点扫描，回归验收清单

### Kimi 2.5（主模型优势：中文）
- 角色：中文主笔 + 长文整合
- 适用：中文报告、口径统一文案、对外简报压缩、周总结归档

---

## 2. 标准并行“工作包”切法（避免互踩）

优先按 **模块/目录** 切包：

- News：`app/api/news/*` + `app/news/*` + `components/news-*`
- Macro indicators：`app/api/macro-indicators/*` + `lib/api/fred-api.ts` +（后续）dashboard adapter
- NAV：`data/nav/*` + `app/api/nav/*` + `app/nav/*`
- Sample cleanup：按页面切：`app/strategies/*`、`components/macro-gauge.tsx`、`components/terminal-layout.tsx`

禁止切法：
- 多人同时改 `app/page.tsx`（首页）

---

## 3. Subagent 交付物格式（必须按模板）

每个 subagent 产出必须包含：

- **Scope**：允许修改的路径列表
- **Changes**：做了什么（要点）
- **Files changed**：具体文件清单
- **Verification**：如何验收（URL/API/截图点）
- **Risks**：潜在副作用/回滚点

---

## 4. Main 集成与上线 Checklist

- [ ] 拉取/合并 subagent 改动（必要时手工集成）
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `git commit`（写清变更面）
- [ ] `git push origin master`（触发 Vercel）
- [ ] 更新 Discord 三条置顶（Progress/Log/Live）

---

## 5. “快版本(A档)”与“稳版本(B档)”策略

- **A档（24h 可用）**：规则筛选、只读接口、显式 OFF/SAMPLE，先让系统可用且不误导
- **B档（72h 自动化）**：离线产物/真值层接入、版本化与血缘、逐步替换 A档的 OFF/SAMPLE

