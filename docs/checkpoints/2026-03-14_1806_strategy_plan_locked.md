# Checkpoint — 2026-03-14 18:06 HKT — 战略规划确认锁死（内层优先）

## 🟢 杨总确认（口径锁死）
- **路线图确认**：按 Phase 0→1→2→3 推进（先内层 War Room / Decision OS）。
- **本周唯一目标**：US B1 闭环
  - 执行 Supabase 迁移：`drizzle/migrations/002_add_us_sofr_core_pce.sql`
  - 触发：`/api/cron/daily-us-policy` 写入
  - 验收：`/api/macro-indicators` 中 `us_sofr`、`us_core_pce_yoy` 非空；宏观页 policy/inflation 主指标恢复显示；source/Indicative 标注正确；可回溯/可审计。
- **外层页面策略**：至少 **Phase 2 完成后** 再开启 Investor Layer（避免分散资源与 token 消耗）。

## 🟡 当前阻塞
- Browser Relay/Chrome attach 不稳定，导致无法接管 Supabase SQL Editor 执行 002 迁移。
- Vercel 部署对 `/api/cron/daily-us-policy` 的路由暴露仍需确认（存在 404 现象）。

## ▶️ 下一步动作（唯一正确顺序）
1) 用户回到电脑后：Supabase 项目页 Relay **OFF→ON** 重新 attach。
2) 我接管 Supabase SQL Editor 执行 002 迁移。
3) 触发一次 `/api/cron/daily-us-policy` 并完成线上验收。

## 📎 关联文件（单一真相源）
- `docs/PLAYBOOK.md`
- `docs/CURRENT_FOCUS.md`
- `docs/AI_BOOTSTRAP_PROMPT.md`
- `docs/DEPLOY_AND_ACCEPTANCE_CHECKLIST.md`
- `docs/WORKLOG.md` / `docs/EXECUTION_STATUS.md`
