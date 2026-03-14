# CURRENT_FOCUS (Do not let agents drift)

## 🎯 本周唯一目标
- **US B1 闭环**：执行 Supabase 迁移 `002_add_us_sofr_core_pce.sql` → `/api/cron/daily-us-policy` 写入 → 宏观页 policy/inflation 主指标恢复显示（并保持可回溯/可审计）。

## 🧱 当前阻塞
- Browser Relay/Chrome attach 不稳定，无法接管 Supabase SQL Editor 执行 002 迁移。
- 线上 `/api/cron/daily-us-policy` 部署仍可能出现 404（需等待/确认 Vercel 最新部署生效）。

## ▶️ 下一步动作（按顺序）
1) 恢复 Browser Relay attach（用户回到电脑：Supabase tab Relay OFF→ON）。
2) 在 Supabase SQL Editor 运行 `drizzle/migrations/002_add_us_sofr_core_pce.sql`。
3) 触发一次 `/api/cron/daily-us-policy` 并验证：
   - `macro_us.sofr`、`macro_us.core_pce_yoy` 非空
   - `/api/macro-indicators` 对应指标不缺数
   - 页面端 policy/inflation 卡恢复显示且 source/Indicative 标注正确
