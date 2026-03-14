# Data Dictionary Risk Checklist (P0/P1/P2)

## P0 — 必须先修（否则必然反复出 bug / 口径污染）
- [ ] `^GSPC` 映射：`SP500` vs `SPX` 统一（Supabase/SQLite/前端一致）
- [ ] FX 键统一：`DXY` vs `DX=F` vs `USDX.FX`（明确落库表的主键字段）
- [ ] US10Y 语义拆分：收益率(%) vs 价格型 proxy（命名+UI 文案强制区分）
- [ ] 前端/接口只允许使用 canonical indicatorId（消灭 `us_unemployment` 这类漂移）
- [ ] `supabase/schema.sql` 文档更新为当前真实表结构（避免“文档误导”）

## P1 — 重要但可并行
- [ ] CN rates/credit spread 日更入库链路上线验证（cron + schema + 展示）
- [ ] 统一 /api/market-data（snapshot）与 /api/market-data-realtime（monitor）职责边界
- [ ] 为 market-data-realtime 增加 TTL cache（服务端缓存，降低外部源压力）

## P2 — 体验优化
- [ ] 指标/资产卡片统一展示 source 与 indicative/Truth 标签
- [ ] 缺数时提供“why OFF”解释（note 字段）
- [ ] 回归测试脚本固化（线上验收清单自动化）
