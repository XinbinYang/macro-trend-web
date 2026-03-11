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

// 按区域格式化市场数据
function formatMarketData(data: { us: unknown[]; china: unknown[]; hongkong: unknown[]; global: unknown[] }): string {
  const formatAsset = (x: unknown) => {
    const a = x as { symbol?: string; price?: number; changePercent?: number; source?: string };
    const sym = a.symbol || "?";
    const price = typeof a.price === "number" ? a.price : Number(a.price);
    const chg = typeof a.changePercent === "number" ? a.changePercent : Number(a.changePercent);
    const src = a.source || "Unknown";
    return `${sym}: $${Number.isFinite(price) ? price.toFixed(2) : "-"} (${Number.isFinite(chg) ? (chg >= 0 ? "+" : "") + chg.toFixed(2) + "%" : "-"}) [${src}]`;
  };

  const sections = [
    ["美国市场", data.us || []],
    ["中国市场", data.china || []],
    ["香港市场", data.hongkong || []],
    ["全球市场", data.global || []],
  ];

  return sections
    .map(([title, assets]) => {
      const formattedAssets = (assets as unknown[]).map(formatAsset).join("\n");
      return `【${title}】\n${formattedAssets}`;
    })
    .filter(section => section.includes("\n"))  // 只显示有数据的区域
    .join("\n\n");
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
  const marketData = formatMarketData(market.data);
  const dateStr = new Date().toLocaleDateString("zh-CN");
  const disclaimer = `免责声明：本报告基于实时市场数据和AI分析生成。指示性观点仅供参考，不构成投资建议。回测表现不代表未来收益。请结合自身风险承受能力做出投资决策。\n`;

  if (type === "weekly") {
    return `生成一份全球宏观周报，日期：${dateStr}

${disclaimer}
【市场数据】(按区域分类)
${marketData}

【数据源分布】
${JSON.stringify(market.sources, null, 2)}

请按以下固定格式输出报告（保持所有章节标题）：

# 全球宏观周报

## 核心观点
[1-2句话总结本周市场核心逻辑]

## 宏观情景
[通胀/通缩/金发姑娘/滞胀] - [简要说明判断依据]

## 关键驱动因素
1. [因素1]
2. [因素2]  
3. [因素3]

## 区域市场分析

### 美国市场
[分析要点]

### 中国市场
[分析要点]

### 欧洲市场
[分析要点]

### 新兴市场
[分析要点]

## 大类资产配置建议
- 股票：[建议]
- 债券：[建议]
- 商品：[建议]
- 现金：[建议]

## 风险提示
[1-2个需要关注的风险点]`;
  } else {
    return `生成一份季度宏观展望报告，日期：${dateStr}

${disclaimer}
【市场数据】(按区域分类)
${marketData}

请按以下固定格式输出报告（保持所有章节标题）：

# 季度宏观展望报告

## 核心判断
[季度核心判断]

## 宏观情景研判
[情景判断及概率分布]

## 重点主题分析
1. [主题1及分析]
2. [主题2及分析]
3. [主题3及分析]

## 区域市场展望

### 美国市场
[展望要点]

### 中国市场
[展望要点]

### 欧洲市场
[展望要点]

### 新兴市场
[展望要点]

## 资产配置策略
### 战略配置（SAA）
[建议]

### 战术配置（TAA）
[建议]

## 关键监测指标
[列出需要重点跟踪的指标]`;
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
  sections: { title: string; content: string }[];
  keyPoints: string[];
  model: string;
  disclaimer: string;
} {
  const disclaimer = "免责声明：本报告基于实时市场数据和AI分析生成。指示性观点仅供参考，不构成投资建议。回测表现不代表未来收益。请结合自身风险承受能力做出投资决策。";
  const lines = content.split("\n").filter(l => l.trim());
  
  // 提取各个章节
  const sections: { title: string; content: string }[] = [];
  let currentSection = "";
  let currentContent: string[] = [];
  
  lines.forEach(line => {
    if (line.startsWith("##")) {
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join("\n").trim()
        });
      }
      currentSection = line.replace(/##\s*/, "").trim();
      currentContent = [];
    } else if (line.startsWith("#") && !line.startsWith("##")) {
      // 主标题，跳过
    } else {
      currentContent.push(line);
    }
  });
  
  // 添加最后一个章节
  if (currentSection) {
    sections.push({
      title: currentSection,
      content: currentContent.join("\n").trim()
    });
  }

  // 提取核心观点
  const coreSection = sections.find(s => s.title.includes("核心"));
  const coreThesis = coreSection ? coreSection.content.trim() : "市场处于关键转折点";

  // 提取宏观情景
  const scenarioSection = sections.find(s => s.title.includes("宏观情景"));
  const scenarioText = scenarioSection ? scenarioSection.content.trim() : "中性";
  const scenario = scenarioText.toLowerCase().includes("inflation") ? "inflation" :
                   scenarioText.toLowerCase().includes("deflation") ? "deflation" :
                   scenarioText.toLowerCase().includes("stagflation") ? "stagflation" : 
                   "goldilocks";

  // 提取关键点
  const keyPoints = sections
    .filter(s => s.title.includes("关键") || s.title.includes("重点"))
    .flatMap(s => s.content.split("\n")
      .filter(l => l.match(/^\d+\./) || l.match(/^[•\-]/))
      .map(l => l.replace(/^\d+\.[\s•\-]*/, "").trim())
      .filter(l => l.length > 5)
    )
    .slice(0, 4);

  return {
    id: `report_${Date.now()}`,
    title: type === "weekly" ? "全球宏观周报" : "季度宏观展望报告",
    date: new Date().toISOString().split("T")[0],
    type,
    coreThesis,
    scenario,
    sections,
    keyPoints: keyPoints.length > 0 ? keyPoints : ["市场数据更新", "宏观环境变化", "配置策略调整"],
    model,
    disclaimer,
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