import { initTRPC } from '@trpc/server';
import { cache } from 'react';
import { z } from 'zod';
import { createTRPCReact } from '@trpc/react-query';

// Create a context for tRPC
export const createTRPCContext = cache(async () => {
  return {};
});

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Import business logic from server/
import { 
  fetchAssetClassData, 
  fetchAggs, 
  getDateRange, 
  fetchSMA200, 
  fetchPrevClose, 
  ASSET_TICKERS, 
  buildMarketDataSummary, 
  buildQuarterlyMarketSummary, 
  fetchDashboardSnapshot 
} from '@/server/market-data';
import { generateMacroAnalysis, generateAssetAnalysis, generateReport } from '@/server/analysis-engine';
import { fetchMacroIndicators, buildMacroIndicatorText } from '@/server/macro-indicators';
import { buildRiskParityPortfolio } from '@/server/portfolio-engine';

// Define the app router
export const appRouter = router({
  // Dashboard quick snapshot (fast - no LLM)
  dashboard: router({
    snapshot: publicProcedure.query(async () => {
      try {
        return await fetchDashboardSnapshot();
      } catch (e) {
        console.error("[Router] dashboard.snapshot error:", e);
        return [];
      }
    }),
  }),

  // Macro environment analysis (slow - requires LLM)
  macro: router({
    analyze: publicProcedure.query(async () => {
      try {
        const [realtimeSummary, quarterlySummary, macroIndicators] = await Promise.all([
          buildMarketDataSummary(),
          buildQuarterlyMarketSummary(),
          fetchMacroIndicators(),
        ]);
        const macroIndicatorText = buildMacroIndicatorText(macroIndicators);
        const combinedSummary = `${macroIndicatorText}\n\n---\n\n${quarterlySummary}\n\n---\n\n${realtimeSummary}`;
        const analysis = await generateMacroAnalysis(combinedSummary);
        if (!analysis) {
          return { error: "Analysis generation failed" };
        }
        return {
          ...analysis,
          macroIndicators,
          lastUpdated: new Date().toISOString(),
        };
      } catch (e) {
        console.error("[Router] macro.analyze error:", e);
        return { error: "Failed to generate macro analysis" };
      }
    }),

    indicators: publicProcedure.query(async () => {
      try {
        return await fetchMacroIndicators();
      } catch (e) {
        console.error("[Router] macro.indicators error:", e);
        return null;
      }
    }),
  }),

  // Asset data and analysis
  assets: router({
    list: publicProcedure
      .input(z.object({ assetClass: z.enum(["cn_stocks", "cn_bonds", "us_stocks", "us_bonds", "gold", "other_markets"]) }))
      .query(async ({ input }) => {
        try {
          const SEGMENT_TO_TICKERS: Record<string, { tickerClass: keyof typeof ASSET_TICKERS; filterSymbols?: string[] }> = {
            cn_stocks: { tickerClass: "stocks", filterSymbols: ["ASHR", "CNXT", "MCHI", "EWH", "KWEB", "KTEC", "FXI"] },
            cn_bonds: { tickerClass: "bonds", filterSymbols: ["CBON"] },
            us_stocks: { tickerClass: "stocks", filterSymbols: ["SPY", "QQQ", "IWM"] },
            us_bonds: { tickerClass: "bonds", filterSymbols: ["TLT", "IEF", "SHY", "TUA", "TYA", "LQD", "HYG", "TIP"] },
            gold: { tickerClass: "commodities", filterSymbols: ["GC=F", "SI=F"] },
            other_markets: { tickerClass: "commodities" },
          };
          const mapping = SEGMENT_TO_TICKERS[input.assetClass];
          if (!mapping) return [];

          if (input.assetClass === "other_markets") {
            const [commodities, forex] = await Promise.all([
              fetchAssetClassData("commodities"),
              fetchAssetClassData("forex"),
            ]);
            const otherCommodities = commodities.filter((d) => !["GC=F", "SI=F"].includes(d.symbol));
            const combined = [...otherCommodities, ...forex];
            return combined.map((d) => ({
              id: `${input.assetClass}-${d.symbol}`,
              symbol: d.symbol,
              name: d.name,
              assetClass: input.assetClass,
              price: d.price,
              change: d.change,
              changePercent: d.changePercent,
              direction: d.changePercent > 0.5 ? "bullish" as const : d.changePercent < -0.5 ? "bearish" as const : "neutral" as const,
              valuation: "fair" as const,
              signalStrength: "moderate" as const,
              region: d.region,
            }));
          }

          const data = await fetchAssetClassData(mapping.tickerClass);
          const filtered = mapping.filterSymbols
            ? data.filter((d) => mapping.filterSymbols!.includes(d.symbol))
            : data;
          return filtered.map((d) => ({
            id: `${input.assetClass}-${d.symbol}`,
            symbol: d.symbol,
            name: d.name,
            assetClass: input.assetClass,
            price: d.price,
            change: d.change,
            changePercent: d.changePercent,
            direction: d.changePercent > 0.5 ? "bullish" as const : d.changePercent < -0.5 ? "bearish" as const : "neutral" as const,
            valuation: "fair" as const,
            signalStrength: "moderate" as const,
            region: d.region,
          }));
        } catch (e) {
          console.error("[Router] assets.list error:", e);
          return [];
        }
      }),

    detail: publicProcedure
      .input(z.object({ symbol: z.string(), name: z.string(), assetClass: z.string() }))
      .query(async ({ input }) => {
        try {
          const { from, to } = getDateRange(30);
          const aggs = await fetchAggs(input.symbol, 1, "day", from, to);
          const sma200 = await fetchSMA200(input.symbol);

          const priceDataStr = aggs
            .slice(-10)
            .map((a) => `日期: ${new Date(a.t).toISOString().split("T")[0]}, 开: ${a.o}, 高: ${a.h}, 低: ${a.l}, 收: ${a.c}, 量: ${a.v}`)
            .join("\n");

          const analysis = await generateAssetAnalysis(
            input.symbol,
            input.name,
            input.assetClass,
            priceDataStr,
            sma200
          );

          if (!analysis) {
            return { error: "Analysis generation failed" };
          }

          const lastAgg = aggs[aggs.length - 1];
          let price = lastAgg?.c || 0;
          let change = lastAgg ? lastAgg.c - lastAgg.o : 0;
          let changePercent = lastAgg ? ((lastAgg.c - lastAgg.o) / lastAgg.o) * 100 : 0;

          if (price <= 0) {
            const quote = await fetchPrevClose(input.symbol);
            if (quote) {
              price = quote.close;
              change = quote.change;
              changePercent = quote.changePercent;
            }
          }

          return {
            id: `${input.assetClass}-${input.symbol}`,
            symbol: input.symbol,
            name: input.name,
            assetClass: input.assetClass,
            price,
            change,
            changePercent,
            ma200: sma200 || 0,
            priceVsMa200: sma200 && price > 0 ? ((price - (sma200 || 0)) / (sma200 || 1)) * 100 : 0,
            region: "us",
            ...analysis,
          };
        } catch (e) {
          console.error("[Router] assets.detail error:", e);
          return { error: "Failed to generate asset analysis" };
        }
      }),

    history: publicProcedure
      .input(z.object({ symbol: z.string(), days: z.number().default(90) }))
      .query(async ({ input }) => {
        try {
          const { from, to } = getDateRange(input.days);
          const aggs = await fetchAggs(input.symbol, 1, "day", from, to);
          return aggs.map((a) => ({
            date: new Date(a.t).toISOString().split("T")[0],
            open: a.o,
            high: a.h,
            low: a.l,
            close: a.c,
            volume: a.v,
          }));
        } catch (e) {
          console.error("[Router] assets.history error:", e);
          return [];
        }
      }),

    allTickers: publicProcedure.query(() => {
      const all: Array<{ symbol: string; name: string; assetClass: string; region: string }> = [];
      for (const [cls, tickers] of Object.entries(ASSET_TICKERS)) {
        for (const t of tickers) {
          all.push({ symbol: t.symbol, name: t.name, assetClass: cls, region: t.region });
        }
      }
      return all;
    }),
  }),

  // Portfolio recommendation
  portfolio: router({
    recommend: publicProcedure.query(async () => {
      try {
        const [realtimeSummary, macroIndicators] = await Promise.all([
          buildMarketDataSummary(),
          fetchMacroIndicators(),
        ]);
        const macroIndicatorText = buildMacroIndicatorText(macroIndicators);
        const portfolio = await buildRiskParityPortfolio(realtimeSummary, macroIndicatorText);
        if (!portfolio) {
          return { error: "Portfolio construction failed" };
        }
        return portfolio;
      } catch (e) {
        console.error("[Router] portfolio.recommend error:", e);
        return { error: "Failed to build portfolio recommendation" };
      }
    }),
  }),

  // Reports
  reports: router({
    generate: publicProcedure
      .input(z.object({ type: z.enum(["weekly", "quarterly"]) }))
      .mutation(async ({ input }) => {
        try {
          const [summary, quarterlySummary, macroIndicators] = await Promise.all([
            buildMarketDataSummary(),
            buildQuarterlyMarketSummary(),
            fetchMacroIndicators(),
          ]);
          const macroIndicatorText = buildMacroIndicatorText(macroIndicators);
          const combinedSummary = `${macroIndicatorText}\n\n---\n\n${quarterlySummary}\n\n---\n\n${summary}`;
          const macroContext = `当前日期: ${new Date().toISOString().split("T")[0]}
报告类型: ${input.type === "weekly" ? "周度" : "季度"}`;

          const report = await generateReport(input.type, combinedSummary, macroContext);
          if (!report) {
            return { error: "Report generation failed" };
          }

          return {
            id: `report-${Date.now()}`,
            type: input.type,
            date: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
            ...report,
          };
        } catch (e) {
          console.error("[Router] reports.generate error:", e);
          return { error: "Failed to generate report" };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

// Create React client - must be after AppRouter type definition
export const trpcClient = createTRPCReact<AppRouter>();
