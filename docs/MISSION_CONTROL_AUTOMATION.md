# Mission Control 自动化增强建议

**目标**: 在不引入高风险依赖的前提下，让 `/mission` 更接近真实执行流追踪

---

## 1. 可以马上接的自动化 ✅

### 1.1 Git Commit 驱动的时间线自动生成
- **当前**: Timeline 是静态 JSON，手动维护
- **方案**: 解析 `git log --oneline -10` 自动生成最近 commit 列表
- **风险**: 极低（只读 git 命令）
- **实现**: `GET /api/mission/timeline` 新增一个从 git log 聚合的 timeline 分支

### 1.2 Subagent Session 状态同步
- **当前**: Agent 状态硬编码在 status.json
- **方案**: 通过 OpenClaw sessions API 获取活跃 subagent 列表，自动填充 agent 状态
- **风险**: 低（调用 OpenClaw 内置 API）
- **实现**: 前端轮询 `/api/mission/agents` → 调用 OpenClaw sessions list

### 1.3 自动刷新 + 状态指示器
- **当前**: 30秒轮询，无状态指示
- **方案**: 
  - 添加 "last updated: X seconds ago" 展示
  - 添加 "live" 脉冲动画（正在刷新时）
- **风险**: 零
- **实现**: 纯前端 UI 增强

### 1.4 Task 状态自动高亮
- **当前**: 所有任务同等展示
- **方案**: 
  - `DOING` 任务添加脉冲边框
  - `BLOCKED` 任务添加红色呼吸灯效果
- **风险**: 零
- **实现**: CSS 增强

---

## 2. 需要外部持久层的功能 ⚠️

### 2.1 任务执行历史审计
- **问题**: 当前 status.json 只有快照，无历史
- **需要**: 每次状态变更记录 timestamp + from→to
- **方案A**: SQLite（项目已有 drizzle + macro_quant.db）
- **方案B**: 写文件 + git 版本化
- **推荐**: 方案B（零新增依赖）

### 2.2 跨会话任务继承
- **问题**: 任务状态在 main agent 重启后丢失
- **需要**: 持久化到文件系统或数据库
- **方案**: 继续用 `data/mission/status.json`，加上版本化备份

### 2.3 实时执行日志流
- **问题**: 想看 subagent 实时输出（stdout）
- **需要**: WebSocket 或轮询 subagent log
- **方案**: OpenClaw process API 轮询（低频）
- **推荐**: 暂不实现，用 Discord thread 作为日志载体

### 2.4 跨任务依赖可视化
- **问题**: BLOCKED 任务不知道被什么阻塞
- **需要**: task.dependencies 字段 + 依赖图渲染
- **方案**: 扩展 status.json schema，UI 加简单的依赖线

---

## 3. 最小下一步实现建议 🎯

### 方案: "Status Writer" 模式（推荐）

**核心思路**: Main Agent 在 spawn subagent 时，自动调用一个轻量写入 API，更新 status.json

```
Step 1: 新增 POST /api/mission/write
├── body: { action: "update_task", taskId: "OPS-001", status: "DOING", note: "..." }
└── 写 data/mission/status.json + 备份

Step 2: Main Agent 调用
├── spawn subagent 后 → POST /api/mission/write { status: "DOING" }
├── subagent 完成 → POST /api/mission/write { status: "DONE" }
└── 失败 → POST /api/mission/write { status: "BLOCKED", note: "..." }

Step 3: 增强 UI
├── 添加 "live pulse" 动画
├── 添加 "updated Xs ago"
└── 添加 task 状态变更 timestamp
```

**为什么这个方案低风险**:
1. 只用现有文件系统，不新增 DB
2. JSON 写文件是原子操作（加 fs.writeFileSync + backup）
3. rollback 简单：git checkout status.json

---

## 4. UI/状态展示增强建议 💡

### 4.1 执行时间线增强
```
当前:
🟡 MACRO-001 宏观研究页 /macro 骨架

增强后:
🟡 14:32 | MACRO-001 宏观研究页 /macro 骨架 (进行中 23min)
```

### 4.2 Agent 心脏跳动显示
```
当前: 🟡 RUNNING
增强后: 🟡 RUNNING | 心跳 5s 前 (带脉冲动画)
```

### 4.3 任务进度条（针对 DOING）
```tsx
// 伪代码
{status === "DOING" && (
  <div className="h-1 bg-slate-800 mt-2 rounded overflow-hidden">
    <div className="h-full bg-amber-500 animate-pulse w-2/3" />
  </div>
)}
```

### 4.4 Blocker 快速跳转
```
🔴 中国债券数据仍在降级模式
    → [查看 DATA-001 任务] [刷新状态]
```

### 4.5 快捷操作按钮（可选）
```
[开始新任务] [标记完成] [报告阻塞]
（调用 POST /api/mission/write）
```

---

## 5. 实施优先级排序

| 优先级 | 任务 | 预估工时 | 依赖 |
|--------|------|----------|------|
| P0 | POST /api/mission/write | 30min | 无 |
| P0 | Main Agent 集成调用 | 10min | P0 |
| P1 | UI: 心脏跳动 + updated ago | 20min | 无 |
| P1 | UI: DOING 脉冲动画 | 15min | 无 |
| P2 | Git timeline 自动聚合 | 30min | 无 |
| P2 | OpenClaw sessions 状态同步 | 1h | OpenClaw API |
| P3 | 任务历史审计 | 2h | 文件版本化 |

---

## 6. 总结

**最小可行方案**:
1. 先实现 `POST /api/mission/write` + Main Agent 集成调用
2. UI 加 "updated ago" + 脉冲动画
3. 保持用文件系统（status.json）+ git 版本化

**收益**:
- 任务状态真正做到 "spawn 时自动更新"
- 不引入新依赖（不用 Redis/WebSocket/新 DB）
- 符合现有 Subagent Playbook 规范
