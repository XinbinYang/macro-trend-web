// East Money API Client (A-Share Market Data)
// Free real-time and historical data for Chinese stocks
// No API key required

// A-share ETF list
export const ASHARE_ETFS = {
  CSI300: { code: "510300", name: "沪深300ETF", symbol: "ASHR" },
  CSI500: { code: "510500", name: "中证500ETF", symbol: "CSI500" },
  CHINEXT: { code: "159915", name: "创业板ETF", symbol: "CHINEXT" },
  STAR50: { code: "588000", name: "科创50ETF", symbol: "STAR50" },
  SSE50: { code: "510050", name: "上证50ETF", symbol: "SSE50" },
};

interface EastMoneyQuote {
  f43: number;  // Current price * 100
  f44: number;  // Highest price * 100
  f45: number;  // Lowest price * 100
  f46: number;  // Open price * 100
  f47: number;  // Volume
  f48: number;  // Turnover
  f57: string;  // Stock code
  f58: string;  // Stock name
  f60: number;  // Previous close * 100
  f169: number; // Change
  f170: number; // Change percent * 100
}

// Convert East Money code format
function toEastMoneyCode(code: string): string {
  if (code.startsWith("6")) {
    return `1.${code}`; // Shanghai
  } else if (code.startsWith("0") || code.startsWith("3")) {
    return `0.${code}`; // Shenzhen
  }
  return code;
}

// Fetch real-time quote for A-share ETF
export async function fetchAShareQuote(code: string): Promise<{
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
} | null> {
  try {
    const emCode = toEastMoneyCode(code);
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${emCode}&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f169,f170`;
    
    const response = await fetch(url, {
      next: { revalidate: 30 }, // Cache 30 seconds
    });

    if (!response.ok) {
      console.error(`[EastMoney] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.data) {
      console.error(`[EastMoney] No data for ${code}`);
      return null;
    }

    const quote: EastMoneyQuote = data.data;
    
    return {
      symbol: quote.f57,
      name: quote.f58,
      price: quote.f43 / 100,
      change: quote.f169 / 100,
      changePercent: quote.f170 / 100,
      volume: quote.f47,
      high: quote.f44 / 100,
      low: quote.f45 / 100,
      open: quote.f46 / 100,
      previousClose: quote.f60 / 100,
    };
  } catch (error) {
    console.error(`[EastMoney] Fetch error for ${code}:`, error);
    return null;
  }
}

// Batch fetch multiple A-share ETFs
export async function fetchAShareBatch(): Promise<Array<{
  symbol: string;
  name: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
}> | null> {
  try {
    const codes = Object.values(ASHARE_ETFS).map(etf => etf.code);
    
    const results = await Promise.all(
      codes.map(code => fetchAShareQuote(code))
    );

    const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);
    
    if (validResults.length === 0) {
      return null;
    }

    return validResults.map(quote => ({
      symbol: quote.symbol,
      name: quote.name,
      region: "asia",
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
    }));
  } catch (error) {
    console.error("[EastMoney] Batch fetch error:", error);
    return null;
  }
}

// Fetch A-share market index
export async function fetchAIndex(indexCode: string): Promise<{
  name: string;
  price: number;
  change: number;
  changePercent: number;
} | null> {
  // Index codes: 000001 (上证), 399001 (深证), 399006 (创业板)
  const emCode = indexCode.startsWith("000") ? `1.${indexCode}` : `0.${indexCode}`;
  
  try {
    const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${emCode}&fields=f43,f58,f60,f169,f170`;
    
    const response = await fetch(url, {
      next: { revalidate: 30 },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.data) return null;

    return {
      name: data.data.f58,
      price: data.data.f43 / 100,
      change: data.data.f169 / 100,
      changePercent: data.data.f170 / 100,
    };
  } catch (error) {
    console.error(`[EastMoney] Index fetch error:`, error);
    return null;
  }
}

// Mock data for A-shares (fallback)
const mockAShareData = [
  { symbol: "510300", name: "沪深300ETF", region: "asia", price: 3.856, change: -0.012, changePercent: -0.31 },
  { symbol: "510500", name: "中证500ETF", region: "asia", price: 5.234, change: 0.028, changePercent: 0.54 },
  { symbol: "159915", name: "创业板ETF", region: "asia", price: 1.892, change: -0.008, changePercent: -0.42 },
  { symbol: "588000", name: "科创50ETF", region: "asia", price: 0.985, change: 0.015, changePercent: 1.55 },
  { symbol: "510050", name: "上证50ETF", region: "asia", price: 2.456, change: -0.008, changePercent: -0.33 },
];

// Fetch with fallback
export async function fetchAShareWithFallback(): Promise<Array<{
  symbol: string;
  name: string;
  region: string;
  price: number;
  change: number;
  changePercent: number;
}>> {
  const realData = await fetchAShareBatch();
  if (realData && realData.length > 0) {
    console.log("[EastMoney] Using real A-share data");
    return realData;
  }
  
  console.log("[EastMoney] Using mock A-share data");
  return mockAShareData;
}

// Build A-share summary
export async function buildAShareSummary(): Promise<string> {
  const data = await fetchAShareWithFallback();
  
  const lines: string[] = [
    "## A股市场行情",
    `更新时间: ${new Date().toLocaleString("zh-CN")}`,
    "",
    "### 主要ETF",
  ];

  for (const item of data) {
    const emoji = item.changePercent > 0 ? "📈" : item.changePercent < 0 ? "📉" : "➖";
    lines.push(`${emoji} ${item.name} (${item.symbol}): ${item.price.toFixed(3)} ${item.changePercent > 0 ? "+" : ""}${item.changePercent.toFixed(2)}%`);
  }

  return lines.join("\n");
}
