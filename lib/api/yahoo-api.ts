/**
 * Yahoo Finance API - 免费实时数据
 */

export interface YahooQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

const SYMBOL_MAPPING: Record<string, string> = {
  "SPY": "SPY", "QQQ": "QQQ", "IWM": "IWM", "TLT": "TLT", "GLD": "GLD",
  "ASHR": "ASHR", "KWEB": "KWEB", "FXI": "FXI", "EWH": "EWH",
  "GC=F": "GC=F", "CL=F": "CL=F", "EEM": "EEM",
};

export async function getYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const yahooSymbol = SYMBOL_MAPPING[symbol] || symbol;
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.chart?.result?.[0]) return null;

    const meta = data.chart.result[0].meta;
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
    };
  } catch {
    return null;
  }
}

export async function getMultipleYahooQuotes(symbols: string[]): Promise<YahooQuote[]> {
  const results = await Promise.all(symbols.map(s => getYahooQuote(s)));
  return results.filter((q): q is YahooQuote => q !== null);
}

export async function testYahooConnection(): Promise<boolean> {
  const result = await getYahooQuote("SPY");
  return result !== null;
}
