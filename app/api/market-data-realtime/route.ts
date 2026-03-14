import { NextResponse } from "next/server";
import { getCnBondData } from "@/lib/api/bond-cn";
import { getUsTreasuryCurveLatest } from "@/lib/api/fred-api";
import { fetchAIndex, fetchHKIndex } from "@/lib/api/eastmoney-api";
import { fetchMarketQuoteWithFallback } from "@/lib/api/fallback-utils";
import { getSupabaseClient } from "@/lib/supabase-client";
import { SYMBOLS } from "@/lib/config/data-dictionary";
import {
  getWatchlistByRegion,
  type AssetConfig,
  type MarketQuote,
} from "@/lib/config";

// FX pair mapping: Yahoo symbol -> Supabase FX pair column
// DXY (美元指数): Yahoo = "DX=F", Supabase pair = "USDX.FX"
const FX_PAIRS: Record<string, string> = {
  [SYMBOLS.FX_DXY]: "USDX.FX",
  "EURUSD": "EURUSD.FX",
  "USDJPY": "USDJPY.FX",
};

export const dynamic = "force-dynamic";

// In-memory cache (per serverless instance)
const CACHE_TTL_MS = 55_000; // 55 seconds
let _cacheStore: { data: unknown; ts: number } | null = null;

// CN rates symbols that represent yield curve points
const CN_RATES_SYMBOLS: string[] = [
  SYMBOLS.CN_2Y,
  SYMBOLS.CN_5Y,
  SYMBOLS.CN_10Y,
  SYMBOLS.CN_CREDIT_SPREAD_5Y,
];

// Build asset config from watchlist_default.json
function buildAssetConfigFromWatchlist(): AssetConfig[] {
  const assets: AssetConfig[] = [];
  
  // US assets — skip US bond symbols (US2Y/US5Y/US10Y/US30Y) because they come from
  // FRED via usTreasuryCurveQuotes further below; fetching them as Yahoo tickers would
  // either fail or return stale data.
  const US_BOND_SKIP = new Set<string>([
    SYMBOLS.US_2Y,
    SYMBOLS.US_5Y,
    SYMBOLS.US_10Y,
    SYMBOLS.US_30Y,
  ]);
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
    const isFX =
      item.symbol.includes("=") ||
      item.symbol === SYMBOLS.FX_DXY ||
      item.symbol === "EURUSD";
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
  { symbol: SYMBOLS.CN_HS300, name: "沪深300", region: "CN", source: "indicative" },
  { symbol: SYMBOLS.CN_500, name: "中证500", region: "CN", source: "indicative" },
  { symbol: "000016.SH", name: "上证50", region: "CN", source: "indicative" },
  { symbol: SYMBOLS.CN_CY500, name: "创业板指", region: "CN", source: "indicative" },
  { symbol: SYMBOLS.CN_KC50, name: "科创50", region: "CN", source: "indicative" },
  { symbol: SYMBOLS.HK_HSI, name: "恒生指数", region: "HK", source: "indicative" },
];

export async function GET(request: Request) {
  // Check for no_cache query parameter
  const { searchParams } = new URL(request.url);
  const noCache = searchParams.get("no_cache") === "1";

  // In-memory cache check
  if (_cacheStore && Date.now() - _cacheStore.ts < CACHE_TTL_MS && !noCache) {
    return NextResponse.json(_cacheStore.data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Cache": "HIT"
      },
    });
  }

  try {
    // Build asset config from watchlist config
    const ASSET_CONFIG = buildAssetConfigFromWatchlist();

    // Speed knobs (safe defaults): cap concurrency + hard-timeout each quote fetch.
    const MAX_CONCURRENCY = Number(process.env.MARKET_QUOTE_CONCURRENCY || 6);
    const PER_QUOTE_TIMEOUT_MS = Number(process.env.MARKET_QUOTE_TIMEOUT_MS || 4500);

    const withTimeout = async <T,>(p: Promise<T>, ms: number): Promise<T> => {
      return await Promise.race([
        p,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
        ),
      ]);
    };

    const mapLimit = async <T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> => {
      const out: R[] = new Array(items.length);
      let idx = 0;

      const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
        while (true) {
          const i = idx++;
          if (i >= items.length) break;
          out[i] = await fn(items[i], i);
        }
      });

      await Promise.all(workers);
      return out;
    };

    const enrichedQuotes = await mapLimit(ASSET_CONFIG, MAX_CONCURRENCY, async (config) => {
      try {
        // For FX symbols, map Yahoo symbol to Supabase pair field
        // e.g., "DX=F" -> "USDX.FX" for querying assets_fx table
        const querySymbol = config.category === "FX" && FX_PAIRS[config.symbol]
          ? FX_PAIRS[config.symbol]
          : config.symbol;
        
        const fallbackResult = await withTimeout(
          fetchMarketQuoteWithFallback(querySymbol, config.region, config.category),
          PER_QUOTE_TIMEOUT_MS
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
          dataSource:
            fallbackResult.price !== null
              ? fallbackResult.isIndicative
                ? "indicative"
                : "LIVE"
              : "OFF",
          isIndicative: fallbackResult.isIndicative,
        };
      } catch (e) {
        return {
          symbol: config.symbol,
          name: config.name,
          price: 0,
          change: 0,
          changePercent: 0,
          volume: 0,
          timestamp: new Date().toISOString(),
          source: `OFF (${(e as Error).message})`,
          region: config.region,
          category: config.category,
          dataType: config.dataType,
          dataSource: "OFF",
          isIndicative: true,
          note: `quote fetch failed: ${(e as Error).message}`,
        };
      }
    });

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
        const isHSI = d.symbol === SYMBOLS.HK_HSI;

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


    // CN Yield Curve Points (EOD): prefer Supabase macro_cn daily columns (日更入库), fallback to getCnBondData.
    const cnYieldCurveQuotes: MarketQuote[] = [];

    // 1) Supabase daily (authoritative for EOD curve/spread)
    try {
      const sb = getSupabaseClient();
      const { data, error } = await sb
        .from("macro_cn")
        .select("date,yield_2y,yield_5y,yield_10y,credit_spread_5y,rates_source,rates_updated_at")
        .order("date", { ascending: false })
        .limit(1);

      if (!error && data && data[0]) {
        const row = data[0] as {
          date: string | null;
          yield_2y: number | string | null;
          yield_5y: number | string | null;
          yield_10y: number | string | null;
          credit_spread_5y: number | string | null;
          rates_source: string | null;
          rates_updated_at: string | null;
          updated_at?: string | null;
          source?: string | null;
        };
        const asOf = String(row.date || "").split("T")[0] || null;
        const ts = row.rates_updated_at || row.updated_at || row.date || new Date().toISOString();
        const src = row.rates_source || row.source || "Supabase";

        if (row.yield_2y !== null && row.yield_2y !== undefined) {
          cnYieldCurveQuotes.push({
            symbol: SYMBOLS.CN_2Y,
            name: "中债2年收益率",
            price: Number(row.yield_2y),
            change: 0,
            changePercent: 0,
            volume: 0,
            timestamp: ts,
            source: src,
            region: "CN",
            category: "BOND",
            dataType: "EOD" as const,
            dataSource: "LIVE",
            isIndicative: false,
            note: asOf ? `asOf ${asOf}` : undefined,
          });
        }
        if (row.yield_5y !== null && row.yield_5y !== undefined) {
          cnYieldCurveQuotes.push({
            symbol: SYMBOLS.CN_5Y,
            name: "中债5年收益率",
            price: Number(row.yield_5y),
            change: 0,
            changePercent: 0,
            volume: 0,
            timestamp: ts,
            source: src,
            region: "CN",
            category: "BOND",
            dataType: "EOD" as const,
            dataSource: "LIVE",
            isIndicative: false,
            note: asOf ? `asOf ${asOf}` : undefined,
          });
        }
        if (row.yield_10y !== null && row.yield_10y !== undefined) {
          cnYieldCurveQuotes.push({
            symbol: SYMBOLS.CN_10Y,
            name: "中债10年收益率",
            price: Number(row.yield_10y),
            change: 0,
            changePercent: 0,
            volume: 0,
            timestamp: ts,
            source: src,
            region: "CN",
            category: "BOND",
            dataType: "EOD" as const,
            dataSource: "LIVE",
            isIndicative: false,
            note: asOf ? `asOf ${asOf}` : undefined,
          });
        }
        if (row.credit_spread_5y !== null && row.credit_spread_5y !== undefined) {
          cnYieldCurveQuotes.push({
            symbol: SYMBOLS.CN_CREDIT_SPREAD_5Y,
            name: "AAA中短票-国债5Y利差",
            price: Number(row.credit_spread_5y),
            change: 0,
            changePercent: 0,
            volume: 0,
            timestamp: ts,
            source: src,
            region: "CN",
            category: "BOND",
            dataType: "EOD" as const,
            dataSource: "LIVE",
            isIndicative: false,
            note: asOf ? `asOf ${asOf} · unit=bp` : "unit=bp",
          });
        }
      }
    } catch {
      // ignore; fallback below
    }

    // 2) Fallback to cnBondData (legacy)
    if (cnYieldCurveQuotes.length === 0 && cnBondData.yieldCurve?.maturities) {
      const maturities = cnBondData.yieldCurve.maturities as Record<string, number>;
      const mk = (symbol: string, name: string, val: number): MarketQuote => ({
        symbol,
        name,
        price: val,
        change: 0,
        changePercent: 0,
        volume: 0,
        timestamp: cnBondData.yieldCurve?.date || new Date().toISOString(),
        source: cnBondData.source || "Chinabond/AkShare",
        region: "CN",
        category: "BOND",
        dataType: "EOD" as const,
        dataSource: cnBondData.status === "LIVE" ? "LIVE" : cnBondData.status === "DELAYED" ? "DELAYED" : "OFF",
        isIndicative: cnBondData.status !== "LIVE",
      });

      if (maturities["2Y"] !== undefined) cnYieldCurveQuotes.push(mk(SYMBOLS.CN_2Y, "中债2年收益率", maturities["2Y"]));
      if (maturities["5Y"] !== undefined) cnYieldCurveQuotes.push(mk(SYMBOLS.CN_5Y, "中债5年收益率", maturities["5Y"]));
      if (maturities["10Y"] !== undefined) cnYieldCurveQuotes.push(mk(SYMBOLS.CN_10Y, "中债10年收益率", maturities["10Y"]));

      // credit spread not available in legacy path
      cnYieldCurveQuotes.push({
        symbol: SYMBOLS.CN_CREDIT_SPREAD_5Y,
        name: "AAA中短票-国债5Y利差",
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0,
        timestamp: new Date().toISOString(),
        source: "OFF (needs daily CN rates cron)",
        region: "CN",
        category: "BOND",
        dataType: "EOD" as const,
        dataSource: "OFF",
        isIndicative: true,
        note: "请先确保 /api/cron/daily-cn-rates 日更入库已运行",
      });
    }

    // 3) If still empty: OFF
    if (cnYieldCurveQuotes.length === 0) {
      const watchlistRates = [
        SYMBOLS.CN_2Y,
        SYMBOLS.CN_5Y,
        SYMBOLS.CN_10Y,
        SYMBOLS.CN_CREDIT_SPREAD_5Y,
      ];
      const rateNames: Record<string, string> = {
        [SYMBOLS.CN_2Y]: "中债2年收益率",
        [SYMBOLS.CN_5Y]: "中债5年收益率",
        [SYMBOLS.CN_10Y]: "中债10年收益率",
        [SYMBOLS.CN_CREDIT_SPREAD_5Y]: "AAA中短票-国债5Y利差",
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
          source: "OFF",
          region: "CN",
          category: "BOND",
          dataType: "EOD" as const,
          dataSource: "OFF",
          isIndicative: true,
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

    // Prepare response data
    const responseData = {
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
    };

    // Update in-memory cache before returning
    _cacheStore = { data: responseData, ts: Date.now() };

    // Determine Cache-Control based on no_cache parameter
    const cacheControl = noCache 
      ? "no-store" 
      : "public, s-maxage=60, stale-while-revalidate=300";

    return NextResponse.json(
      responseData,
      {
        status: 200,
        headers: {
          "Cache-Control": cacheControl,
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
