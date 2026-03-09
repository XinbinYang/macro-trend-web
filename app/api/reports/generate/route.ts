import { NextResponse } from "next/server";

interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
}

interface Report {
  id: string;
  title: string;
  date: string;
  type: string;
  coreThesis: string;
  scenario: string;
  keyPoints: string[];
  content?: string;
}

// GPT-5.4 报告生成 API
export async function POST(request: Request) {
  try {
    const { type = "weekly" } = await request.json();

    // 获取实时市场数据
    const marketRes = await fetch(`${request.headers.get("origin") || "https://macro-trend-web.vercel.app"}/api/market-data-realtime`);
    const market = await marketRes.json();

    if (!market.success) {
      return NextResponse.json({ error: "无法获取市场数据" }, { status: 500 });
    }

    // 构建提示词
    const prompt = buildReportPrompt(type, market);

    // 调用 GPT-5.4
    const gptRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "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"}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        messages: [
          {
            role: "system",
            content: "你是AI宏观作手，全球宏观对冲基金首席分析师。基于实时市场数据生成专业投资报告。报告需包含：核心观点、宏观情景判断、关键驱动因素、资产配置建议。"
          },
          { role: "user", content: prompt }
        ],
        max_tokens: 4000,
      }),
    });

    if (!gptRes.ok) {
      throw new Error(`GPT API error: ${gptRes.status}`);
    }

    const gptData = await gptRes.json();
    const reportContent = gptData.choices?.[0]?.message?.content;

    if (!reportContent) {
      throw new Error("Empty response from GPT");
    }

    // 解析报告内容
    const report = parseReportContent(reportContent, type);

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString(),
      model: "gpt-5.4",
    });

  } catch (error) {
    console.error("[Generate Report] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// 构建报告提示词
function buildReportPrompt(type: string, market: { indices: MarketQuote[]; assets: MarketQuote[]; sources: Record<string, number> }): string {
  const allAssets = [...market.indices, ...market.assets];
  
  const assetSummary = allAssets.map((a) => 
    `${a.symbol}: $${a.price.toFixed(2)} (${a.changePercent >= 0 ? "+" : ""}${a.changePercent.toFixed(2)}%) [${a.source}]`
  ).join("\n");

  const dateStr = new Date().toLocaleDateString("zh-CN");

  if (type === "weekly") {
    return `生成一份全球宏观周报，日期：${dateStr}

【实时市场数据】
${assetSummary}

【数据源分布】
${JSON.stringify(market.sources, null, 2)}

请按以下格式输出报告：

标题：[简洁有力的标题，反映本周核心主题]

核心观点：[1-2句话总结本周市场核心逻辑]

宏观情景：[通胀/通缩/金发姑娘/滞胀] - [简要说明判断依据]

关键驱动因素：
1. [因素1]
2. [因素2]  
3. [因素3]

资产配置建议：
- 股票：[建议]
- 债券：[建议]
- 商品：[建议]
- 现金：[建议]

风险提示：[1-2个需要关注的风险点]`;
  } else {
    return `生成一份季度宏观展望报告，日期：${dateStr}

【实时市场数据】
${assetSummary}

请按以下格式输出报告：

标题：[季度主题]

核心观点：[季度核心判断]

宏观情景：[判断及概率]

三大主题：
1. [主题1及分析]
2. [主题2及分析]
3. [主题3及分析]

资产配置策略：
- 战略配置（SAA）：[建议]
- 战术配置（TAA）：[建议]

关键监测指标：[需要跟踪的指标]`;
  }
}

// 解析报告内容
function parseReportContent(content: string, type: string): Report {
  const lines = content.split("\n").filter(l => l.trim());
  
  // 提取标题
  const titleLine = lines.find(l => l.includes("标题")) || lines[0];
  const title = titleLine.replace(/[标题：:]/g, "").trim() || (type === "weekly" ? "全球宏观周报" : "季度宏观展望");
  
  // 提取核心观点
  const thesisLine = lines.find(l => l.includes("核心观点"));
  const coreThesis = thesisLine ? thesisLine.replace(/[核心观点：:]/g, "").trim() : "市场处于关键转折点";
  
  // 提取情景
  const scenarioLine = lines.find(l => l.includes("宏观情景"));
  const scenarioText = scenarioLine ? scenarioLine.replace(/[宏观情景：:]/g, "").trim() : "中性";
  const scenario = scenarioText.includes("通胀") ? "inflation" : 
                   scenarioText.includes("通缩") ? "deflation" :
                   scenarioText.includes("滞胀") ? "stagflation" : "goldilocks";
  
  // 提取关键点
  const keyPoints = lines
    .filter(l => l.match(/^\d+\./) || l.match(/^[•\-]/))
    .slice(0, 4)
    .map(l => l.replace(/^\d+\.[\s•\-]*/, "").trim())
    .filter(l => l.length > 5);

  return {
    id: `report_${Date.now()}`,
    title,
    date: new Date().toISOString().split("T")[0],
    type,
    coreThesis,
    scenario,
    keyPoints: keyPoints.length > 0 ? keyPoints : ["市场数据更新", "宏观环境变化", "配置策略调整"],
    content,
  };
}
