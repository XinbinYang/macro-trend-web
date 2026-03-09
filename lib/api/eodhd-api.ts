/**
 * EODHD API - 全球金融数据
 * https://eodhd.com/
 * 免费版：20 API calls/day
 */

const EODHD_BASE_URL = "https://eodhistoricaldata.com/api";

export interface EODHDQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

// 代码映射表
const SYMBOL_MAPPING: Record<string, string> = {
  // 美股 ETF
  "SPY": "SPY.US",
  "QQQ": "QQQ.US",
  "IWM": "IWM.US",
  "TLT": "TLT.US",
  "GLD": "GLD.US",
  "HYG": "HYG.US",
  "EEM": "EEM.US",
  // 中概股 ETF
  "ASHR": "ASHR.US",
  "KWEB": "KWEB.US",
  "MCHI": "MCHI.US",
  "FXI": "FXI.US",
  // 商品期货
  "GC=F": "GC.COMM",
  "CL=F": "CL.COMM",
  "SI=F": "SI.COMM",
};

/**
 * 获取实时报价
 */
export async function getEODHDQuote(symbol: string): Promise<EODHDQuote | null> {
  const apiKey = process.env.EODHD_API_KEY || "";
  if (!apiKey) {
    console.error("[EODHD] API Key not configured");
    return null;
  }

  const eodSymbol = SYMBOL_MAPPING[symbol] || symbol;
  
  try {
    const response = await fetch(
      `${EODHD_BASE_URL}/real-time/${eodSymbol}?api_token=${apiKey}&fmt=json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`EODHD API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.close) {
      throw new Error("No data returned");
    }

    const price = data.close;
    const prevClose = data.previousClose || data.open;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      name: data.name || symbol,
      price,
      change,
      changePercent,
      volume: data.volume || 0,
      timestamp: data.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    console.error(`[EODHD] Failed to fetch ${symbol}:`, error);
    return null;
  }
}

/**
 * 批量获取报价
 */
export async function getMultipleEODHDQuotes(symbols: string[]): Promise<EODHDQuote[]> {
  const apiKey = process.env.EODHD_API_KEY || "";
  if (!apiKey) {
    console.error("[EODHD] API Key not configured");
    return [];
  }

  // EODHD 免费版限制 20 calls/day，这里串行请求避免超限
  const results: EODHDQuote[] = [];
  
  for (const symbol of symbols) {
    const quote = await getEODHDQuote(symbol);
    if (quote) {
      results.push(quote);
    }
    // 延迟 100ms 避免频率限制
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * 获取历史数据
 */
export async function getEODHDHistory(
  symbol: string,
  period: "1m" | "3m" | "6m" | "1y" = "3m"
): Promise<{ date: string; price: number; volume: number }[]> {
  const apiKey = process.env.EODHD_API_KEY || "";
  if (!apiKey) {
    console.error("[EODHD] API Key not configured");
    return [];
  }

  const eodSymbol = SYMBOL_MAPPING[symbol] || symbol;
  
  // 计算日期范围
  const endDate = new Date();
  const startDate = new Date();
  const days = period === "1m" ? 30 : period === "3m" ? 90 : period === "6m" ? 180 : 365;
  startDate.setDate(startDate.getDate() - days);
  
  const from = startDate.toISOString().split("T")[0];
  const to = endDate.toISOString().split("T")[0];

  try {
    const response = await fetch(
      `${EODHD_BASE_URL}/eod/${eodSymbol}?api_token=${apiKey}&fmt=json&from=${from}&to=${to}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`EODHD API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item: { date: string; close: number; volume: number }) => ({
      date: item.date,
      price: item.close,
      volume: item.volume,
    }));
  } catch (error) {
    console.error(`[EODHD] Failed to fetch history ${symbol}:`, error);
    return [];
  }
}

/**
 * 获取交易所列表（测试API连通性）
 */
export async function testEODHDConnection(): Promise<boolean> {
  const apiKey = process.env.EODHD_API_KEY || "";
  if (!apiKey) {
    console.error("[EODHD] API Key not configured");
    return false;
  }

  try {
    const response = await fetch(
      `${EODHD_BASE_URL}/exchanges-list/?api_token=${apiKey}&fmt=json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("[EODHD] Connection test failed:", error);
    return false;
  }
}
