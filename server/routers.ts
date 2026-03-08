import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { fetchAssetClassData, fetchAggs, getDateRange, fetchSMA200, fetchPrevClose, ASSET_TICKERS, buildMarketDataSummary, buildQuarterlyMarketSummary, fetchDashboardSnapshot } from "./market-data";
import { generateMacroAnalysis, generateAssetAnalysis, generateReport } from "./analysis-engine";
import { generateReportPDF, generateAssetPDF } from "./pdf-generator";
import { fetchMacroIndicators, buildMacroIndicatorText } from "./macro-indicators";
import { buildRiskParityPortfolio } from "./portfolio-engine";
import type { ReportDetail } from "../shared/macro-types";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

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
  // Uses quarterly (90-day) market performance data + macro indicators for stable scenario judgment
  macro: router({
    analyze: publicProcedure.query(async () => {
      try {
        // Fetch real-time snapshot, quarterly performance, and macro indicators in parallel
        const [realtimeSummary, quarterlySummary, macroIndicators] = await Promise.all([
          buildMarketDataSummary(),
          buildQuarterlyMarketSummary(),
          fetchMacroIndicators(),
        ]);
        const macroIndicatorText = buildMacroIndicatorText(macroIndicators);
        // Combine all three data sources for comprehensive analysis
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

    // Standalone macro indicators endpoint (fast - no LLM)
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
    // List assets by class with market data
    list: publicProcedure
      .input(z.object({ assetClass: z.enum(["cn_stocks", "cn_bonds", "us_stocks", "us_bonds", "gold", "other_markets"]) }))
      .query(async ({ input }) => {
        try {
          // Map new 6-segment asset classes to underlying ASSET_TICKERS categories
          const SEGMENT_TO_TICKERS: Record<string, { tickerClass: keyof typeof ASSET_TICKERS; filterSymbols?: string[] }> = {
            cn_stocks: { tickerClass: "stocks", filterSymbols: ["ASHR", "CNXT", "MCHI", "EWH", "KWEB", "KTEC", "FXI"] },
            cn_bonds: { tickerClass: "bonds", filterSymbols: ["CBON"] },
            us_stocks: { tickerClass: "stocks", filterSymbols: ["SPY", "QQQ", "IWM"] },
            us_bonds: { tickerClass: "bonds", filterSymbols: ["TLT", "IEF", "SHY", "TUA", "TYA", "LQD", "HYG", "TIP"] },
            gold: { tickerClass: "commodities", filterSymbols: ["GC=F", "SI=F"] },
            other_markets: { tickerClass: "commodities" }, // returns all commodities + forex combined
          };
          const mapping = SEGMENT_TO_TICKERS[input.assetClass];
          if (!mapping) return [];

          if (input.assetClass === "other_markets") {
            // Combine remaining commodities (oil, gas, agri, metals) + all forex
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

    // Get detailed analysis for a specific asset
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

          // Get price from aggs, or fall back to real-time quote if aggs is empty
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

    // Get price history for charts
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

    // Batch history for compare chart (normalized to percentage change)
    compareHistory: publicProcedure
      .input(z.object({
        symbols: z.array(z.string()).min(1).max(6),
        days: z.number().default(90),
      }))
      .query(async ({ input }) => {
        try {
          const { from, to } = getDateRange(input.days);
          const results: Array<{
            symbol: string;
            name: string;
            data: Array<{ date: string; close: number; normalizedPct: number }>;
          }> = [];

          // Fetch sequentially to respect rate limits
          for (const sym of input.symbols) {
            const aggs = await fetchAggs(sym, 1, "day", from, to);
            // Find the ticker name from ASSET_TICKERS
            let tickerName = sym;
            for (const cls of Object.values(ASSET_TICKERS)) {
              const found = cls.find((t) => t.symbol === sym);
              if (found) { tickerName = found.name; break; }
            }

            if (aggs.length > 0) {
              const basePrice = aggs[0].c;
              results.push({
                symbol: sym,
                name: tickerName,
                data: aggs.map((a) => ({
                  date: new Date(a.t).toISOString().split("T")[0],
                  close: a.c,
                  normalizedPct: ((a.c - basePrice) / basePrice) * 100,
                })),
              });
            } else {
              results.push({ symbol: sym, name: tickerName, data: [] });
            }
          }

          return results;
        } catch (e) {
          console.error("[Router] assets.compareHistory error:", e);
          return [];
        }
      }),

    // Get all available tickers for the asset picker
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

  // Asset PDF export
  assetPDF: router({
    export: publicProcedure
      .input(z.object({
        symbol: z.string(),
        name: z.string(),
        assetClass: z.string(),
        price: z.number(),
        change: z.number().default(0),
        changePercent: z.number().default(0),
        direction: z.string().default("neutral"),
        ma200: z.number().default(0),
        priceVsMa200: z.number().default(0),
        keySupport: z.string().default("--"),
        keyResistance: z.string().default("--"),
        pivotalPoints: z.array(z.string()).default([]),
        macroDrivers: z.array(z.string()).default([]),
        crossAssetCorrelations: z.array(z.object({
          asset: z.string(),
          correlation: z.string(),
          observation: z.string(),
        })).default([]),
        tradeStrategy: z.object({
          direction: z.string().default("neutral"),
          entryRange: z.string().default("--"),
          initialPosition: z.string().default("--"),
          pyramidCondition: z.string().default("--"),
          stopLoss: z.string().default("--"),
          target: z.string().default("--"),
          riskRewardRatio: z.string().default("--"),
          timeFrame: z.string().default("--"),
        }),
        dimensionViews: z.array(z.object({
          dimension: z.string(),
          dimensionName: z.string(),
          perspective: z.string(),
          keyInsight: z.string(),
        })).default([]),
      }))
      .mutation(async ({ input }) => {
        try {
          const pdfBuffer = await generateAssetPDF(input);
          return {
            base64: pdfBuffer.toString("base64"),
            filename: `AI宏观作手-${input.name}(${input.symbol})-分析报告.pdf`,
          };
        } catch (e) {
          console.error("[Router] assetPDF.export error:", e);
          return { error: "Failed to generate asset PDF" };
        }
      }),
  }),

  // Report generation
  reports: router({
    // Generate a new report
    generate: publicProcedure
      .input(z.object({ type: z.enum(["weekly", "quarterly"]) }))
      .mutation(async ({ input }) => {
        try {
          // Fetch real-time, quarterly, and macro indicators for comprehensive reports
          const [summary, quarterlySummary, macroIndicators] = await Promise.all([
            buildMarketDataSummary(),
            buildQuarterlyMarketSummary(),
            fetchMacroIndicators(),
          ]);
          const macroIndicatorText = buildMacroIndicatorText(macroIndicators);
          const combinedSummary = `${macroIndicatorText}\n\n---\n\n${quarterlySummary}\n\n---\n\n${summary}`;
          const macroContext = `当前日期: ${new Date().toISOString().split("T")[0]}
报告类型: ${input.type === "weekly" ? "周度" : "季度"}
数据说明: 以下市场数据包含三部分：
1. 宏观经济指标概览（收益率曲线、通胀预期、风险偏好等市场推导的宏观指标）
2. 过去一个季度（90天）的大类资产价格表现趋势（用于判断宏观情景和中长期方向）
3. 实时市场价格快照（用于具体交易建议的入场/止损/目标价设定）
商品价格为期货合约直接报价（如黄金美元/盎司、原油美元/桶），无需换算。
宏观情景判断应综合宏观经济指标和季度级别的趋势数据，而非当日短期波动。`;

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

    // Generate PDF for a report
    exportPDF: publicProcedure
      .input(z.object({
        id: z.string(),
        title: z.string(),
        type: z.enum(["weekly", "quarterly"]),
        date: z.string(),
        coreThesis: z.string().optional().default(""),
        scenario: z.string().optional().default("goldilocks"),
        createdAt: z.string().optional().default(""),
        executiveSummary: z.string().optional().default(""),
        macroBackground: z.string().optional().default(""),
        marketAnalysis: z.string().optional().default(""),
        tradeStrategies: z.string().optional().default(""),
        risksAndCatalysts: z.string().optional().default(""),
        disclaimer: z.string().optional().default(""),
      }))
      .mutation(async ({ input }) => {
        try {
          const reportData: ReportDetail = {
            ...input,
            type: input.type as "weekly" | "quarterly",
            scenario: (input.scenario || "goldilocks") as any,
          };
          const pdfBuffer = await generateReportPDF(reportData);
          // Return base64 encoded PDF
          return {
            base64: pdfBuffer.toString("base64"),
            filename: `AI宏观作手-${input.type === "weekly" ? "周度" : "季度"}报告-${input.date}.pdf`,
          };
        } catch (e) {
          console.error("[Router] reports.exportPDF error:", e);
          return { error: "Failed to generate PDF" };
        }
      }),
  }),

  // Portfolio recommendation (risk parity + macro overlay)
  portfolio: router({
    recommend: publicProcedure.query(async () => {
      try {
        // Fetch macro context for LLM overlay
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
});

export type AppRouter = typeof appRouter;
