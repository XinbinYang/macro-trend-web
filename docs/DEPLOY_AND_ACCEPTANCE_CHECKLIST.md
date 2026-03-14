# Deploy & Acceptance Checklist（每次上线/合并前必过）

## 0) 变更前
- [ ] 明确本次目标（P0/P1）与验收口径
- [ ] 检查 `docs/EXECUTION_STATUS.md` 是否需要更新阻塞项

## 1) 本地质量闸门（不过不许合并）
- [ ] `npm run build` 通过（lint+typecheck 全绿）

## 2) 线上验收闸门（唯一标准）
- [ ] `/api/market-data-realtime?no_cache=1` 200，响应速度可接受，无 client-side exception
- [ ] `/api/market-data?type=snapshot&no_cache=1` 200，truth key 命中合理，Indicative 标注正确
- [ ] `/api/macro-state?no_cache=1` 200，四维度不空
- [ ] `/mission` 可打开；Mission 卡片数据正常

## 3) Cron 验收
- [ ] CN：`/api/cron/daily-cn-rates` 200，写入 `macro_cn` 当日/最近交易日
- [ ] US：若涉及 B1/政策/通胀：相关 cron 端点可访问且写入闭环

## 4) 留痕
- [ ] 更新 `docs/WORKLOG.md`（一条记录：做了什么 + commit + 验收结果）
- [ ] 更新 `docs/EXECUTION_STATUS.md`（下一步/阻塞）
