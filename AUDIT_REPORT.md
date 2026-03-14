# Macro-Trend-Web 代码审计报告

> 审计时间: 2026-03-14  
> 审计Agent: Data-Nexus-Agent (Kimi)  
> 工作目录: `/Users/noah/.openclaw/workspace/macro-trend-web`

---

## 🔴 高优先级（影响数据正确性）

### 1. Symbol 硬编码漂移（未通过 data-dictionary 引用）

| 文件 | 行号 | 问题描述 |
|------|------|----------|
| `app/api/market-data/route.ts` | 41-42, 48, 52, 56-57, 63-66, 70 | 直接硬编码 `^VIX`, `^RUT`, `399006.SZ`, `HSI`, `GC=F`, `CL=F`, `US10Y`, `US2Y`, `US5Y`, `US30Y`, `DX=F`，未通过 `SYMBOLS` 常量引用 |
| `app/api/market-data-realtime/route.ts` | 14-16, 28, 37, 81, 97-102, 436, 454, 472, 530-532, 555 | 硬编码 `DX=F`, `CN2Y`, `CN5Y`, `CN10Y`, `CN_CREDIT_SPREAD_5Y`, `US2Y`, `US5Y`, `US10Y`, `US30Y`, `000300.SH`, `000905.SH`, `399006.SZ`, `HSI` |
| `app/api/historical-data/route.ts` | 42-47 | 硬编码 `000300.SH`, `000905.SH`, `399006.SZ`, `HSI` 的映射 |
| `app/api/risk-exposure/route.ts` | 62, 82 | 硬编码 `GC=F`, `CL=F` 作为资产映射键 |
| `app/assets/page.tsx` | 47-48, 52-55, 62-65, 74-75 | 硬编码 `^GSPC`, `^NDX`, `000300.SH`, `000905.SH`, `399006.SZ`, `US2Y`, `US5Y`, `US10Y`, `US30Y`, `GC=F`, `CL=F` |
| `app/assets/[symbol]/page.tsx` | 56-57 | 硬编码 `GC=F`, `CL=F` 的资产描述 |
| `app/compare/page.tsx` | 29 | 硬编码 `CL=F` |
| `server/routers/_app.ts` | 92, 103 | 硬编码 `GC=F`, `SI=F` |
| `server/routers.ts` | 89, 101 | 硬编码 `GC=F`, `SI=F` |
| `server/market-data.ts` | 405-407, 653, 711-713 | 硬编码 `GC=F`, `SI=F`, `CL=F` |
| `server/macro-indicators.ts` | 75-76, 79, 89-90 | 硬编码 `GC=F`, `CL=F`, `^VIX`, `HG=F`, `^GSPC` |
| `server/portfolio-engine.ts` | 57 | 硬编码 `GC=F` |
| `test-yahoo.ts` | 19 | 硬编码 `GC=F` |
| `config/watchlist_default.json` | 多处 | 硬编码 `^NDX`, `^GSPC`, `^RUT`, `^VIX`, `US2Y`, `US5Y`, `US10Y`, `US30Y`, `GC=F`, `CL=F`, `HG=F`, `DX=F` 等（配置文件可接受，但建议校验） |

### 2. Indicator ID 硬编码漂移（与 framework 不一致）

| 文件 | 行号 | 问题描述 |
|------|------|----------|
| `app/api/dashboard/route.ts` | 88-109 | 硬编码 indicator 映射表，部分 id 如 `us_m2_yoy`, `us_fci` 在 macro_framework_v1.json 中标记为 `PENDING_SCHEMA`，但代码中仍硬编码引用 |
| `app/api/macro-state/route.ts` | 311-335 | 同上，硬编码 indicator 映射 |
| `app/api/macro-indicators/route.ts` | 53-75 | 同上，硬编码 indicator 映射 |

**具体问题:**
- `us_m2_yoy`: framework 中标记为 `PENDING_SCHEMA` (macro_us 暂无 m2_yoy 列)，但代码中仍尝试查询
- `us_fci`: framework 中标记为 `PENDING_SCHEMA` (macro_us 暂无 fci 列)，但代码中仍尝试查询

### 3. 数据口径不一致

| 问题 | 描述 |
|------|------|
| `us_m2_yoy` | framework 中定义为 `source: "PENDING_SCHEMA"`，但 data-dictionary 中定义为 `source: "PENDING_SCHEMA"`（一致，但数据未就绪） |
| `us_fci` | framework 中定义为 `source: "PENDING_SCHEMA"`，但 data-dictionary 中定义为 `source: "PENDING_SCHEMA"`（一致，但数据未就绪） |
| `cn_credit_spread_5y` | data-dictionary 中 unit 为 `bp`，但 framework 中未定义该 indicator（仅在 dimensions.liquidity.cn.aux 中隐式使用） |

---

## 🟡 中优先级（影响维护性）

### 1. API 性能风险 - 仍有 `no-store` 或 `revalidate = 0`

| 文件 | 行号 | 问题描述 |
|------|------|----------|
| `app/api/historical-data/route.ts` | 6 | `export const revalidate = 0` |
| `app/api/dashboard/route.ts` | 26 | `export const revalidate = 0` |
| `app/api/macro-us/route.ts` | 5 | `export const revalidate = 0` |
| `app/api/macro-cn/route.ts` | 5 | `export const revalidate = 0` |
| `app/api/macro-state/route.ts` | 无 | 已优化为条件缓存（no_cache 参数控制）✅ |
| `app/api/macro-indicators/route.ts` | 6 | `export const revalidate = 0` |
| `app/api/cron/daily-cn-rates/route.ts` | 6 | `export const revalidate = 0`（cron 任务可接受） |
| `app/api/cron/daily-us-policy/route.ts` | 6 | `export const revalidate = 0`（cron 任务可接受） |
| `app/api/cron/status/route.ts` | 5 | `export const revalidate = 0` |
| `app/api/cron/monthly-cn-policy/route.ts` | 5 | `export const revalidate = 0`（cron 任务可接受） |
| `app/api/cron/daily-yields/route.ts` | 5 | `export const revalidate = 0`（cron 任务可接受） |

### 2. API 性能风险 - 串行 await（本可并行 Promise.all）

| 文件 | 行号 | 问题描述 |
|------|------|----------|
| `app/page.tsx` | 148-153 | `fetch("/api/dashboard")` 和 `fetch("/api/market-data-realtime")` 串行执行，应使用 Promise.all |
| `app/data-test/page.tsx` | 29-73 | 三个测试请求串行执行，应使用 Promise.all |
| `app/portfolio/page.tsx` | 219-269 | 四个 fetch 请求串行执行，应使用 Promise.all |
| `app/api/market-data/route.ts` | 103, 140 | `fetchAllQuotesWithFallback()` 内部使用 Promise.all，但外层调用是串行的（可接受） |
| `app/api/dashboard/route.ts` | 289 | `fetchNav()` 内部 fetch 调用 `/api/nav` 是串行的，但已在 Promise.all 中（可接受） |

### 3. API 性能风险 - 没有超时保护的外部 API 调用

| 文件 | 行号 | 问题描述 |
|------|------|----------|
| `app/api/reports/generate/route.ts` | 48, 94, 363 | DeepSeek 和 OpenRouter API 调用没有超时保护 |
| `app/api/cron/monthly-cn-policy/route.ts` | 27, 37 | PBoC 网站抓取没有超时保护 |
| `app/api/cron/daily-yields/route.ts` | 27 | FRED API 调用没有超时保护 |
| `lib/api/fred-api.ts` | 多处 | FRED API 调用没有超时保护 |
| `lib/api/eastmoney-api.ts` | 多处 | Eastmoney API 调用没有超时保护 |
| `lib/api/yahoo-api.ts` | 多处 | Yahoo API 调用没有超时保护 |

---

## 🟢 低优先级（可后置）

### 1. 代码重复

| 文件 | 问题描述 |
|------|----------|
| `app/api/dashboard/route.ts`, `app/api/macro-state/route.ts`, `app/api/macro-indicators/route.ts` | 三个文件都有几乎相同的 `mapIndicatorToFetchParams` 函数，应提取到共享库 |

### 2. 类型定义分散

| 文件 | 问题描述 |
|------|----------|
| `lib/config/index.ts` | 类型定义与 data-dictionary.ts 有部分重复，建议统一 |

---

## 💀 死代码

| 文件路径 | 原因 |
|----------|------|
| `app/api/ai-insight/route.ts` | 仅返回 `{ success: false, error: "AI insight disabled" }`，前端无调用 |
| `app/api/asset-analysis/route.ts` | 仅返回 `{ success: false, error: "Asset AI analysis disabled" }`，前端无调用 |
| `app/api/economic-calendar/route.ts` | 返回硬编码的模拟数据，无真实数据源，前端可能未使用 |
| `app/api/macro-regime/route.ts` | 读取本地文件 `data/macro/us/regime.json`，但该文件可能不存在，且 `/api/macro-state` 已提供更完整功能 |
| `app/api/macro-monitor/route.ts` | 读取本地文件 `data/macro/monitor-variables.json`，该文件可能不存在 |
| `app/api/macro-history/route.ts` | 读取本地文件 `data/macro/regime-history.json`，该文件可能不存在 |

**待确认:**
- `app/api/volatility/route.ts` - 读取 `data/nav/beta70/latest.json`，如果 NAV 数据已迁移到 Supabase，此 API 可能已废弃

---

## ✅ 已正确引用 data-dictionary 的文件

- `app/assets/[symbol]/page.tsx` - 正确导入 `SYMBOL_DISPLAY_NAMES`
- `lib/config/index.ts` - 正确导出配置类型
- `lib/api/fallback-utils.ts` - 部分使用，但仍有硬编码

---

## 📊 数据口径对比汇总

### framework 中定义但 data-dictionary 中缺失的 indicators

| Indicator ID | Framework 定义 | Data-Dictionary 状态 |
|--------------|----------------|----------------------|
| `us_m2_yoy` | ✅ 定义 (PENDING_SCHEMA) | ✅ 定义 (PENDING_SCHEMA) |
| `us_fci` | ✅ 定义 (PENDING_SCHEMA) | ✅ 定义 (PENDING_SCHEMA) |

### 两者 unit/source 不一致的 indicators

| Indicator ID | Framework Unit | Data-Dictionary Unit | 状态 |
|--------------|----------------|----------------------|------|
| `cn_credit_spread_5y` | 未定义 | `bp` | ⚠️ framework 缺失 |

---

## 🎯 修复建议（供 MiniMax 参考）

### 高优先级修复

1. **统一 Symbol 引用**: 将所有硬编码的 ticker symbol 替换为 `SYMBOLS` 常量引用
   ```typescript
   // 之前
   { symbol: "GC=F", ticker: "GC=F", ... }
   
   // 之后
   import { SYMBOLS } from "@/lib/config/data-dictionary";
   { symbol: SYMBOLS.COM_GOLD, ticker: SYMBOLS.COM_GOLD, ... }
   ```

2. **统一 Indicator 引用**: 将所有硬编码的 indicator id 替换为 `INDICATORS` 常量引用
   ```typescript
   // 之前
   "us_ism_services_pmi": { table: "macro_us", field: "ism_services", ... }
   
   // 之后
   import { INDICATORS } from "@/lib/config/data-dictionary";
   [INDICATORS.US_ISM_SERVICES_PMI]: { table: "macro_us", field: "ism_services", ... }
   ```

3. **移除 PENDING_SCHEMA 的硬编码查询**: 在 `us_m2_yoy` 和 `us_fci` 数据就绪前，从 API 映射表中移除

### 中优先级修复

1. **添加 Promise.all 并行化**: 对串行的独立 fetch 调用使用 Promise.all
2. **添加超时保护**: 为所有外部 API 调用添加 AbortController 超时
3. **优化缓存策略**: 为合适的 API 添加合理的 revalidate 时间

### 低优先级修复

1. **提取公共函数**: 将 `mapIndicatorToFetchParams` 提取到共享库
2. **清理死代码**: 确认后删除废弃的 API 路由

---

*报告生成完成 - Data-Nexus-Agent*
