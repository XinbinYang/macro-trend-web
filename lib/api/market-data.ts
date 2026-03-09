/**
 * Multi-source Market Data API
 * Yahoo Finance + Polygon.io 并行获取
 */

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
}

// 代码映射
const SYMBOL_MAP: Record<string, { yahoo: string; polygon: string }> = {
  "SPY": { yahoo: "SPY", polygon: "SPY" },
  "QQQ": { yahoo: "QQQ", polygon: "QQQ" },
  "IWM": { yahoo: "IWM", polygon: "IWM" },
  "TLT": { yahoo: "TLT", polygon: "TLT" },
  "GLD": { yahoo: "GLD", polygon: "GLD" },
  "ASHR": { yahoo: "ASHR", polygon: "ASHR" },
  "KWEB": { yahoo: "KWEB", polygon: "KWEB" },
  "FXI": { yahoo: "FXI", polygon: "FXI" },
  "EEM": { yahoo: "EEM", polygon: "EEM" },
  "EWH": { yahoo: "EWH", polygon: "EWH" },
  "GC=F": { yahoo: "GC=F", polygon: "GC" },
  "CL=F": { yahoo: "CL=F", polygon: "CL" },
};

// Yahoo Finance 获取
async function getYahooQuote(symbol: string): Promise<MarketQuote | null> {
  const mapped = SYMBOL_MAP[symbol]?.yahoo || symbol;
  
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${mapped}?interval=1d&range=1d`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;

    if (!meta) return null;

    const price = meta.regularMarketPrice || meta.previousClose;
    const prevClose = meta.previousClose || meta.chartPreviousClose || price;

    return {
      symbol,
      name: meta.shortName || meta.longName || symbol,
      price,
      change: price - prevClose,
      changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
      volume: meta.regularMarketVolume || 0,
      timestamp: new Date().toISOString(),
      source: "Yahoo",
    };
  } catch (error) {
    console.error(`[Yahoo] ${symbol} failed:`, error);
    return null;
  }
}

// Polygon.io 获取
async function getPolygonQuote(symbol: string): Promise<MarketQuote | null> {
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    console.warn("[Polygon] API Key not configured");
    return null;
  }

  const mapped = SYMBOL_MAP[symbol]?.polygon || symbol;

  try {
    const res = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${mapped}/prev?apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const result = data.results?.[0];

    if (!result) return null;

    const price = result.c;
    const prevClose = result.o;

    return {
      symbol,
      name: symbol,
      price,
      change: price - prevClose,
      changePercent: prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0,
      volume: result.v || 0,
      timestamp: new Date(result.t).toISOString(),
      source: "Polygon",
    };
  } catch (error) {
    console.error(`[Polygon] ${symbol} failed:`, error);
    return null;
  }
}

// 并行获取，优先使用 Polygon，失败回退到 Yahoo
export async function getQuote(symbol: string): Promise<MarketQuote | null> {
  // 并行请求两个数据源
  const [polygonResult, yahooResult] = await Promise.all([
    getPolygonQuote(symbol),
    getYahooQuote(symbol),
  ]);

  // 优先使用 Polygon（更实时），否则用 Yahoo
  if (polygonResult) {
    console.log(`[Data] ${symbol} from Polygon`);
    return polygonResult;
  }
  
  if (yahooResult) {
    console.log(`[Data] ${symbol} from Yahoo`);
    return yahooResult;
  }

  console.error(`[Data] ${symbol} failed from all sources`);
  return null;
}

// 批量获取
export async function getMultipleQuotes(symbols: string[]): Promise<MarketQuote[]> {
  const results = await Promise.all(symbols.map(s => getQuote(s)));
  return results.filter((q): q is MarketQuote => q !== null);
}
