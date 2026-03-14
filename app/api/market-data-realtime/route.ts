import { NextResponse } from "next/server";
import { getCnBondData } from "@/lib/api/bond-cn";
import { getUsTreasuryCurveLatest } from "@/lib/api/fred-api";
import { fetchAIndex, fetchHKIndex } from "@/lib/api/eastmoney-api";
import { fetchMarketQuoteWithFallback } from "@/lib/api/fallback-utils";
import { 
  getWatchlistByRegion, 
  type AssetConfig,
  type MarketQuote
} from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// CN rates symbols that represent yield curve points
const CN_RATES_SYMBOLS = ["CN2Y", "CN5Y", "CN10Y", "CN_CREDIT_SPREAD_5Y"];

// Build asset config from watchlist_default.json
function buildAssetConfigFromWatchlist(): AssetConfig[] {
  const assets: AssetConfig[] = [];
  
  // US assets — skip US bond symbols (US2Y/US5Y/US10Y/US30Y) because they come from
  // FRED via usTreasuryCurveQuotes further below; fetching them as Yahoo tickers would
  // either fail or return stale data.
  const US_BOND_SKIP = new Set(["US2Y", "US5Y", "US10Y", "US30Y"]);
  const usList = getWatchlistByRegion("us");
  for (const item of usList) {
    if (US_BOND_SKIP.has(item.symbol)) continue; // handled by FRED curve
    assets.push({
      symbol: item.symbol,
      name: item.name,
      region: "US",
      category: "EQUITY", // equity / commodity / fx — resolved downstream
      dataType: "REALTIME",
      dataSource: item.source,
    });
  }
  
  // CN assets (indices + rates)
  const cnList = getWatchlistByRegion("cn");
  for (const item of cnList) {
    const isCnRate = CN_RATES_SYMBOLS.includes(item.symbol);
    assets.push({
      symbol: item.symbol,
      name: item.name,
      region: "CN",
      category: isCnRate ? "BOND" : "EQUITY",
      dataType: "EOD",
      dataSource: item.source,
    });
  }
  
  // HK assets
  const hkList = getWatchlistByRegion("hk");
  for (const item of hkList) {
    assets.push({
      symbol: item.symbol,
      name: item.name,
      region: "HK",
      category: "EQUITY",
      dataType: "EOD",
      dataSource: item.source,
    });
  }
  
  // Global assets
  const globalList = getWatchlistByRegion("global");
  for (const item of globalList) {
    const isFX = item.symbol.includes("=") || item.symbol === "DX=F" || item.symbol === "EURUSD";
    assets.push({
      symbol: item.symbol,
      name: item.name,
      region: "GLOBAL",
      category: isFX ? "FX" : "COMMODITY",
      dataType: "REALTIME",
      dataSource: item.source,
    });
  }
  
  return assets;
}

// CN/HK EOD indices (for backward compatibility)
const AKSHARE_EOD_DATA: Array<{ symbol: string; name: string; region: "CN" | "HK"; source: string }> = [
  { symbol: "000300.SH", name: "沪深300", region: "CN", source: "indicative" },
  { symbol: "000905.SH", name: "中证500", region: "CN", source: "indicative" },
  { symbol: "000016.SH", name: "上证50", region: "CN", source: "indicative" },
  { symbol: "399006.SZ", name: "创业板指", region: "CN", source: "indicative" },
  { symbol: "000688.SH", name: "科创50", region: "CN", source: "indicative" },
  { symbol: "HSI", name: "恒生指数", region: "HK", source: "indicative" },
];

export async function GET() {
  try {
    // Build asset config from watchlist config
    const ASSET_CONFIG = buildAssetConfigFromWatchlist();

    // Use fallback chain to fetch data
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

        const isCNIndex = /^\d{6}\.(SH|SZ)$/i.test(d.symbol);
        const isHSI = d.symbol === "HSI";

        if (isHSI) {
          try {
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
          } catch {
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

        try {
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
        } catch {
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
      })
    );

    // Get CN bond data + US Treasury Curve
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


    // CN Yield Curve Points (from getCnBondData L2 yieldCurve.maturities)
    const cnYieldCurveQuotes: MarketQuote[] = [];
    if (cnBondData.yieldCurve?.maturities) {
      const maturities = cnBondData.yieldCurve.maturities as Record<string, number>;
      
      // CN2Y, CN5Y, CN10Y - 中债收益率曲线点位
      if (maturities["2Y"] !== undefined) {
        cnYieldCurveQuotes.push({
          symbol: "CN2Y",
          name: "中债2年收益率",
          price: maturities["2Y"],
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: cnBondData.yieldCurve.date || new Date().toISOString(),
          source: cnBondData.source || "Chinabond/AkShare",
          region: "CN",
          category: "BOND",
          dataType: "EOD" as const,
          dataSource: cnBondData.status === "LIVE" ? "LIVE" : cnBondData.status === "DELAYED" ? "DELAYED" : "OFF",
          isIndicative: cnBondData.status !== "LIVE",
        });
      }
      
      if (maturities["5Y"] !== undefined) {
        cnYieldCurveQuotes.push({
          symbol: "CN5Y",
          name: "中债5年收益率",
          price: maturities["5Y"],
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: cnBondData.yieldCurve.date || new Date().toISOString(),
          source: cnBondData.source || "Chinabond/AkShare",
          region: "CN",
          category: "BOND",
          dataType: "EOD" as const,
          dataSource: cnBondData.status === "LIVE" ? "LIVE" : cnBondData.status === "DELAYED" ? "DELAYED" : "OFF",
          isIndicative: cnBondData.status !== "LIVE",
        });
      }
      
      if (maturities["10Y"] !== undefined) {
        cnYieldCurveQuotes.push({
          symbol: "CN10Y",
          name: "中债10年收益率",
          price: maturities["10Y"],
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: cnBondData.yieldCurve.date || new Date().toISOString(),
          source: cnBondData.source || "Chinabond/AkShare",
          region: "CN",
          category: "BOND",
          dataType: "EOD" as const,
          dataSource: cnBondData.status === "LIVE" ? "LIVE" : cnBondData.status === "DELAYED" ? "DELAYED" : "OFF",
          isIndicative: cnBondData.status !== "LIVE",
        });
      }
      
      // CN_CREDIT_SPREAD_5Y - AAA中短票5Y-国债5Y利差
      // TODO(next): implement production-grade compute from ChinaMoney (避免 Python + 大 dataframe，提升速度/稳定性)
      cnYieldCurveQuotes.push({
        symbol: "CN_CREDIT_SPREAD_5Y",
        name: "AAA中短票-国债5Y利差",
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        timestamp: new Date().toISOString(),
        source: "OFF (pending ChinaMoney-derived compute)",
        region: "CN",
        category: "BOND",
        dataType: "EOD" as const,
        dataSource: "OFF",
        isIndicative: true,
        note: "待接入：Chinamoney CYCC82B(AAA) - CYCC000(国债) @5Y",
      });
    } else {
      // Yield curve unavailable - add OFF quotes for watchlist symbols
      const watchlistRates = ["CN2Y", "CN5Y", "CN10Y", "CN_CREDIT_SPREAD_5Y"];
      const rateNames: Record<string, string> = {
        "CN2Y": "中债2年收益率",
        "CN5Y": "中债5年收益率",
        "CN10Y": "中债10年收益率",
        "CN_CREDIT_SPREAD_5Y": "AAA中短票-国债5Y利差",
      };
      
      for (const symbol of watchlistRates) {
        cnYieldCurveQuotes.push({
          symbol,
          name: rateNames[symbol],
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: new Date().toISOString(),
          source: symbol === "CN_CREDIT_SPREAD_5Y" ? "OFF (AAA曲线数据源暂不可用)" : "OFF",
          region: "CN",
          category: "BOND",
          dataType: "EOD" as const,
          dataSource: "OFF",
          isIndicative: true,
          note: symbol === "CN_CREDIT_SPREAD_5Y" ? "AAA中短票5Y收益率数据暂不可获取，无法计算利差" : undefined,
        });
      }
    }

    const allQuotes = [...enrichedQuotes, ...akshareQuotes, ...bondFutureQuotes, ...usTreasuryCurveQuotes, ...cnYieldCurveQuotes];

    // Filter duplicates by symbol
    const uniqueQuotesMap = new Map<string, MarketQuote>();
    for (const q of allQuotes) {
      if (!uniqueQuotesMap.has(q.symbol) || (uniqueQuotesMap.get(q.symbol)?.price === 0 && q.price > 0)) {
        uniqueQuotesMap.set(q.symbol, q);
      }
    }
    const uniqueQuotes = Array.from(uniqueQuotesMap.values());

    // Classify by region
    const usAssets = uniqueQuotes.filter(q => q.region === "US");
    const cnAssets = uniqueQuotes.filter(q => q.region === "CN");
    const hkAssets = uniqueQuotes.filter(q => q.region === "HK");
    const globalAssets = uniqueQuotes.filter(q => q.region === "GLOBAL");

    // Stats
    const sources = uniqueQuotes.reduce((acc, q) => {
      const key = q.isIndicative ? "indicative" : "supabase";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dataTypes = uniqueQuotes.reduce((acc, q) => {
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
          // canonical keys
          us: usAssets,
          cn: cnAssets,
          hk: hkAssets,
          global: globalAssets,
          // backward-compatible aliases
          china: cnAssets,
          hongkong: hkAssets,
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
        configSource: "config/watchlist_default.json",
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
