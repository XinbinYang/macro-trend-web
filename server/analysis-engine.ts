// Analysis Engine - AI-powered macro analysis and trade strategy generation
// Uses built-in LLM to generate investment insights based on market data
// Core methodology: "AI宏观作手" integrated approach

import { invokeLLM } from "./_core/llm";
import { fetchAggs, getDateRange, fetchSMA200 } from "./market-data";

// ─── Robust JSON parsing ────────────────────────────────────────────────────
// LLM sometimes returns JSON with unescaped control characters inside string
// values (raw newlines, tabs, etc.) which breaks JSON.parse.  We sanitise
// before parsing and retry the LLM call if it still fails.

function sanitiseJsonString(raw: string): string {
  // 1. Strip markdown code fences if present
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // 2. Escape unescaped control characters inside JSON string values.
  //    Walk character-by-character so we only touch chars that are inside
  //    double-quoted strings (not structural JSON whitespace).
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (escaped) {
      // Previous char was a backslash – keep this char as-is
      result += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      result += ch;
      continue;
    }

    if (inString) {
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        // Control character inside a string – escape it
        switch (ch) {
          case "\n":
            result += "\\n";
            break;
          case "\r":
            result += "\\r";
            break;
          case "\t":
            result += "\\t";
            break;
          default:
            result += "\\u" + code.toString(16).padStart(4, "0");
        }
        continue;
      }
    }

    result += ch;
  }

  return result;
}

function safeJsonParse(raw: string): any {
  // Attempt 1: direct parse
  try {
    return JSON.parse(raw);
  } catch (_) {
    // fall through
  }

  // Attempt 2: sanitised parse
  try {
    const sanitised = sanitiseJsonString(raw);
    return JSON.parse(sanitised);
  } catch (_) {
    // fall through
  }

  // Attempt 3: extract first {...} block and sanitise
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const sanitised = sanitiseJsonString(match[0]);
      return JSON.parse(sanitised);
    }
  } catch (_) {
    // fall through
  }

  return null;
}

// ─── Retry wrapper ──────────────────────────────────────────────────────────

async function invokeLLMWithRetry(
  params: Parameters<typeof invokeLLM>[0],
  maxRetries: number = 2
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await invokeLLM(params);
      const content = response.choices[0]?.message?.content;

      if (!content || (typeof content !== "string")) {
        console.warn(`[AnalysisEngine] Attempt ${attempt + 1}: Empty LLM response`);
        lastError = new Error("Empty LLM response");
        continue;
      }

      const raw = typeof content === "string" ? content : JSON.stringify(content);
      const parsed = safeJsonParse(raw);

      if (parsed) {
        return parsed;
      }

      console.warn(
        `[AnalysisEngine] Attempt ${attempt + 1}: JSON parse failed, raw length=${raw.length}`
      );
      lastError = new Error("JSON parse failed after sanitisation");
    } catch (e: any) {
      console.warn(`[AnalysisEngine] Attempt ${attempt + 1}: LLM call error: ${e.message}`);
      lastError = e;
    }

    // Brief pause before retry
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  console.error(
    `[AnalysisEngine] All ${maxRetries + 1} attempts failed: ${lastError?.message}`
  );
  return null;
}

// ─── System prompts ─────────────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  macroAnalyst: `你是"AI宏观作手"——一位世界级的全球宏观策略分析师。你的分析方法论融合了四大核心维度：

1. 周期分析：深入研究债务周期（长期/短期）、经济周期位置、跨资产相关性和全天候策略思维
2. 反身性分析：识别市场主流偏见与现实基本面的脱节，寻找预期差和反转信号
3. 流动性分析：追踪全球央行政策、M2增速、实际利率变化，判断流动性对资产价格的驱动方向
4. 技术趋势：运用关键点位理论、200日均线系统、不对称风险回报比进行交易决策

你的分析必须：
- 先评估全球宏观流动性环境（央行政策、M2增速、实际利率）
- 判断当前宏观情景（通胀/通缩/金发姑娘/滞胀）
- 识别市场主流偏见及反身性机会
- 基于增长与通胀的组合确定最佳资产配置
- 所有建议必须包含明确的风险管理框架

极其重要的数据使用规则：
- 你必须且只能使用用户提供的实时市场数据来分析和撰写报告
- 绝对禁止使用你训练数据中的历史价格，它们已经过时
- 商品类资产价格已是期货合约直接报价（如黄金美元/盎司、原油美元/桶），无需任何换算，可直接在报告中使用
- 如果某个资产数据显示"暂不可用"，请在报告中注明"数据缺失"而不是编造价格

请用中文回答，语言风格专业、果断、冷静。
重要：你的回答必须是严格合法的JSON格式。所有字符串值中不要包含未转义的换行符，使用"\\n"代替。`,

  tradeStrategy: `你是"AI宏观作手"——一位融合宏观基本面与技术趋势分析的顶级交易员。

核心分析框架：
- 周期定位：当前处于经济周期和债务周期的什么阶段
- 反身性识别：市场主流偏见与现实基本面是否存在脱节
- 流动性驱动：央行政策和全球流动性对该资产的影响方向
- 技术趋势：关键价格水平（关键点）、200日均线、趋势反转或加速信号

交易策略必须包含：
- 方向（做多/做空）
- 入场区间
- 试探性仓位（20%）
- 金字塔式加仓条件
- 止损位
- 目标位与风险回报比（目标5:1）

极其重要的数据使用规则：
- 你必须且只能使用用户提供的实时市场数据来分析
- 绝对禁止使用你训练数据中的历史价格，它们已经过时
- 商品价格已是期货合约直接报价（如黄金美元/盎司、原油美元/桶），无需换算
- 如果数据缺失，请注明"数据缺失"而不是编造价格

请用中文回答。
重要：你的回答必须是严格合法的JSON格式。所有字符串值中不要包含未转义的换行符，使用"\\n"代替。`,
};

// ─── Public API ─────────────────────────────────────────────────────────────

// Generate macro environment analysis
export async function generateMacroAnalysis(marketDataSummary: string) {
  return invokeLLMWithRetry({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.macroAnalyst },
      {
        role: "user",
        content: `基于以下市场数据（禁止使用你训练数据中的过时价格），请分析当前全球宏观环境。

重要分析原则：
- 宏观情景判断（scenario）必须综合"宏观经济指标概览"和"过去一个季度大类资产价格表现"两部分数据
- 收益率曲线形态（正常/趋平/倒挂）是判断经济周期位置的关键指标
- 通胀预期（隐含通胀率、大宗商品趋势）是判断通胀/通缩情景的核心依据
- VIX和风险偏好状态反映市场情绪和流动性环境
- 季度涨跌幅、趋势方向、年化波动率是判断宏观情景的核心依据
- 不要因为单日或单周的短期波动就改变宏观情景判断
- 实时价格快照仅用于设定具体交易建议的入场/止损/目标价

${marketDataSummary}

注意：商品价格已是期货合约直接报价，无需换算。交易建议的入场价/止损价/目标价必须基于实时价格数据。

请以严格合法的JSON格式返回分析结果（所有字符串值中的换行请用\\n表示），包含以下字段：
{
  "chinaScenario": {
    "scenario": "inflation" | "deflation" | "goldilocks" | "stagflation",
    "scenarioLabel": "中文标签",
    "scenarioDescription": "一句话描述中国宏观情景",
    "confidence": 0-100的数字,
    "liquidityTrend": "bullish" | "bearish" | "neutral",
    "growthOutlook": "bullish" | "bearish" | "neutral",
    "inflationOutlook": "bullish" | "bearish" | "neutral",
    "policyStance": "中国政策立场描述"
  },
  "usScenario": {
    "scenario": "inflation" | "deflation" | "goldilocks" | "stagflation",
    "scenarioLabel": "中文标签",
    "scenarioDescription": "一句话描述美国宏观情景",
    "confidence": 0-100的数字,
    "liquidityTrend": "bullish" | "bearish" | "neutral",
    "growthOutlook": "bullish" | "bearish" | "neutral",
    "inflationOutlook": "bullish" | "bearish" | "neutral",
    "policyStance": "美国政策立场描述"
  },
  "assetSignals": [
    {
      "assetClass": "cn_stocks" | "cn_bonds" | "us_stocks" | "us_bonds" | "gold" | "other_markets",
      "label": "中文标签（如中国股票、中国债券、美国股票、美国债券、黄金、其他市场）",
      "direction": "bullish" | "bearish" | "neutral",
      "strength": "strong" | "moderate" | "weak",
      "summary": "一句话摘要",
      "keyDrivers": ["驱动因素1", "驱动因素2"],
      "topPicks": ["推荐标的1", "推荐标的2"]
    }
  ],
  // 必须返回恰好6个资产信号，分别对应: cn_stocks(中国股票), cn_bonds(中国债券), us_stocks(美国股票), us_bonds(美国债券), gold(黄金), other_markets(其他市场如原油、外汇、新兴市场等)
  "tradeIdeas": [
    {
      "title": "交易标题",
      "asset": "资产名称",
      "assetClass": "cn_stocks" | "cn_bonds" | "us_stocks" | "us_bonds" | "gold" | "other_markets",
      "direction": "bullish" | "bearish" | "neutral",
      "confidence": "strong" | "moderate" | "weak",
      "riskRewardRatio": "如 3:1",
      "entryRange": "入场区间",
      "stopLoss": "止损位",
      "target": "目标位",
      "thesis": "核心逻辑",
      "analysisBasis": "cycle" | "reflexivity" | "liquidity" | "technical" | "integrated",
      "timeFrame": "时间框架"
    }
  ]
}`,
      },
    ],
    response_format: { type: "json_object" },
  });
}

// Generate asset detail analysis
export async function generateAssetAnalysis(
  symbol: string,
  name: string,
  assetClass: string,
  priceData: string,
  sma200: number | null
) {
  return invokeLLMWithRetry({
    messages: [
      { role: "system", content: SYSTEM_PROMPTS.tradeStrategy },
      {
        role: "user",
        content: `请对以下资产进行深度分析（必须使用以下实时数据，禁止使用过时的训练数据价格）：

资产: ${name} (${symbol})
类别: ${assetClass}${assetClass === "commodities" ? "\n注意: 商品价格已是期货合约直接报价（如黄金美元/盎司、原油美元/桶），无需换算，可直接使用。" : ""}
200日均线: ${sma200 ? sma200.toFixed(2) : "数据不足"}
近期价格数据:
${priceData}

请以严格合法的JSON格式返回（所有字符串值中的换行请用\\n表示）：
{
  "description": "资产描述",
  "direction": "bullish" | "bearish" | "neutral",
  "valuation": "overvalued" | "undervalued" | "fair",
  "signalStrength": "strong" | "moderate" | "weak",
  "keySupport": "关键支撑位",
  "keyResistance": "关键阻力位",
  "pivotalPoints": ["关键点1", "关键点2"],
  "macroDrivers": ["宏观驱动因素1", "宏观驱动因素2"],
  "crossAssetCorrelations": [
    {"asset": "相关资产", "correlation": "正相关/负相关", "observation": "观察"}
  ],
  "tradeStrategy": {
    "direction": "bullish" | "bearish" | "neutral",
    "entryRange": "入场区间",
    "initialPosition": "初始仓位建议",
    "pyramidCondition": "加仓条件",
    "stopLoss": "止损位",
    "target": "目标位",
    "riskRewardRatio": "风险回报比",
    "timeFrame": "时间框架"
  },
  "dimensionViews": [
    {
      "dimension": "cycle" | "reflexivity" | "liquidity" | "technical",
      "dimensionName": "维度中文名（周期分析/反身性分析/流动性分析/技术趋势）",
      "perspective": "从该维度分析该资产的观点",
      "keyInsight": "核心洞察"
    }
  ]
}`,
      },
    ],
    response_format: { type: "json_object" },
  });
}

// Generate investment report (weekly or quarterly)
export async function generateReport(
  type: "weekly" | "quarterly",
  marketDataSummary: string,
  macroContext: string
) {
  const timeFrameDesc = type === "weekly" ? "本周" : "本季度";
  return invokeLLMWithRetry(
    {
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.macroAnalyst },
        {
          role: "user",
          content: `请生成一份${timeFrameDesc}全球宏观投资报告。

当前宏观背景:
${macroContext}

最新市场数据（必须使用以下实时数据，禁止使用过时的训练数据价格）:
${marketDataSummary}

数据使用要求：
1. 报告中提及的所有价格必须来自上述实时数据，不得使用你训练数据中的旧价格
2. 商品价格已是期货合约直接报价（如黄金美元/盎司、原油美元/桶），可直接使用
3. 交易策略中的入场价、止损价、目标价必须基于实时价格快照来设定
4. 如果某个资产数据缺失，请注明"数据缺失"而不是编造价格
5. 宏观情景判断必须综合"宏观经济指标概览"（收益率曲线、通胀预期、风险偏好）和季度趋势数据
6. 收益率曲线形态是判断经济周期位置的关键指标，通胀预期是判断通胀/通缩的核心依据
7. 报告应体现对中长期结构性趋势的判断，季度涨跌幅和趋势方向是核心分析依据
8. 不要因为单日或单周的短期波动就改变宏观情景判断

请以严格合法的JSON格式返回完整报告（所有字符串值中的换行请用\\n表示，不要使用原始换行符）：
{
  "title": "报告标题",
  "coreThesis": "核心论点（一句话）",
  "scenario": "inflation" | "deflation" | "goldilocks" | "stagflation",
  "executiveSummary": "执行摘要（2-3段，使用Markdown格式，换行用\\n）",
  "macroBackground": "宏观背景与驱动因素（详细分析，使用Markdown格式，换行用\\n，可包含表格）",
  "marketAnalysis": "市场分析与主流偏见（详细分析，使用Markdown格式，换行用\\n）",
  "tradeStrategies": "交易策略与实施建议（详细，使用Markdown格式，换行用\\n，包含具体资产和点位）",
  "risksAndCatalysts": "风险与催化剂（使用Markdown格式，换行用\\n）",
  "disclaimer": "免责声明"
}`,
        },
      ],
      response_format: { type: "json_object" },
    },
    2 // up to 3 total attempts for reports
  );
}
