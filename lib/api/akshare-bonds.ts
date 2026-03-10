// AkShare 中国债券期货数据获取
// 文档: https://www.akshare.xyz/

export interface BondFutureQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
}

// 获取国债期货主力合约数据
export async function getChinaBondFutures(): Promise<BondFutureQuote[]> {
  try {
    // 由于AkShare是Python库，这里使用模拟数据
    // 实际部署时需要通过Python服务调用AkShare API
    
    // 模拟主力合约数据 (基于2024年3月市场情况)
    const mockData: BondFutureQuote[] = [
      {
        symbol: "T2506",
        name: "10年期国债期货",
        price: 108.25,
        change: 0.15,
        changePercent: 0.14,
        volume: 125800,
        timestamp: new Date().toISOString(),
        source: "AkShare",
      },
      {
        symbol: "TF2506",
        name: "5年期国债期货",
        price: 106.18,
        change: 0.08,
        changePercent: 0.08,
        volume: 89200,
        timestamp: new Date().toISOString(),
        source: "AkShare",
      },
      {
        symbol: "TS2506",
        name: "2年期国债期货",
        price: 102.85,
        change: 0.03,
        changePercent: 0.03,
        volume: 45600,
        timestamp: new Date().toISOString(),
        source: "AkShare",
      },
      {
        symbol: "TL2506",
        name: "30年期国债期货",
        price: 112.45,
        change: 0.22,
        changePercent: 0.20,
        volume: 67800,
        timestamp: new Date().toISOString(),
        source: "AkShare",
      },
    ];
    
    return mockData;
  } catch (error) {
    console.error("[AkShare] Bond futures fetch error:", error);
    return [];
  }
}

// 获取国债收益率曲线
export async function getChinaBondYieldCurve(): Promise<{
  maturity: string;
  yield: number;
  change: number;
}[]> {
  try {
    // 模拟收益率曲线数据
    return [
      { maturity: "1Y", yield: 1.85, change: -0.02 },
      { maturity: "2Y", yield: 1.95, change: -0.03 },
      { maturity: "5Y", yield: 2.15, change: -0.04 },
      { maturity: "10Y", yield: 2.35, change: -0.05 },
      { maturity: "30Y", yield: 2.65, change: -0.06 },
    ];
  } catch (error) {
    console.error("[AkShare] Yield curve fetch error:", error);
    return [];
  }
}