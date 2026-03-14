# macro-trend-web — 作战手册（One Page Playbook）

## 🎯 北极星定位（已拍板，不可动摇）
- **内层：Decision OS / War Room**（你与团队每天都用，永远第一优先）
- **外层：脱敏研究与框架展示**（Phase 2 完成后再开，不提前）
- **商业化：B2B 私有化/白标，小而贵**（Phase 2 验证体系有效后再谈）

## 🔒 战略死锁（2026-03-14 杨总确认，任何 Agent 不得绕过）

### 产品聚焦铁律
- **接下来 2 个月只深耕 3 个页面**：首页（决策摘要）/ 宏观（四维度+事件响应）/ Mission（作战指挥+Decision Log）
- **其余页面全部冻结**：Academy / Reports / Compare / News / Strategies 不投入新功能
- **不开外层 Investor Layer**：至少 Phase 2 完成后
- **不谈商业化**：先用自己的钱和判断跑通体系，有 Decision Log 证明有效再说

### 商业化路线（锁死，不提前推进）
- 目标客群：小型主权基金 / FO / 对冲团队（全球 10 个客户足够）
- 卖点：「AI 宏观判断体系 + 可审计决策记录」，不是「更便宜的 Bloomberg」
- 定价：年费 $50k-$200k/客户，B2B 私有化/白标
- 时机：Decision Log 跑通 + 体系有实战验证后

### 护城河建设（核心任务）
- **Decision Log 是第一护城河**：把「当时宏观环境」与「我的判断+执行」绑定存档
- 这是 Bloomberg/Wind 做不到的，也是未来对 LP 交代业绩归因的底气
- 任何新功能若不服务于「决策闭环」，一律不做

## 🔒 数据硬约束（碰不得）
- **真值来源**：仅【杨总 Master 文件】+【AkShare 官方结算镜像】
- **计价双轨**：指数=官方现货收盘；债券敞口=官方结算价(Settle)
- **数据分层**：历史分析数据（EOD 入 Supabase 可回溯） vs 实时监控（Indicative + TTL cache，不强制入库）
- **验收唯一标准**：线上 Vercel 表现；本地仅预检（push 前必须 build + 本地 API 验证）
- **失败必须优雅降级**：不炸/不空白；标注 OFF/STALE/Indicative + source + asOf

## ✅ 当前状态快照（2026-03-14 21:00 HKT）
- Phase 1 灭漂移 + 不断粮：✅ 完成（OFF=0, 3 cron 全绿，缓存命中 <220ms）
- Phase 2 宏观四维度可解释：✅ 上线（summary/evidence/confidence/trendLabel）
- Phase 2 首页 Decision Brief：✅ 上线（Regime状态栏 + 六大风险单元 + 异常提醒）
- Phase 2 Decision Log：🔲 下一个目标

## 📋 Phase 2 剩余里程碑
1. **Decision Log**：Mission 页面加调仓/观点记录入口，自动关联当时宏观快照
2. **事件响应模板**：「今晚 CPI / 下周 FOMC」→ 场景树 + 传导路径 + 风控检查表
3. **宏观 Regime 时间线**：历史 regime 回溯可视化

## 🧾 汇报格式（对杨总默认 A 档）
- **Emoji 结构化 + 单条≤500字**；结论先行 3–5 点
- 技术细节/日志/代码一律用 `<details>` 折叠；避免刷屏
- 状态锚：🟢 正常 / 🟡 注意 / 🔴 紧急

## 🧪 标准验收（每次 push 前必须过）
1. `npm run build` 无错误，40 个 static pages 全部生成
2. 本地 API 响应验证（`curl localhost:3000/api/macro-state`）
3. 线上验收：
   - `/api/market-data-realtime?no_cache=1` 200，OFF=0
   - `/api/macro-state?no_cache=1` 200，四维度全非空，含 summary
   - `/api/cron/status` 3 条 cron 全 OK

## 🗂️ 必读文件（单一真相源）
- `docs/CURRENT_FOCUS.md`（当前焦点/阻塞/下一步）
- `docs/WORKLOG.md`（已做过什么，避免重复劳动）
- `lib/config/data-dictionary.ts`（所有 symbol/indicator 的唯一字典）
- `docs/AI_BOOTSTRAP_PROMPT.md`（新 AI/新 session 唤醒顺序）
