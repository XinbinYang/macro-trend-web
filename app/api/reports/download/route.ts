import { NextRequest, NextResponse } from "next/server";
import { generateReport } from "@/server/analysis-engine";
import { buildMarketDataSummary, buildQuarterlyMarketSummary } from "@/server/market-data";
import { fetchMacroIndicators, buildMacroIndicatorText } from "@/server/macro-indicators";

export async function POST(request: NextRequest) {
  console.log('[API /api/reports/download] Received request');
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("id");

    if (!reportId) {
      return NextResponse.json({ error: "缺少报告ID" }, { status: 400 });
    }

    // 判断是否为测试ID
    if (reportId === "test") {
      return NextResponse.json({ 
        success: true, 
        message: "API 正常工作",
        reportId,
        note: "AI报告生成已启用"
      });
    }

    // 尝试获取真实数据生成报告
    try {
      const type = reportId.startsWith("w") ? "weekly" : "quarterly";
      const timeFrameDesc = type === "weekly" ? "本周" : "本季度";
      
      // 获取市场数据
      const [summary, quarterlySummary, macroIndicators] = await Promise.all([
        buildMarketDataSummary(),
        buildQuarterlyMarketSummary(),
        fetchMacroIndicators(),
      ]);
      
      const macroIndicatorText = buildMacroIndicatorText(macroIndicators);
      const combinedSummary = `${macroIndicatorText}\n\n---\n\n${quarterlySummary}\n\n---\n\n${summary}`;
      const macroContext = `当前日期: ${new Date().toISOString().split("T")[0]}
报告类型: ${timeFrameDesc}
数据说明: 以下市场数据包含三部分：
1. 宏观经济指标概览（收益率曲线、通胀预期、风险偏好等市场推导的宏观指标）
2. 过去一个季度（90天）的大类资产价格表现趋势（用于判断宏观情景和中长期方向）
3. 实时市场价格快照（用于具体交易建议的入场/止损/目标价设定）
商品价格为期货合约直接报价（如黄金美元/盎司、原油美元/桶），无需换算。
宏观情景判断应综合宏观经济指标和季度级别的趋势数据，而非当日短期波动。`;

      // 调用AI生成报告
      const reportResult = await generateReport(type, combinedSummary, macroContext);
      
      if (!reportResult) {
        throw new Error("报告生成失败");
      }

      // 返回JSON格式的报告数据（前端用jsPDF生成PDF）
      return NextResponse.json({ 
        success: true, 
        report: {
          id: reportId,
          title: reportResult.title || `${type === "weekly" ? "周度" : "季度"}宏观报告`,
          date: new Date().toISOString().split("T")[0],
          type: type,
          coreThesis: reportResult.coreThesis || "",
          scenario: reportResult.scenario || "goldilocks",
          keyPoints: reportResult.keyPoints || [],
          executiveSummary: reportResult.executiveSummary || "",
          macroBackground: reportResult.macroBackground || "",
          marketAnalysis: reportResult.marketAnalysis || "",
          tradeStrategies: reportResult.tradeStrategies || "",
          risksAndCatalysts: reportResult.risksAndCatalysts || "",
          disclaimer: reportResult.disclaimer || "本报告仅供参考，不构成投资建议。",
        }
      });
      
    } catch (genError) {
      console.error("[API Error] AI报告生成失败:", genError);
      // 返回错误，但保持API正常工作
      return NextResponse.json({ 
        success: false, 
        error: "AI报告生成失败",
        details: (genError as Error).message,
        stack: (genError as Error).stack,
        reportId
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error("API 错误:", error);
    return NextResponse.json(
      { error: "服务器错误", details: (error as Error).message },
      { status: 500 }
    );
  }
}
