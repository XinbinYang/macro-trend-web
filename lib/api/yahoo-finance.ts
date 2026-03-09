/**
 * Yahoo Finance API - 美股实时数据
 * 免费，无需 API Key
 */

const YAHOO_API_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

interface YahooQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  timestamp: number;
}

/**
 * 获取股票实时报价
 */
export async function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  try {
    const response = await fetch(
      `${YAHOO_API_BASE}/${symbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error("No data returned");
    }

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;

    return {
      symbol,
      price,
      change,
      changePercent,
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`[Yahoo Finance] Failed to fetch ${symbol}:`, error);
    return null;
  }
}

/**
 * 获取历史价格数据
 */
export async function getYahooHistory(
  symbol: string,
  period: "1mo" | "3mo" | "6mo" | "1y" = "3mo"
): Promise<{ date: string; price: number; volume: number }[]> {
  try {
    const response = await fetch(
      `${YAHOO_API_BASE}/${symbol}?interval=1d&range=${period}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return [];
    }

    const timestamps = result.timestamp || [];
    const prices = result.indicators?.quote?.[0]?.close || [];
    const volumes = result.indicators?.quote?.[0]?.volume || [];

    return timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      price: prices[i] || 0,
      volume: volumes[i] || 0,
    }));
  } catch (error) {
    console.error(`[Yahoo Finance] Failed to fetch history ${symbol}:`, error);
    return [];
  }
}

/**
 * 批量获取多个股票报价
 */
export async function getMultipleQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const results = await Promise.all(
    symbols.map((symbol) => getYahooQuote(symbol))
  );
  return results.filter((q): q is YahooQuote => q !== null);
}

// 常用美股代码映射
export const US_STOCK_SYMBOLS = {
  SPY: "SPY",      // 标普500 ETF
  QQQ: "QQQ",      // 纳斯达克100 ETF
  IWM: "IWM",      // 罗素2000 ETF
  TLT: "TLT",      // 20年+美债
  IEF: "IEF",      // 7-10年美债
  GLD: "GLD",      // 黄金ETF
  USO: "USO",      // 原油ETF
  VIX: "^VIX",     // 波动率指数
  DXY: "DX-Y.NYB", // 美元指数
};
