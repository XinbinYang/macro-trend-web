# CURRENT_FOCUS (Do not let agents drift)

## ✅ 已完成（2026-03-14 18:48 HKT）
- **US B1 闭环**：Supabase 002 迁移已执行 → `/api/cron/daily-us-policy` 写入成功（sofr=3.65, core_pce_yoy=3.0557） → `/api/macro-state` 线上验收通过（policy/inflation 主指标恢复显示，source=Supabase，stale=false）。

## 🕶️ 外层页面策略（杨总已确认）
- **至少 Phase 2 完成后再开外层 Investor Layer**（避免分散资源与烧 token）。

## 🎯 下一阶段目标（Phase 1：数据层灭漂移 + 不断粮）
1) **data-dictionary 全链路引用统一**：扫描剩余 API/配置中的硬编码 symbol/indicator，全部改为引用 `lib/config/data-dictionary.ts`。
2) **Mission Control 健康度常驻**：cron 健康（CN+US 全绿）、数据新鲜度、缺口清单自动化展示。
3) **snapshot API 剩余 OFF 项修复**：XAUUSD=X（Gold 行情）仍 OFF；FX pair 的 Supabase/Yahoo 兜底链路待完善。

## 🧱 当前阻塞
- 无重大阻塞（B1 已闭环）。

## ▶️ 下一步动作（按顺序）
1) 扫描 `app/api/` 与 `components/` 中硬编码的 symbol/indicator id，列出漂移入口清单。
2) 逐个修复：改为引用 data-dictionary，build 通过后 push。
3) 修复 snapshot 中 XAUUSD=X OFF（确认 Supabase 是否有 gold truth row 或改用正确 Yahoo symbol）。
4) Mission Control 页面增加 US cron 健康卡片。
