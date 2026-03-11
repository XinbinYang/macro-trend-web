import { NextResponse } from "next/server";
import { llmChat } from "@/lib/api/llm";

type Dimension = "周期分析" | "反身性分析" | "流动性分析" | "技术趋势";

interface DimensionBlock {
  dimension: Dimension;
  perspective: string;
  insight: string;
}

interface AssetAnalysis {
  blocks: DimensionBlock[];
  support: { level: number; note: string };
  resistance: { level: number; note: string };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, name, metrics, context } = body || {};

    if (!symbol || !metrics) {
      return NextResponse.json(
        { success: false, error: "Missing symbol/metrics" },
        { status: 400 }
      );
    }


    const prompt = {
      symbol,
      name,
      metrics,
      context: context || {},
      outputSpec:
        "Return JSON ONLY with shape: {blocks:[{dimension,perspective,insight}], support:{level,note}, resistance:{level,note}}. blocks must contain exactly 4 dimensions: 周期分析/反身性分析/流动性分析/技术趋势. perspective<=60 Chinese chars, insight<=40 Chinese chars. support/resistance level are numbers.",
    };

    const payload = {
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional global macro analyst. Be concise, avoid made-up facts. If a claim needs data you don't have, phrase as conditional. Output strict JSON only.",
        },
        { role: "user", content: JSON.stringify(prompt) },
      ],
      max_tokens: 450,
      temperature: 0.3,
    };

    const result = await llmChat(payload);
    if (!result.ok) {
      console.error("LLM error (asset-analysis):", result.provider, result.status, result.error);
      return NextResponse.json(
        { success: false, error: `${result.provider}: ${result.error || "LLM error"}` },
        { status: 502 }
      );
    }

    const content = result.text || "";

    let parsed: AssetAnalysis | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { success: false, error: "Model returned non-JSON" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, data: parsed, source: result.provider });
  } catch (e) {
    console.error("asset-analysis error:", e);
    return NextResponse.json(
      { success: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
