import { NextResponse } from "next/server";
import { getMultipleQuotes } from "@/lib/api/market-data";
import { getChinaBondFutures, getChinaBondYieldCurve } from "@/lib/api/akshare-bonds";
import { getUsTreasuryCurveLatest } from "@/lib/api/fred-api";
import { fetchAIndex } from "@/lib/api/eastmoney-api";

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
  // 美股（指数口径，避免 ETF proxy 重复）
  { symbol: "^GSPC", name: "标普500", region: "US", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo" },
  { symbol: "^NDX", name: "纳斯达克100", region: "US", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo" },
  { symbol: "^DJI", name: "道指30", region: "US", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo" },
  
  // 中国宽基指数（展示层优先用国内指数收盘口径；避免同一资产出现“ETF+指数”双口径冲突）
  // NOTE: 如需额外增加宽基（上证50/创业板/科创50等），后续走国内口径再补。

  
  // 港股
  // NOTE: 港股指数用 AkShare(sample) 的 HSI（收盘口径）展示，避免 EWH(HK ETF proxy) 与 HSI(指数) 双口径重复。
  
  // 商品
  // NOTE: 黄金仅保留一个口径（优先期货/更贴近可交易品种）；避免 GLD 与 GC=F 重复。
  { symbol: "GC=F", name: "COMEX黄金期货", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "CL=F", name: "WTI原油期货", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "DJP", name: "道琼斯商品指数总回报ETN (DJP)", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  
  // 新兴市场
  { symbol: "EEM", name: "新兴市场", region: "GLOBAL", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
];

// AkShare收盘数据 - A股/港股指数
// NOTE: 历史上这里放过写死 sample，占位联调用。为避免误导：
// - 不再返回写死数值
// - 未接入时显示 OFF/—
// 等接入真实 AkShare/官方口径数据后再改回 LIVE。
const AKSHARE_EOD_DATA: Array<{ symbol: string; name: string; region: "CN" | "HK"; source: string }> = [
  // 中国主要宽基指数（OFF：等待可审计数据源）
  { symbol: "000300.SH", name: "沪深300", region: "CN", source: "OFF" },
  { symbol: "000905.SH", name: "中证500", region: "CN", source: "OFF" },
  { symbol: "000016.SH", name: "上证50", region: "CN", source: "OFF" },
  { symbol: "399006.SZ", name: "创业板指", region: "CN", source: "OFF" },
  { symbol: "000688.SH", name: "科创50", region: "CN", source: "OFF" },

  // 香港（OFF：等待可审计数据源）
  { symbol: "HSI", name: "恒生指数", region: "HK", source: "OFF" },
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

    // CN/HK 宽基指数：优先接 Eastmoney（免 key，Indicative）；失败则 OFF
    const akshareQuotes: MarketQuote[] = await Promise.all(
      AKSHARE_EOD_DATA.map(async (d) => {
        // Eastmoney 仅支持数字 code；HSI 暂无对应，先 OFF
        const code = /^\d{6}\.(SH|SZ)$/i.test(d.symbol) ? d.symbol.split(".")[0] : null;
        if (!code) {
          return {
            symbol: d.symbol,
            name: d.name,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            timestamp: new Date().toISOString(),
            source: "OFF",
            region: d.region,
            category: "EQUITY",
            dataType: "EOD",
            dataSource: "OFF",
          };
        }

        const q = await fetchAIndex(code);
        if (!q) {
          return {
            symbol: d.symbol,
            name: d.name,
            price: 0,
            change: 0,
            changePercent: 0,
            volume: 0,
            timestamp: new Date().toISOString(),
            source: "OFF",
            region: d.region,
            category: "EQUITY",
            dataType: "EOD",
            dataSource: "OFF",
          };
        }

        return {
          symbol: d.symbol,
          name: q.name || d.name,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          volume: 0,
          timestamp: new Date().toISOString(),
          source: "Eastmoney",
          region: d.region,
          category: "EQUITY",
          dataType: "EOD",
          dataSource: "LIVE", // 展示层可用，但不是回测真值
        };
      })
    );

    // 获取中国国债期货/收益率曲线数据（当前为 sample，占位联调）
    // + US Treasury Curve（展示层，FRED；无 key 则自动 mock）
    const [bondFutures, chinaYieldCurve, usTreasuryCurve] = await Promise.all([
      getChinaBondFutures(),
      getChinaBondYieldCurve(),
      getUsTreasuryCurveLatest(),
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
      dataSource: bf.source?.includes("mock") ? "MOCK" : "SAMPLE",
    }));

    // US Treasury curve -> convert to MarketQuote (BOND / US / EOD)
    const usTreasuryCurveQuotes: MarketQuote[] = usTreasuryCurve.map(p => ({
      symbol: `US${p.maturity}`,
      name: `美债收益率 ${p.maturity}`,
      price: p.yield,
      change: p.change,
      changePercent: 0,
      volume: 0,
      timestamp: new Date().toISOString(),
      source: p.source,
      region: "US",
      category: "BOND",
      dataType: "EOD",
      dataSource: p.source?.includes("mock") ? "MOCK" : "LIVE",
    }));

    const allQuotes = [...enrichedQuotes, ...akshareQuotes, ...bondFutureQuotes, ...usTreasuryCurveQuotes];

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
          status: "SAMPLE",
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