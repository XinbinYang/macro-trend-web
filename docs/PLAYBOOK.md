# macro-trend-web — 作战手册（One Page Playbook）

## 🎯 北极星定位（已拍板）
- **内层：Decision OS / War Room**（你与团队每天都用）
- **外层：脱敏研究与框架展示**（延迟、只读）
- **商业化：B2B 私有化/白标，小而贵**（后置）

## 🔒 硬约束（碰不得）
- **真值来源**：仅【杨总 Master 文件】+【AkShare 官方结算镜像】
- **计价双轨**：指数=官方现货收盘；债券敞口=官方结算价(Settle)
- **数据分层**：历史分析数据（EOD 入 Supabase 可回溯） vs 实时监控（Indicative + TTL cache，不强制入库）
- **验收唯一标准**：线上 Vercel 表现；本地仅预检
- **失败必须优雅降级**：不炸/不空白；标注 OFF/STALE/Indicative + source + asOf

## 🧱 P0 主线（先止血→再补齐→再灭漂移）
1) **不断粮**：Cron 日更入库（EOD）
2) **灭漂移**：全链路引用 `lib/config/data-dictionary.ts`
3) **体验稳定**：market-data-realtime 守护（并发/超时/降级）

## ✅ 当前状态快照（写给新接手的 Agent）
- **CN**：`macro_cn` 已增列并已上线（CN2Y/CN5Y/CN10Y + credit_spread_5y）
  - cron：`/api/cron/daily-cn-rates` ✅
- **US B1**：SOFR + Core PCE YoY 工程已完成，但仍需：
  - Supabase 执行迁移：`drizzle/migrations/002_add_us_sofr_core_pce.sql`
  - 线上路由可用：`/api/cron/daily-us-policy`（部署后从 404 恢复）

## 🧪 标准验收（每次上线必须过）
- API：
  - `/api/market-data-realtime?no_cache=1` 200（无 client exception）
  - `/api/market-data?type=snapshot&no_cache=1` 200（truth key 命中合理）
  - `/api/macro-state?no_cache=1` 200（宏观四象限不空）
- CN：`/api/cron/daily-cn-rates` 200 并写入当日/最近交易日
- US：迁移后 `macro_us.sofr/core_pce_yoy` 可写入与回读

## 🗂️ 必读文件（单一真相源）
- `docs/EXECUTION_STATUS.md`（当前阻塞/下一步）
- `docs/WORKLOG.md`（已做过什么，避免重复劳动）
- `lib/config/data-dictionary.ts`（所有 symbol/indicator 的唯一字典）
