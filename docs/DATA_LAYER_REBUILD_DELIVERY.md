# 📊 数据层重构交付报告

## 任务概述

在 `macro-trend-web` repo 内实施数据层架构重构，建立「历史=日更入库、实时=TTL cache」的两层架构，并统一数据字典。

---

## ✅ 变更清单

### 1. 数据字典 (Data Dictionary)

**文件**: `lib/config/data-dictionary.ts` (新增)

- 单一 Symbol 映射表 (`SYMBOLS`, `SYMBOL_REGIONS`, `SYMBOL_CATEGORIES`, `SYMBOL_DATA_SOURCES`)
- 单一 Indicator 映射表 (`INDICATORS`, `INDICATOR_DB_COLUMNS`, `INDICATOR_DISPLAY_NAMES`)
- 消灭 `us_unemployment` vs `us_unemployment_rate` 类漂移

### 2. Schema 变更 (Supabase)

**文件**: `drizzle/migrations/001_add_cn_rates.sql` (新增)

```sql
-- 新增字段
ALTER TABLE macro_cn ADD COLUMN yield_2y DECIMAL(8,4);
ALTER TABLE macro_cn ADD COLUMN yield_5y DECIMAL(8,4);
ALTER TABLE macro_cn ADD COLUMN yield_10y DECIMAL(8,4);
ALTER TABLE macro_cn ADD COLUMN credit_spread_5y DECIMAL(8,2);
ALTER TABLE macro_cn ADD COLUMN rates_source VARCHAR(50);
ALTER TABLE macro_cn ADD COLUMN rates_updated_at TIMESTAMP WITH TIME ZONE;
```

### 3. CN Rates Cron (日更入库)

**文件**: `app/api/cron/daily-cn-rates/route.ts` (新增)

- 数据源: ChinaMoney (https://www.chinamoney.com.cn)
- 拉取: CYCC000 (国债曲线) + CYCC82B (AAA中短票曲线)
- 计算: `credit_spread_5y = AAA_5Y - Treasury_5Y` (单位: bp)
- 写入: Supabase `macro_cn` 表

### 4. 实时层 (Market-Data-Realtime)

**文件**: `app/api/market-data-realtime/route.ts` (重构)

- 明确标注 `layer` 参数: `?layer=historical` | `?layer=realtime`
- 所有外部源标注为 `isIndicative: true`
- 维持既有并发/超时护栏 (`MAX_CONCURRENCY`, `PER_QUOTE_TIMEOUT_MS`)
- **不写库**: 仅做监控和展示

---

## 📁 关键文件 Diff 摘要

### lib/config/data-dictionary.ts (NEW)

```
+ 导出常量:
+   - SYMBOLS: 所有 canonical 市场数据 symbol
+   - INDICATORS: 所有 canonical 宏观 indicator
+   - SYMBOL_REGIONS / SYMBOL_CATEGORIES: 分类映射
+   - INDICATOR_DB_COLUMNS: DB 列映射
```

### app/api/market-data-realtime/route.ts (重构)

```diff
+  import { getCnRateSymbols, getUsTreasurySymbols } from "@/lib/config/data-dictionary"
+  export type DataLayer = "historical" | "realtime"
+  const layer = searchParams.get("layer") || "realtime"
+  // 明确标注 isIndicative
+  dataSource: isFromSupabase ? "LIVE" : "indicative"
```

### app/api/cron/daily-cn-rates/route.ts (NEW)

```
+ ChinaMoney 收益率曲线抓取
+ 信用利差计算 (AAA 5Y - 国债 5Y)
+ 写入 Supabase macro_cn
```

---

## 🔄 如何回滚

### 1. 回滚 Schema 变更

```sql
-- 在 Supabase SQL Editor 执行
DROP INDEX IF EXISTS idx_macro_cn_date_rates;
ALTER TABLE macro_cn DROP COLUMN IF EXISTS credit_spread_5y;
ALTER TABLE macro_cn DROP COLUMN IF EXISTS yield_10y;
ALTER TABLE macro_cn DROP COLUMN IF EXISTS yield_5y;
ALTER TABLE macro_cn DROP COLUMN IF EXISTS yield_2y;
ALTER TABLE macro_cn DROP COLUMN IF EXISTS rates_source;
ALTER TABLE macro_cn DROP COLUMN IF EXISTS rates_updated_at;
```

### 2. 回滚代码变更

```bash
git checkout HEAD~1 -- app/api/market-data-realtime/route.ts
# 删除新增文件
rm lib/config/data-dictionary.ts
rm app/api/cron/daily-cn-rates/route.ts
rm drizzle/migrations/001_add_cn_rates.sql
```

### 3. 禁用 Cron

在 Vercel Dashboard 移除 `daily-cn-rates` cron job，或设置环境变量 `CRON_SECRET` 为无效值。

---

## 🗓️ 下一步

1. **执行 Schema 迁移**: 在 Supabase SQL Editor 运行 `drizzle/migrations/001_add_cn_rates.sql`
2. **配置 Cron**: 在 Vercel 添加 `daily-cn-rates` cron (建议运行时间: 18:00 HKT)
3. **验证**: 首次运行后检查 `macro_cn` 表新字段是否有数据

---

## ⚠️ 约束遵守情况

| 约束 | 状态 |
|------|------|
| 真值层不接 Yahoo | ✅ 未引入 Yahoo 写入 |
| 展示层外部源标注 indicative | ✅ 所有 Eastmoney/Yahoo 源标记 `isIndicative: true` |
| 避免刷屏 | ✅ 单次 API 调用，无轮询 |
| 结构化报告 | ✅ 本文档 |

---

*Generated: 2026-03-14*
