/**
 * Historical Market Data API
 * Yahoo Finance 历史数据获取
 */

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// 获取 Yahoo Finance 历史数据
export async function getHistoricalData(
  symbol: string,
  period: "1mo" | "3mo" | "6mo" | "1y" = "3mo"
): Promise<HistoricalData[]> {
  try {
    // Yahoo Finance 图表 API
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      throw new Error(`Yahoo API error: ${res.status}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      throw new Error("Invalid data structure");
    }

    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    const { open, high, low, close, volume } = quote;

    // 合并数据
    const historical: HistoricalData[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (close[i] !== null) {
        historical.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          open: open[i] || close[i],
          high: high[i] || close[i],
          low: low[i] || close[i],
          close: close[i],
          volume: volume[i] || 0,
        });
      }
    }

    return historical;
  } catch (error) {
    console.error(`[Historical] ${symbol} failed:`, error);
    return [];
  }
}

// 简化版：只获取收盘价用于图表
export async function getChartData(
  symbol: string,
  days: number = 30
): Promise<{ date: string; price: number }[]> {
  const period = days <= 30 ? "1mo" : days <= 90 ? "3mo" : "6mo";
  const data = await getHistoricalData(symbol, period);
  
  // 取最近 N 天
  return data.slice(-days).map(d => ({
    date: d.date,
    price: d.close,
  }));
}
