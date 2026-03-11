import { NextResponse } from "next/server";

// 检测 IP 是否来自中国大陆
function isChinaIP(ip: string): boolean {
  // 简化的中国 IP 段检测（实际生产应使用 GeoIP 库）
  // 常见中国 IP 段
  const chinaRanges = [
    /^1\./, /^14\./, /^27\./, /^36\./, /^39\./, /^42\./, /^43\./, /^49\./,
    /^58\./, /^59\./, /^60\./, /^61\./, /^101\./, /^103\./, /^106\./, /^110\./,
    /^111\./, /^112\./, /^113\./, /^114\./, /^115\./, /^116\./, /^117\./, /^118\./,
    /^119\./, /^120\./, /^121\./, /^122\./, /^123\./, /^124\./, /^125\./, /^126\./,
    /^139\./, /^140\./, /^144\./, /^150\./, /^153\./, /^157\./, /^159\./, /^162\./,
    /^163\./, /^164\./, /^166\./, /^167\./, /^168\./, /^171\./, /^175\./, /^180\./,
    /^182\./, /^183\./, /^202\./, /^203\./, /^210\./, /^211\./, /^218\./, /^219\./,
    /^220\./, /^221\./, /^222\./, /^223\./,
  ];
  return chinaRanges.some(range => range.test(ip));
}

// 获取客户端 IP
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  
  // 从 URL 参数获取（用于测试）
  const url = new URL(request.url);
  const testIP = url.searchParams.get("test_ip");
  if (testIP) return testIP;
  
  return "unknown";
}

// DeepSeek 模型调用
async function callDeepSeek(prompt: string): Promise<{ content: string; model: string }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!apiKey) {
    throw new Error("DeepSeek API Key not configured");
  }

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是AI宏观作手，全球宏观对冲基金首席分析师。基于实时市场数据生成专业投资报告。"
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content,
    model: "deepseek-chat",
  };
}

// GPT-5.4 模型调用
async function callGPT54(prompt: string): Promise<{ content: string; model: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenRouter API Key not configured");
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.4",
      messages: [
        {
          role: "system",
          content: "你是AI宏观作手，全球宏观对冲基金首席分析师。基于实时市场数据生成专业投资报告。"
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    throw new Error(`GPT-5.4 API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content,
    model: "gpt-5.4",
  };
}

// 构建提示词
function buildPrompt(
  type: string,
  market: {
    sources: Record<string, number>;
    timestamp: string;
    data: { us: unknown[]; china: unknown[]; hongkong: unknown[]; global: unknown[] };
    disclaimer?: unknown;
  }
): string {
  const allAssets = [
    ...((market?.data?.us as unknown[]) || []),
    ...((market?.data?.china as unknown[]) || []),
    ...((market?.data?.hongkong as unknown[]) || []),
    ...((market?.data?.global as unknown[]) || []),
  ];

  const assetSummary = allAssets
    .map((x) => {
      const a = x as { symbol?: string; price?: number; changePercent?: number; source?: string };
      const sym = a.symbol || "?";
      const price = typeof a.price === "number" ? a.price : Number(a.price);
      const chg = typeof a.changePercent === "number" ? a.changePercent : Number(a.changePercent);
      const src = a.source || "Unknown";
      return `${sym}: $${Number.isFinite(price) ? price.toFixed(2) : "-"} (${Number.isFinite(chg) ? (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%" : "-"}) [${src}]`;
    })
    .join("\n");

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
function parseReportContent(content: string, type: string, model: string): {
  id: string;
  title: string;
  date: string;
  type: string;
  coreThesis: string;
  scenario: string;
  keyPoints: string[];
  content: string;
  model: string;
} {
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
    model,
  };
}

export async function POST(request: Request) {
  try {
    const { type = "weekly", isChina: clientIsChina } = await request.json();
    
    // 获取客户端 IP（备用）
    const clientIP = getClientIP(request);
    
    // 优先使用客户端检测的位置，否则使用 IP 检测
    const isChina = clientIsChina !== undefined ? clientIsChina : isChinaIP(clientIP);
    
    console.log(`[Report] Client IP: ${clientIP}, Is China: ${isChina}`);

    // 获取实时市场数据
    const origin = request.headers.get("origin") || "https://macro-trend-web.vercel.app";
    const marketRes = await fetch(`${origin}/api/market-data-realtime`);
    const market = await marketRes.json();

    if (!market.success) {
      return NextResponse.json({ error: "无法获取市场数据" }, { status: 500 });
    }

    // 构建提示词
    const prompt = buildPrompt(type, market);

    // 根据 IP 选择模型
    let result;
    let usedModel;
    
    if (isChina) {
      // 国内 IP：优先使用 DeepSeek
      try {
        console.log("[Report] Using DeepSeek for China IP");
        result = await callDeepSeek(prompt);
        usedModel = "deepseek-chat";
      } catch (error) {
        console.error("[Report] DeepSeek failed, fallback to GPT-5.4:", error);
        result = await callGPT54(prompt);
        usedModel = "gpt-5.4 (fallback)";
      }
    } else {
      // 海外 IP：优先使用 GPT-5.4
      try {
        console.log("[Report] Using GPT-5.4 for overseas IP");
        result = await callGPT54(prompt);
        usedModel = "gpt-5.4";
      } catch (error) {
        console.error("[Report] GPT-5.4 failed, fallback to DeepSeek:", error);
        result = await callDeepSeek(prompt);
        usedModel = "deepseek-chat (fallback)";
      }
    }

    // 解析报告
    const report = parseReportContent(result.content, type, usedModel);

    return NextResponse.json({
      success: true,
      report,
      generatedAt: new Date().toISOString(),
      model: usedModel,
      clientIP,
      isChina,
    });

  } catch (error) {
    console.error("[Generate Report] Error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
