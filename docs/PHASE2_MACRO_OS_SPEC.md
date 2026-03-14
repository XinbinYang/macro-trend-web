# Phase 2 — Macro OS: 四维度可解释规格文档

## 🎯 目标
将 `/api/macro-state` 从"数字+标签"升级为"可解释的决策辅助输出"，并在宏观页前端展示。

---

## 📐 后端规格（`app/api/macro-state/route.ts`）

### 新增字段（在现有 `DimOutput` 的 `us` / `cn` 子对象中新增）

```typescript
type DimSide = {
  // 现有字段（保留不动）
  value: number | null;
  unit: Unit;
  asOf: string | null;
  state: State;        // "strong" | "weak" | "neutral" | "unknown"
  trend: Trend;        // 现有字段，当前为 "unknown"，Phase 2 要真正计算
  note: string;
  stale: boolean;
  source: string;

  // ✅ Phase 2 新增字段
  summary: string;     // 一句话结论，供前端直接展示
  evidence: string[];  // 证据列表（2-3条），数据支撑
  confidence: number;  // 0-100，本维度置信度
  trendLabel: string;  // 可读趋势标签："↑ 走强" | "↓ 走弱" | "→ 横盘" | "? 数据缺失"
};
```

### `summary` 生成规则（按维度）

#### Growth（增长）
- US strong: `"美国经济扩张（ISM服务业PMI {value}，高于荣枯线52）"`
- US neutral: `"美国经济温和（ISM服务业PMI {value}，接近荣枯线）"`
- US weak: `"美国经济收缩压力（ISM服务业PMI {value}，低于荣枯线48）"`
- CN strong: `"中国经济扩张（制造业PMI {value}，高于荣枯线50.5）"`
- CN neutral: `"中国经济温和（制造业PMI {value}）"`
- CN weak: `"中国经济偏弱（制造业PMI {value}，低于50）"`
- value为null: `"数据暂缺，无法判断"`

#### Inflation（通胀）
- US strong (value <= 2.5%): `"美国通胀受控（Core PCE {value}%，接近Fed目标2%）"`
- US neutral (2.5% < value < 4.0%): `"美国通胀偏高（Core PCE {value}%，高于Fed目标2%）"`
- US weak (value >= 4.0%): `"美国通胀严峻（Core PCE {value}%，显著超出Fed目标）"`
- CN: 基于CPI YoY，阈值 0% / 2.5%
  - strong (value >= 2.5%): `"中国通胀温和回升（CPI同比{value}%）"`
  - neutral (0% < value < 2.5%): `"中国通胀低迷（CPI同比{value}%，低于目标3%）"`
  - weak (value <= 0%): `"中国面临通缩压力（CPI同比{value}%）"`

#### Policy（政策）
- US strong (sofr <= 3.0%): `"美联储政策宽松（SOFR {value}%，处于中性区间以下）"`
- US neutral (3.0% < sofr < 5.5%): `"美联储政策中性偏紧（SOFR {value}%）"`
- US weak (sofr >= 5.5%): `"美联储政策高度限制性（SOFR {value}%，处于高位）"`
- CN: 基于LPR 1Y，阈值 3.0% / 4.0%
  - strong: `"中国货币政策宽松（LPR 1Y {value}%）"`
  - neutral: `"中国货币政策中性（LPR 1Y {value}%）"`
  - weak: `"中国货币政策偏紧（LPR 1Y {value}%）"`

#### Liquidity（流动性）
- US: 基于US 10Y Yield，阈值 4.0% / 4.7%
  - strong (yield <= 4.0%): `"美债利率温和（10Y {value}%），流动性宽裕"`
  - neutral: `"美债利率中性（10Y {value}%），流动性中性"`
  - weak (yield >= 4.7%): `"美债利率高企（10Y {value}%），流动性偏紧"`
- CN: 基于M2 YoY，阈值 7.5% / 9.5%
  - strong: `"中国流动性充裕（M2同比{value}%）"`
  - neutral: `"中国流动性中性（M2同比{value}%）"`
  - weak: `"中国流动性偏紧（M2同比{value}%）"`

### `evidence` 生成规则
每个维度输出 2-3 条证据字符串，包含主指标 + 辅助指标数值：

示例（inflation US）:
```json
[
  "Core PCE YoY: 3.06%（Fed目标: 2.0%，偏差: +1.06%）",
  "CPI YoY: 2.8%（辅助参考）",
  "数据日期: 2026-02-28"
]
```

### `confidence` 计算规则
- 基础分：80
- 数据 stale（>7天）: -15
- value 为 null: -25
- 辅助指标均为 null: -10
- 最终 clamp 到 [10, 95]

### `trendLabel` 计算规则（当前 trend 字段恒为 "unknown"，Phase 2 真正计算）
- 用辅助指标或多期数据计算趋势：
  - 若无历史数据（当前情况）：根据 state 和阈值距离推断
    - state=strong 且 value 远离 weak 阈值：`"↑ 走强"`
    - state=weak 且 value 接近 weak 阈值：`"↓ 走弱"`
    - 其他：`"→ 横盘"`
  - null 值：`"? 数据缺失"`

---

## 🖥️ 前端规格（`app/macro/page.tsx`）

### 当前展示（保留）
- 维度名称、数值、state 标签（strong/neutral/weak）

### Phase 2 新增展示（在现有卡片内扩展，不新增页面）

**每个维度卡片（US/CN 各一列）新增：**

1. **Summary 行**（醒目文字）
   ```
   通胀偏高，但趋势放缓，置信度：中高
   ```

2. **Evidence 折叠区**（默认折叠，点击展开）
   ```
   📋 证据
   • Core PCE YoY: 3.06%（Fed目标: 2.0%）
   • CPI YoY: 2.8%（辅助参考）
   • 数据日期: 2026-02-28
   ```

3. **Confidence Bar**（进度条，0-100）
   ```
   置信度: ████████░░ 78%
   ```

4. **Trend Badge**（小标签）
   ```
   [↓ 走弱]  [→ 横盘]  [↑ 走强]  [? 数据缺失]
   ```

### 视觉风格要求
- 延续现有暗黑工业风（bg-slate-900, border-slate-800）
- Summary 文字：text-slate-200，font-medium
- Evidence 折叠：用 `<details><summary>` 或 Accordion 组件
- Confidence Bar：绿色(>70) / 黄色(40-70) / 红色(<40)
- Trend Badge：绿色(走强) / 红色(走弱) / 灰色(横盘/缺失)

---

## ✅ 验收标准

1. `/api/macro-state?no_cache=1` 返回的每个 dimension.us / dimension.cn 包含：`summary`（非空字符串）、`evidence`（数组，至少1条）、`confidence`（0-100数字）、`trendLabel`（4选1字符串）
2. 宏观页 `/macro` 正确展示 summary + evidence折叠 + confidence bar + trend badge
3. `npm run build` 无 TypeScript 错误
4. 线上 Vercel 部署后，宏观页 4 个维度 × 2 个地区 = 8 个卡片，全部有 summary 显示（即使是"数据暂缺"）
5. 不破坏现有 regime/score/confidence 逻辑

---

## 📦 交付范围

| 文件 | 变更 |
|------|------|
| `app/api/macro-state/route.ts` | 新增 summary/evidence/confidence/trendLabel 计算逻辑 |
| `app/macro/page.tsx` | 新增 Summary/Evidence/Confidence/Trend 展示组件 |
| TypeScript types | 扩展 DimSide 类型定义 |

**不需要改动的文件：**
- `config/macro_framework_v1.json`（阈值已够用）
- `lib/config/*.ts`（indicator mapping 已OK）
- 任何 Supabase schema（无需新列）
- 任何 cron（无需新数据）
