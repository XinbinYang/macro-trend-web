# Content Status Label Spec (LIVE / AI / SAMPLE / MOCK)

目标：把站内所有“真数据/真AI/示例占位/Mock兜底”在 **UI 上显式标注**，让用户一眼验真；同时保持移动端 **高密度但不拥挤**。

## 1) 状态定义（必须可见）

| Status | 含义 | 可否用于决策 | 失败时行为 |
|---|---|---|---|
| **LIVE** | 来自可追溯的数据源/可审计计算（可为 Indicative 展示层或真值层，但必须说明口径） | ✅ | 若数据缺失显示 `—` + 缺失提示，不得用写死数值冒充 |
| **AI** | 来自真实大模型（OpenRouter/DeepSeek）。必须真调用，失败即 OFF | ⚠️（解释/观点） | **Fail closed**：显示不可用 + `AI: OFF`，不得本地模板冒充 |
| **SAMPLE** | 写死示例/占位范本（用于联调/演示） | ❌ | 默认弱化/折叠；禁止与 LIVE 混在同一视觉层级 |
| **MOCK** | 系统兜底（无 key/上游挂了）返回的 mock/fallback 数据；属于 Indicative | ⚠️（仅展示） | 必须带来源说明（如 `FRED(mock)`） |

> 口径约束：任何非真值层数据（Yahoo/Eastmoney/FRED/mock/sample）一律视为 **Indicative**，需要统一免责声明。

## 2) 视觉规范（移动端优先）

### 2.1 Badge 位置
- **卡片级**：右上角（与 `AI: ON/OFF` 同级）
- **细项级（evidence 小字）**：行尾或下一行，用更淡的颜色，避免抢主标题
- **图表级**：标题右侧（例如 `Source: Yahoo (Indicative)`）

### 2.2 Tailwind 颜色建议（暗黑主题友好）
- LIVE：`text-emerald-300 border-emerald-500/30 bg-emerald-500/10`
- AI：`text-cyan-300 border-cyan-500/30 bg-cyan-500/10`
- SAMPLE：`text-amber-300 border-amber-500/30 bg-amber-500/10`
- MOCK：`text-slate-300 border-slate-600 bg-slate-800/50`

### 2.3 尺寸
- 统一小号：`text-[10px] px-1.5 py-0.5 rounded font-mono leading-none`
- 允许更小：`text-[9px]`（仅 evidence 行尾）

## 3) 组件模式（推荐直接复用）

### 3.1 `StatusBadge`（建议新增组件）
```tsx
type Status = "LIVE" | "AI" | "SAMPLE" | "MOCK";

export function StatusBadge({ status, note }: { status: Status; note?: string }) {
  const cls =
    status === "LIVE"
      ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
      : status === "AI"
      ? "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
      : status === "SAMPLE"
      ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
      : "text-slate-300 border-slate-600 bg-slate-800/50";

  return (
    <span
      className={`inline-flex items-center gap-1 border ${cls} text-[10px] px-1.5 py-0.5 rounded font-mono leading-none`}
      title={note}
    >
      {status}{note ? `·${note}` : ""}
    </span>
  );
}
```

### 3.2 与 `AI: ON/OFF` 并排
- 建议顺序：`StatusBadge(LIVE/MOCK/SAMPLE)` 在左，`AI: ON/OFF` 在右
- 若该模块本身是 AI 产物：`StatusBadge(AI)` 可替代 `AI: ON/OFF`，但**仍建议保留 ON/OFF**（更直观）

## 4) 交互策略（降低“示例冒充”风险）

### 4.1 SAMPLE 默认折叠
- 首页/仪表盘：SAMPLE 的 evidence 行默认隐藏在“展开详情”中
- 资产页：SAMPLE 区块直接显示 `SAMPLE` badge + “数据未接入”提示

### 4.2 缺数据就显示 `—`
- 禁止用老的写死数字占位（最容易误导）

### 4.3 一处统一免责声明
- 页面级：Header/页脚一行：`Indicative display only. Not for backtest/signal.`
- API 级：返回 `disclaimer` 字段供复用

## 5) 落地优先级（建议）
- **P0**：任何会被当成“实时/事实”的写死数值与事件（仪表盘 evidence、报告详情 mockReports、market-data sample）
- **P1**：教育/academy 文字、settings placeholder（影响小）
- **P2**：样式/文案微调
