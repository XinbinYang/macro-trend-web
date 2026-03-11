import { NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/api/market-data";
import { getChinaBondFutures, getChinaBondYieldCurve } from "@/lib/api/akshare-bonds";

// 资产分类配置
interface AssetConfig {
  symbol: string;
  name: string;
  region: "US" | "CN" | "HK" | "GLOBAL";
  category: "EQUITY" | "BOND" | "COMMODITY" | "FX";
  dataType: "REALTIME" | "DELAYED" | "EOD";
  dataSource: string;
}

const ASSET_CONFIG: AssetConfig[] = [
  // 美股
  { symbol: "SPY", name: "标普500", region: "US", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "QQQ", name: "纳斯达克100", region: "US", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "DIA", name: "道指30", region: "US", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "TLT", name: "美债20Y", region: "US", category: "BOND", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  
  // 中国资产 (美股ETF)
  { symbol: "ASHR", name: "沪深300", region: "CN", category: "EQUITY", dataType: "DELAYED", dataSource: "Yahoo(美股ETF)" },
  { symbol: "KWEB", name: "中概互联", region: "CN", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "FXI", name: "富时中国50", region: "CN", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  
  // 港股
  { symbol: "EWH", name: "恒生指数", region: "HK", category: "EQUITY", dataType: "DELAYED", dataSource: "Yahoo(美股ETF)" },
  
  // 商品
  { symbol: "GLD", name: "黄金", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "GC=F", name: "黄金期货", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "CL=F", name: "WTI原油期货", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "DJP", name: "道琼斯商品指数总回报ETN (DJP)", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  
  // 新兴市场
  { symbol: "EEM", name: "新兴市场", region: "GLOBAL", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
];

// AkShare收盘数据 - A股/港股指数
// NOTE: 这里目前是“示例/占位数据”。用于页面展示与联调。
// 等接入真实 AkShare 拉取后再替换；在此之前必须明确标注为 sample。
const AKSHARE_EOD_DATA = [
  { symbol: "000300.SH", name: "沪深300", price: 4602.63, change: 12.5, changePercent: 0.27, region: "CN", source: "AkShare(sample)" },
  { symbol: "000905.SH", name: "中证500", price: 5847.21, change: -23.4, changePercent: -0.40, region: "CN", source: "AkShare(sample)" },
  { symbol: "HSI", name: "恒生指数", price: 25249.48, change: 156.3, changePercent: 0.62, region: "HK", source: "AkShare(sample)" },
];

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: string;
  region: "US" | "CN" | "HK" | "GLOBAL";
  category: "EQUITY" | "BOND" | "COMMODITY" | "FX";
  dataType: "REALTIME" | "DELAYED" | "EOD";
  dataSource: string;
}

export async function GET() {
  try {
    // 获取实时数据
    const symbols = ASSET_CONFIG.map(a => a.symbol);
    const quotes = await getMultipleQuotes(symbols);
    
    // 合并配置信息
    const enrichedQuotes: MarketQuote[] = quotes.map(q => {
      const config = ASSET_CONFIG.find(a => a.symbol === q.symbol);
      return {
        ...q,
        name: config?.name || q.name,
        region: config?.region || "GLOBAL",
        category: config?.category || "EQUITY",
        dataType: config?.dataType || "REALTIME",
        dataSource: config?.dataSource || q.source,
      };
    });

    // 添加AkShare收盘数据 - A股指数
    const akshareQuotes: MarketQuote[] = AKSHARE_EOD_DATA.map(d => ({
      symbol: d.symbol,
      name: d.name,
      price: d.price,
      change: d.change,
      changePercent: d.changePercent,
      volume: 0,
      timestamp: new Date().toISOString(),
      source: d.source,
      region: d.region as "CN" | "HK",
      category: "EQUITY",
      dataType: "EOD",
      dataSource: "AkShare(sample)",
    }));

    // 获取中国国债期货/收益率曲线数据（当前为 sample，占位联调）
    const [bondFutures, chinaYieldCurve] = await Promise.all([
      getChinaBondFutures(),
      getChinaBondYieldCurve(),
    ]);
    const bondFutureQuotes: MarketQuote[] = bondFutures.map(bf => ({
      symbol: bf.symbol,
      name: bf.name,
      price: bf.price,
      change: bf.change,
      changePercent: bf.changePercent,
      volume: bf.volume,
      timestamp: bf.timestamp,
      source: bf.source,
      region: "CN",
      category: "BOND",
      dataType: "EOD",
      dataSource: "AkShare(sample)",
    }));

    const allQuotes = [...enrichedQuotes, ...akshareQuotes, ...bondFutureQuotes];

    // 按地区分类
    const usAssets = allQuotes.filter(q => q.region === "US");
    const cnAssets = allQuotes.filter(q => q.region === "CN");
    const hkAssets = allQuotes.filter(q => q.region === "HK");
    const globalAssets = allQuotes.filter(q => q.region === "GLOBAL");

    // 统计数据源
    const sources = allQuotes.reduce((acc, q) => {
      acc[q.dataSource] = (acc[q.dataSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 数据类型统计
    const dataTypes = allQuotes.reduce((acc, q) => {
      acc[q.dataType] = (acc[q.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      sources,
      dataTypes,
      timestamp: new Date().toISOString(),
      data: {
        us: usAssets,
        china: cnAssets,
        hongkong: hkAssets,
        global: globalAssets,
      },
      bond: {
        china: {
          futures: bondFutureQuotes,
          yieldCurve: chinaYieldCurve,
          source: "AkShare(sample)",
        },
      },
      disclaimer: {
        indicative: "Real-time/展示层数据仅供参考(Indicative)，不用于回测真值与策略净值。",
        truth: "策略回测/净值/信号必须来自 Master + 官方结算镜像(Spot/Settle 双轨)。",
      },
    });
  } catch (error) {
    console.error("[API] Market data error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}