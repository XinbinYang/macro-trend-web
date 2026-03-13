import { NextResponse } from "next/server";
import { getCnBondData } from "@/lib/api/bond-cn";
import { getUsTreasuryCurveLatest } from "@/lib/api/fred-api";
import { fetchAIndex, fetchHKIndex } from "@/lib/api/eastmoney-api";
import { fetchMarketQuoteWithFallback } from "@/lib/api/fallback-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  
  // 商品
  { symbol: "GC=F", name: "COMEX黄金期货", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "CL=F", name: "WTI原油期货", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  { symbol: "DJP", name: "道琼斯商品指数总回报ETN (DJP)", region: "GLOBAL", category: "COMMODITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
  
  // 新兴市场
  { symbol: "EEM", name: "新兴市场", region: "GLOBAL", category: "EQUITY", dataType: "REALTIME", dataSource: "Yahoo/Polygon" },
];

// AkShare收盘数据 - A股/港股指数
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
  isIndicative: boolean;
}

export async function GET() {
  try {
    // 使用 fallback 链路获取数据
    const enrichedQuotes = await Promise.all(
      ASSET_CONFIG.map(async (config) => {
        const fallbackResult = await fetchMarketQuoteWithFallback(
          config.symbol,
          config.region,
          config.category
        );
        
        return {
          symbol: config.symbol,
          name: config.name,
          price: fallbackResult.price || 0,
          change: fallbackResult.change || 0,
          changePercent: fallbackResult.changePercent || 0,
          volume: 0,
          timestamp: fallbackResult.timestamp,
          source: fallbackResult.source,
          region: config.region,
          category: config.category,
          dataType: config.dataType,
          dataSource: fallbackResult.price !== null ? (fallbackResult.isIndicative ? "indicative" : "LIVE") : "OFF",
          isIndicative: fallbackResult.isIndicative,
        };
      })
    );

    // CN/HK 宽基指数：优先 Supabase -> Eastmoney fallback
    const akshareQuotes: MarketQuote[] = await Promise.all(
      AKSHARE_EOD_DATA.map(async (d) => {
        const fallbackResult = await fetchMarketQuoteWithFallback(
          d.symbol,
          d.region,
          "EQUITY"
        );
        
        if (fallbackResult.price !== null) {
          return {
            symbol: d.symbol,
            name: fallbackResult.name,
            price: fallbackResult.price,
            change: fallbackResult.change || 0,
            changePercent: fallbackResult.changePercent || 0,
            volume: 0,
            timestamp: fallbackResult.timestamp,
            source: fallbackResult.source,
            region: d.region,
            category: "EQUITY",
            dataType: "EOD" as const,
            dataSource: fallbackResult.isIndicative ? "indicative" : "LIVE",
            isIndicative: fallbackResult.isIndicative,
          };
        }

        // Try Eastmoney directly as fallback
        const isCNIndex = /^\d{6}\.(SH|SZ)$/i.test(d.symbol);
        const isHSI = d.symbol === "HSI";

        if (isHSI) {
          const q = await fetchHKIndex("100.HSI");
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
              dataType: "EOD" as const,
              dataSource: "OFF",
              isIndicative: true,
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
            dataType: "EOD" as const,
            dataSource: "indicative",
            isIndicative: true,
          };
        }

        const code = isCNIndex ? d.symbol.split(".")[0] : null;
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
            dataType: "EOD" as const,
            dataSource: "OFF",
            isIndicative: true,
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
            dataType: "EOD" as const,
            dataSource: "OFF",
            isIndicative: true,
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
          dataType: "EOD" as const,
          dataSource: "indicative",
          isIndicative: true,
        };
      })
    );

    // 获取中国债券稳态数据 + US Treasury Curve
    const [cnBondData, usTreasuryCurve] = await Promise.all([
      getCnBondData({ level: "L2", realtime: false, fallback: true }),
      getUsTreasuryCurveLatest(),
    ]);
    const bondFutureQuotes: MarketQuote[] = cnBondData.futures.map(bf => ({
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
      dataType: bf.dataType === "REALTIME" ? "REALTIME" as const : "EOD" as const,
      dataSource: bf.status === "LIVE" ? "LIVE" : bf.status === "DELAYED" ? "LIVE" : bf.status === "STALE" ? "MOCK" : "SAMPLE",
      isIndicative: true,
    }));

    // US Treasury curve
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
      dataType: "EOD" as const,
      dataSource: p.source?.includes("mock") ? "MOCK" : "LIVE",
      isIndicative: !p.source?.includes("FRED"),
    }));

    const allQuotes = [...enrichedQuotes, ...akshareQuotes, ...bondFutureQuotes, ...usTreasuryCurveQuotes];

    // 按地区分类
    const usAssets = allQuotes.filter(q => q.region === "US");
    const cnAssets = allQuotes.filter(q => q.region === "CN");
    const hkAssets = allQuotes.filter(q => q.region === "HK");
    const globalAssets = allQuotes.filter(q => q.region === "GLOBAL");

    // 统计数据源
    const sources = allQuotes.reduce((acc, q) => {
      const key = q.isIndicative ? "indicative" : "supabase";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 数据类型统计
    const dataTypes = allQuotes.reduce((acc, q) => {
      acc[q.dataType] = (acc[q.dataType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json(
      {
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
            yieldCurve: cnBondData.yieldCurve
              ? Object.entries(cnBondData.yieldCurve.maturities).map(([maturity, yield_]) => ({
                  maturity,
                  yield: yield_ as number,
                  change: 0,
                }))
              : [],
            source: cnBondData.source,
            status: cnBondData.status,
          },
        },
        disclaimer: {
          indicative: "Real-time/展示层数据仅供参考(Indicative)，不用于回测真值与策略净值。",
          truth: "策略回测/净值/信号必须来自 Master + 官方结算镜像(Spot/Settle 双轨)。",
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[API] Market data error:", error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
