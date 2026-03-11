# Acceptance Checklist (Release Gate)

目的：每次合并/上线前，Main 必须逐条过一遍，确保 **不误导、可审计、可回滚、移动端可用**。

> 原则：宁可显示 OFF/—/SAMPLE，也不允许“看似真实”的假数据。

---

## A. Truthfulness / 口径（硬门槛）
- [ ] 所有数据展示都有明确状态：`LIVE / OFF / SAMPLE / MOCK`（禁止默认假装 LIVE）
- [ ] AkShare 数据口径：**EOD/收盘/日频**（不得暗示实时）
- [ ] Brave Search 资讯口径：**Index 聚合 near real-time**（不得标“实时专线”）
- [ ] AI 解读：必须真 AI
  - [ ] 无 key → 明确 OFF/503（或 UI 显示 OFF）
  - [ ] provider 失败 → 明确 OFF/502（或 UI 显示 OFF）
  - [ ] 禁止模板/Mock 冒充 AI 输出

## B. Auditability / 可审计
- [ ] API 返回包含：`source`（数据/模型来源）、`asOf/updatedAt`（时间戳）
- [ ] LLM API 返回包含：`usage`（tokens）
- [ ] 关键接口可用 curl/浏览器直接验证：
  - [ ] `/api/macro-indicators`
  - [ ] `/api/news`
  - [ ] `/api/nav?strategy=...`

## C. Engineering / 工程门槛
- [ ] `npm run lint` 通过（允许 warning，但不得新增 error）
- [ ] `npm run build` 通过
- [ ] 无敏感信息泄露：无 key 硬编码、无私有链接写死
- [ ] 有回滚点：commit message 清晰；必要时保留旧路径/feature flag

## D. UX / 移动端与可达性
- [ ] 移动端导航一致：关键页面可达（/ /news /reports /portfolio /compare /nav /assets/[symbol] /strategies）
- [ ] 页面首屏不拥挤：指标块在移动端不挤爆（响应式 grid）
- [ ] 错误态友好：OFF/失败时明确提示，不出现“空白无解释”

## E. Release Notes / 对外更新
- [ ] Discord 三条置顶已更新（只编辑不刷屏）：
  - [ ] Progress Panel
  - [ ] Execution Log
  - [ ] Live Tracker

