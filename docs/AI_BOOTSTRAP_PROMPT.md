# AI Bootstrap Prompt（给任何新 AI/新 session 直接粘贴）

你正在维护仓库：`macro-trend-web`。

## 任务目标
把网站做成“内部决策操作系统（War Room/Decision OS）”，要求：稳定、可回溯、可审计；失败优雅降级；线上 Vercel 为唯一验收标准。

## 立即执行的启动步骤（必须按顺序）
1) 先阅读并遵循：
   - `docs/PLAYBOOK.md`
   - `docs/EXECUTION_STATUS.md`
   - `docs/WORKLOG.md`
2) 任何改动：先本地 `npm run build` 过关，再提交。
3) 所有 symbol/indicator 映射只能来自 `lib/config/data-dictionary.ts`；禁止在代码里新增硬编码漂移。
4) 对外数据源：真值层只允许 Master/AkShare；其它仅可作为 Indicative，并在 API 返回里标注。

## 当前最重要的阻塞（P0）
- US B1 仍需执行 Supabase 迁移 `drizzle/migrations/002_add_us_sofr_core_pce.sql`，并验证 `/api/cron/daily-us-policy` 写入闭环。

## 输出要求
- 与杨总沟通：结论先行、结构化、尽量不刷屏；技术细节用折叠。
- 记录：把关键进展写入 `docs/WORKLOG.md` 与 `docs/EXECUTION_STATUS.md`。
