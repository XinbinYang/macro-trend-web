# 中国债券数据稳态重建方案

> 目标：让 macro-trend-web 的中国债券模块从当前 sample/兼容状态，升级到稳定、不会破坏构建链的正式接入方案。

---

## 1. 最小稳态方案

### 1.1 核心原则

| 原则 | 说明 |
|------|------|
| **非破坏性** | 任何改动不能导致现有构建/部署失败 |
| **渐进式** | 先落地基础设施，再逐步替换数据源 |
| **可审计** | 所有数据变更必须可追溯、可回滚 |
| **双轨制** | 展示层(Indicative)与回测真值层(Truth)分离 |

### 1.2 稳态架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端展示层 (UI)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ 债券期货行情 │  │ 收益率曲线   │  │ 中债总财富指数       │  │
│  │ (T/TF/TL)   │  │ (1Y-30Y)    │  │ (回测真值)          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    API 路由层                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ /api/bond/cn    │  │ /api/yield/cn   │  │ /api/truth  │  │
│  │ (实时/日度行情)  │  │ (收益率曲线)     │  │ (回测真值)   │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
└───────────┼────────────────────┼──────────────────┼─────────┘
            │                    │                  │
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据适配层                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ 国债期货Adapter  │  │ 收益率Adapter    │  │ 真值Adapter  │  │
│  │ (中金所/东财)    │  │ (中债估值)       │  │ (Parquet)   │  │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘  │
└───────────┼────────────────────┼──────────────────┼─────────┘
            │                    │                  │
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据源层                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Eastmoney   │  │ AkShare     │  │ Master Parquet      │  │
│  │ (实时行情)   │  │ (日度收盘)   │  │ (官方结算镜像)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 数据分级定义

| 层级 | 数据类型 | 用途 | 数据源要求 |
|------|----------|------|------------|
| **L1 展示层** | 实时行情、日度收盘 | 前端展示、用户参考 | Eastmoney/AkShare (Indicative) |
| **L2 分析层** | 收益率曲线、技术指标 | 宏观分析、趋势判断 | 中债估值/AkShare |
| **L3 真值层** | 结算价、总财富指数 | 回测、净值计算、信号生成 | Master Parquet (官方结算镜像) |

---

## 2. 数据源与更新频率

### 2.1 数据源矩阵

| 数据类别 | 推荐源 | 备用源 | 更新频率 | 状态 |
|----------|--------|--------|----------|------|
| **国债期货实时** | Eastmoney (免key) | Sina/腾讯 | 实时(15s延迟) | ✅ 可落地 |
| **国债期货日度** | AkShare (中金所) | CFFEX官网 | 日度 EOD | ✅ 可落地 |
| **中债估值曲线** | AkShare (中债登) | Wind/Choice | 日度 EOD | ⚠️ 需验证 |
| **中债总财富指数** | Master Parquet | AkShare | 日度 EOD | ✅ 已有 |
| **LPR/MLF** | AkShare (央行) | PBOC官网 | 月度 | ✅ 已有 |

### 2.2 更新频率设计

```
实时层 (Real-time)
├── 国债期货行情: 30s 轮询 (Eastmoney)
└── 状态: 展示用，标记为 "DELAYED"

日度层 (Daily EOD)
├── 期货结算价: 17:00 CST (AkShare/CFFEX)
├── 中债估值: 18:00 CST (AkShare)
└── 总财富指数: 18:00 CST (Master Parquet)

月度层 (Monthly)
├── LPR/MLF: 每月20日左右 (AkShare/PBOC)
├── 社融/M2: 次月10-15日 (AkShare)
└── PMI/CPI: 每月初 (AkShare)
```

### 2.3 数据契约 (Schema)

```typescript
// L1: 债券期货行情 (展示层)
interface CnBondFutureQuote {
  symbol: string;           // "T2506", "TF2506", "TL2506"
  name: string;             // "10年期国债期货"
  price: number;            // 当前价/结算价
  change: number;           // 涨跌额
  changePercent: number;    // 涨跌幅
  volume: number;           // 成交量
  openInterest?: number;    // 持仓量
  timestamp: string;        // ISO 8601
  source: string;           // "Eastmoney" | "AkShare" | "CFFEX"
  dataType: "REALTIME" | "EOD";
  status: "LIVE" | "DELAYED" | "OFF";
}

// L2: 收益率曲线
interface CnYieldCurve {
  date: string;             // "2026-03-13"
  maturities: {
    "1Y": number;
    "2Y": number;
    "5Y": number;
    "10Y": number;
    "30Y": number;
  };
  source: string;
  status: "LIVE" | "STALE" | "OFF";
}

// L3: 回测真值 (与现有 Master Parquet 对齐)
interface CnBondTruth {
  date: string;             // "2026-03-13"
  symbol: string;           // "CGB10Y"
  settle: number;           // 结算价 (官方)
  totalReturn: number;      // 总财富指数
  source: string;           // "Master"
  status: "TRUTH";
}
```

---

## 3. 前后端改造建议

### 3.1 后端改造 (API 层)

#### 新增文件结构

```
app/
├── api/
│   ├── bond-cn/
│   │   └── route.ts              # 中国债券统一入口
│   ├── yield-curve-cn/
│   │   └── route.ts              # 收益率曲线
│   └── truth-cn/
│       └── route.ts              # 回测真值 (仅内部)
lib/
├── api/
│   ├── bond-cn.ts                # 债券数据适配器 (重构 akshare-bonds.ts)
│   ├── yield-curve-cn.ts         # 收益率曲线适配器
│   └── truth-cn.ts               # 真值层适配器
└── adapters/
    └── bondIndicators.ts         # 债券指标统一适配器
data/
├── bond-cn/
│   ├── latest.json               # 最新行情快照
│   ├── archive/
│   │   └── 2026-03-13.json       # 历史归档
│   └── yield-curve/
│       └── latest.json           # 最新收益率曲线
└── truth/
    └── cn_bond.parquet           # 回测真值 (软链接到 Master)
```

#### 3.1.1 重构 `lib/api/bond-cn.ts`

```typescript
// 统一的中国债券数据适配器
export interface BondDataConfig {
  level: "L1" | "L2" | "L3";      // 数据层级
  realtime?: boolean;              // 是否实时
  fallback?: boolean;              // 是否允许降级
}

// 主入口：获取债券数据
export async function getCnBondData(
  config: BondDataConfig
): Promise<CnBondDataResponse> {
  // 1. 尝试 L3 真值层 (仅内部回测用)
  if (config.level === "L3") {
    return await getTruthLayerData();
  }
  
  // 2. 尝试 L2 分析层
  if (config.level === "L2") {
    return await getAnalysisLayerData();
  }
  
  // 3. L1 展示层 (默认)
  return await getDisplayLayerData(config.realtime);
}

// L1: 展示层 - 实时/日度行情
async function getDisplayLayerData(realtime?: boolean) {
  if (realtime) {
    // 优先 Eastmoney (免key，稳定)
    const data = await fetchFromEastmoney();
    if (data) return { ...data, source: "Eastmoney", status: "LIVE" };
    
    // 降级到 AkShare
    const akData = await fetchFromAkShareRealtime();
    if (akData) return { ...akData, source: "AkShare", status: "DELAYED" };
  }
  
  // 日度数据 (AkShare)
  const eodData = await fetchFromAkShareEOD();
  if (eodData) return { ...eodData, source: "AkShare", status: "LIVE" };
  
  // 最终降级: 本地缓存
  return await getCachedBondData();
}
```

#### 3.1.2 新增 `app/api/bond-cn/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getCnBondData } from "@/lib/api/bond-cn";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const level = (searchParams.get("level") as "L1" | "L2" | "L3") || "L1";
  const realtime = searchParams.get("realtime") === "true";
  
  try {
    const data = await getCnBondData({ level, realtime, fallback: true });
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      level,
      data,
    }, {
      headers: {
        "Cache-Control": realtime ? "no-store" : "public, max-age=300",
      },
    });
  } catch (error) {
    // 绝不抛错导致构建失败
    return NextResponse.json({
      success: false,
      level,
      data: null,
      error: (error as Error).message,
      status: "OFF",
    }, { status: 200 }); // 返回200避免前端崩溃
  }
}
```

### 3.2 前端改造

#### 3.2.1 数据 Hook 封装

```typescript
// lib/hooks/useCnBondData.ts
import { useQuery } from "@tanstack/react-query";

export function useCnBondData(level: "L1" | "L2" | "L3" = "L1") {
  return useQuery({
    queryKey: ["cn-bond", level],
    queryFn: async () => {
      const res = await fetch(`/api/bond-cn?level=${level}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    staleTime: level === "L1" ? 30000 : 300000, // L1: 30s, L2/L3: 5min
    refetchInterval: level === "L1" ? 60000 : false,
  });
}
```

#### 3.2.2 组件状态显示

```typescript
// 债券数据状态徽章
function BondDataBadge({ source, status }: { source: string; status: string }) {
  const configs = {
    LIVE: { color: "green", icon: "●", label: "实时" },
    DELAYED: { color: "amber", icon: "◐", label: "延迟" },
    STALE: { color: "orange", icon: "◑", label: "陈旧" },
    OFF: { color: "slate", icon: "○", label: "离线" },
  };
  
  const config = configs[status as keyof typeof configs] || configs.OFF;
  
  return (
    <Badge variant="outline" className={`text-${config.color}-400`}>
      {config.icon} {config.label} · {source}
    </Badge>
  );
}
```

### 3.3 构建链保护

#### 3.3.1 类型安全

```typescript
// lib/types/bond-cn.ts
// 所有债券相关类型集中定义，避免重复和冲突

export type CnBondSymbol = "T" | "TF" | "TS" | "TL";  // 主力合约代码
export type CnBondMaturity = "2Y" | "5Y" | "10Y" | "30Y";

export interface CnBondDataResponse {
  futures: CnBondFutureQuote[];
  yieldCurve: CnYieldCurve | null;
  timestamp: string;
  source: string;
  status: "LIVE" | "DELAYED" | "STALE" | "OFF";
}
```

#### 3.3.2 构建时检查

```json
// package.json 新增脚本
{
  "scripts": {
    "build": "npm run type-check && next build",
    "type-check": "tsc --noEmit",
    "bond:sync": "python3 scripts/sync_cn_bond_data.py"
  }
}
```

---

## 4. 降级策略

### 4.1 多级降级链

```
Level 1 (正常)
├── 实时: Eastmoney API
├── 日度: AkShare CFFEX
└── 曲线: AkShare 中债估值

Level 2 (轻度降级)
├── 实时: 本地缓存 (5分钟内)
├── 日度: 昨日归档数据
└── 曲线: 昨日曲线

Level 3 (重度降级)
├── 实时: 显示 "OFF"
├── 日度: 最近可用日度数据
└── 曲线: 最近可用曲线

Level 4 (完全离线)
└── 所有数据标记为 "OFF"
    └── 显示占位符/提示信息
```

### 4.2 降级触发条件

| 场景 | 触发条件 | 降级行为 |
|------|----------|----------|
| API 超时 | > 10s | 切换到缓存 |
| API 错误 | 5xx/4xx | 切换到备用源 |
| 数据异常 | 价格变动 > 5% | 标记为可疑，使用缓存 |
| 构建时 | 数据源不可用 | 使用预置的 seed 数据 |

### 4.3 降级实现代码

```typescript
// lib/api/bond-cn.ts
const FALLBACK_CHAIN = [
  { name: "Eastmoney", fetcher: fetchFromEastmoney },
  { name: "AkShare", fetcher: fetchFromAkShare },
  { name: "Cache", fetcher: fetchFromCache },
  { name: "Seed", fetcher: fetchFromSeed },
];

export async function getCnBondDataWithFallback(
  config: BondDataConfig
): Promise<CnBondDataResponse> {
  const errors: string[] = [];
  
  for (const source of FALLBACK_CHAIN) {
    try {
      const data = await source.fetcher(config);
      if (data && validateBondData(data)) {
        return { ...data, source: source.name, status: "LIVE" };
      }
    } catch (e) {
      errors.push(`${source.name}: ${(e as Error).message}`);
    }
  }
  
  // 所有源都失败
  return {
    futures: [],
    yieldCurve: null,
    timestamp: new Date().toISOString(),
    source: "OFF",
    status: "OFF",
    errors,
  };
}
```

---

## 5. 哪部分可先落地

### 5.1 落地优先级矩阵

| 优先级 | 模块 | 工作量 | 依赖 | 风险 | 建议 |
|--------|------|--------|------|------|------|
| **P0** | L1 展示层 (期货行情) | 2h | 无 | 低 | ✅ 立即落地 |
| **P0** | Eastmoney 适配器 | 1h | 无 | 低 | ✅ 立即落地 |
| **P1** | 收益率曲线 (L2) | 4h | AkShare | 中 | 本周内 |
| **P1** | 数据归档机制 | 3h | 文件系统 | 低 | 本周内 |
| **P2** | L3 真值层对接 | 8h | Master Parquet | 中 | 下周 |
| **P2** | 降级策略完善 | 4h | 以上完成 | 低 | 下周 |
| **P3** | 实时推送 (WebSocket) | 16h | 基础设施 | 高 | 暂缓 |

### 5.2 P0 立即落地清单

#### Step 1: 重构 `lib/api/akshare-bonds.ts` → `lib/api/bond-cn.ts`

```typescript
// 保持原有接口兼容，内部实现改为 Eastmoney 优先
export async function getChinaBondFutures(): Promise<BondFutureQuote[]> {
  // 1. 尝试 Eastmoney (新)
  const emData = await fetchFromEastmoney();
  if (emData) return emData;
  
  // 2. 降级到原有 sample 数据 (兼容)
  return getMockBondFutures();
}
```

#### Step 2: 更新 `app/api/market-data-realtime/route.ts`

```typescript
// 修改 bond 数据获取逻辑
const [bondFutures, chinaYieldCurve, usTreasuryCurve] = await Promise.all([
  getChinaBondFutures(),  // 内部已包含降级
  getChinaBondYieldCurve(),
  getUsTreasuryCurveLatest(),
]);

// 标记数据来源
const bondFutureQuotes: MarketQuote[] = bondFutures.map(bf => ({
  ...bf,
  dataSource: bf.source === "Eastmoney" ? "LIVE" : "SAMPLE",
}));
```

#### Step 3: 验证构建

```bash
cd macro-trend-web
npm run type-check
npm run build
```

### 5.3 本周内落地清单 (P1)

1. **收益率曲线数据脚本**
   - 创建 `scripts/update_cn_yield_curve.py`
   - 每日 18:00 运行，输出到 `data/bond-cn/yield-curve/latest.json`

2. **数据归档机制**
   - 创建 `scripts/archive_bond_data.py`
   - 每日归档历史数据到 `data/bond-cn/archive/YYYY-MM-DD.json`

3. **API 路由统一**
   - 创建 `app/api/bond-cn/route.ts`
   - 统一入口，支持 `?level=L1|L2|L3`

---

## 6. 实施路线图

```
Day 1 (今天)
├── 重构 lib/api/akshare-bonds.ts
├── 添加 Eastmoney 国债期货接口
└── 验证构建通过

Day 2-3
├── 创建收益率曲线数据脚本
├── 实现数据归档机制
└── 创建统一 API 路由

Week 2
├── L3 真值层对接 Master Parquet
├── 完善降级策略
└── 前端状态显示优化

Week 3
├── 端到端测试
├── 文档更新
└── 上线监控
```

---

## 7. 关键决策点

| 决策 | 建议 | 理由 |
|------|------|------|
| **实时数据源** | Eastmoney 优先 | 免key、稳定、延迟可接受 |
| **日度数据源** | AkShare | 免费、Python生态成熟 |
| **真值层** | Master Parquet | 与现有体系一致 |
| **更新频率** | 实时30s/日度1次 | 平衡实时性与成本 |
| **降级策略** | 4级降级链 | 确保任何情况下不崩溃 |

---

## 8. 风险与缓解

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| Eastmoney API 变更 | 中 | 高 | 封装适配器，快速切换 |
| AkShare 数据延迟 | 高 | 中 | 多源对比，标记陈旧 |
| 构建失败 | 低 | 极高 | 类型检查 + seed 数据 |
| 数据不一致 | 中 | 高 | 层级分离，明确标注 |

---

**结论**: 建议立即执行 P0 任务，2小时内可完成 L1 展示层稳态化，确保中国债券模块从 sample 状态升级为可稳定运行的正式方案。
