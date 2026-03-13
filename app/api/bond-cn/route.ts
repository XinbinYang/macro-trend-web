import { NextResponse } from "next/server";
import { getCnBondData, type BondDataConfig } from "@/lib/api/bond-cn";

/**
 * 中国债券数据统一 API
 * 
 * 路由: /api/bond-cn
 * 
 * 查询参数:
 * - level: "L1" | "L2" | "L3" (默认: L1)
 *   - L1: 展示层 (实时/日度行情)
 *   - L2: 分析层 (含收益率曲线)
 *   - L3: 真值层 (回测用，仅内部)
 * - realtime: "true" | "false" (默认: false)
 *   - true: 尝试获取实时数据
 *   - false: 使用日度数据
 * - fallback: "true" | "false" (默认: true)
 *   - true: 启用降级链
 *   - false: 失败时直接返回错误
 * 
 * 响应格式:
 * {
 *   success: boolean;
 *   timestamp: string;
 *   level: "L1" | "L2" | "L3";
 *   data: {
 *     futures: BondFutureQuote[];
 *     yieldCurve: CnYieldCurve | null;
 *   };
 *   source: string;
 *   status: "LIVE" | "DELAYED" | "STALE" | "OFF";
 *   errors?: string[];
 * }
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // 解析参数
  const level = (searchParams.get("level") as BondDataConfig["level"]) || "L1";
  const realtime = searchParams.get("realtime") === "true";
  const fallback = searchParams.get("fallback") !== "false";  // 默认启用降级
  
  try {
    const data = await getCnBondData({ level, realtime, fallback });
    
    // 根据状态设置缓存策略
    const cacheControl = getCacheControl(data.status, realtime);
    
    return NextResponse.json(
      {
        success: data.status !== "OFF",
        timestamp: new Date().toISOString(),
        level,
        data: {
          futures: data.futures,
          yieldCurve: data.yieldCurve,
        },
        source: data.source,
        status: data.status,
        errors: data.errors,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": cacheControl,
          "X-Data-Source": data.source,
          "X-Data-Status": data.status,
        },
      }
    );
  } catch (error) {
    // 绝不抛错导致前端崩溃
    console.error("[API /bond-cn] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        level,
        data: {
          futures: [],
          yieldCurve: null,
        },
        source: "OFF",
        status: "OFF",
        errors: [(error as Error).message],
      },
      {
        status: 200,  // 返回200避免前端崩溃
        headers: {
          "Cache-Control": "no-store",
          "X-Data-Source": "OFF",
          "X-Data-Status": "OFF",
        },
      }
    );
  }
}

/**
 * 根据数据状态确定缓存策略
 */
function getCacheControl(status: string, realtime: boolean): string {
  if (realtime) {
    return "no-store";
  }
  
  switch (status) {
    case "LIVE":
      return "public, max-age=300";  // 5分钟
    case "DELAYED":
      return "public, max-age=600";  // 10分钟
    case "STALE":
      return "public, max-age=3600"; // 1小时
    case "OFF":
    default:
      return "no-store";
  }
}
