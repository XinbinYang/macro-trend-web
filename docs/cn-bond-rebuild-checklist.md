# 中国债券数据稳态重建 - 实施检查清单

## P0: 立即落地 (今天)

### 1. 后端适配器重构 ✅
- [x] 创建 `lib/api/bond-cn.ts` (统一适配器)
- [x] 实现 L1/L2/L3 三级数据架构
- [x] 实现 4 级降级链 (Eastmoney → AkShare → Cache → Seed)
- [x] 保持旧接口兼容 (`getChinaBondFutures`, `getChinaBondYieldCurve`)

### 2. API 路由创建 ✅
- [x] 创建 `app/api/bond-cn/route.ts`
- [x] 支持查询参数: `level`, `realtime`, `fallback`
- [x] 实现错误兜底 (返回 200 避免前端崩溃)
- [x] 添加缓存控制头

### 3. 数据同步脚本 ✅
- [x] 创建 `scripts/sync_cn_bond_data.py`
- [x] 支持国债期货日度数据获取
- [x] 支持收益率曲线获取
- [x] 实现数据归档机制

### 4. 验证构建
- [ ] 运行 `npm run type-check`
- [ ] 运行 `npm run build`
- [ ] 验证无类型错误

## P1: 本周内落地

### 5. 数据目录初始化
- [ ] 创建 `data/bond-cn/` 目录
- [ ] 创建 `data/bond-cn/archive/` 目录
- [ ] 创建 `data/bond-cn/yield-curve/` 目录
- [ ] 生成初始 seed 数据

### 6. 前端 Hook 封装
- [ ] 创建 `lib/hooks/useCnBondData.ts`
- [ ] 集成 React Query
- [ ] 实现自动刷新逻辑

### 7. 状态显示组件
- [ ] 创建 `components/bond/BondDataBadge.tsx`
- [ ] 实现 LIVE/DELAYED/STALE/OFF 状态显示
- [ ] 集成到现有资产卡片

### 8. 定时任务配置
- [ ] 配置每日 17:30 运行数据同步脚本
- [ ] 添加日志监控
- [ ] 配置异常告警

## P2: 下周落地

### 9. L3 真值层对接
- [ ] 对接 Master Parquet 数据
- [ ] 实现 `/api/bond-cn?level=L3` 路由
- [ ] 添加访问控制 (仅内部使用)

### 10. 数据质量监控
- [ ] 实现数据异常检测 (价格跳变 > 5%)
- [ ] 添加数据新鲜度检查
- [ ] 实现自动降级触发

### 11. 测试覆盖
- [ ] 单元测试: 适配器函数
- [ ] 集成测试: API 路由
- [ ] E2E 测试: 前端展示

## P3: 后续优化

### 12. 实时推送
- [ ] 评估 WebSocket 方案
- [ ] 实现服务端推送
- [ ] 前端实时更新

### 13. 数据可视化
- [ ] 收益率曲线图表
- [ ] 期货持仓量分析
- [ ] 历史数据对比

### 14. 文档完善
- [ ] API 文档 (OpenAPI)
- [ ] 数据字典
- [ ] 运维手册

---

## 快速验证命令

```bash
# 1. 类型检查
cd macro-trend-web
npm run type-check

# 2. 构建测试
npm run build

# 3. 数据同步测试
python3 scripts/sync_cn_bond_data.py --out-dir data/bond-cn

# 4. API 测试
curl "http://localhost:3000/api/bond-cn?level=L1"
curl "http://localhost:3000/api/bond-cn?level=L2"

# 5. 旧接口兼容测试
curl "http://localhost:3000/api/market-data-realtime"
```

---

## 关键文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `lib/api/bond-cn.ts` | ✅ | 统一适配器 |
| `app/api/bond-cn/route.ts` | ✅ | API 路由 |
| `scripts/sync_cn_bond_data.py` | ✅ | 数据同步脚本 |
| `docs/cn-bond-rebuild-plan.md` | ✅ | 设计方案文档 |
| `lib/api/akshare-bonds.ts` | 🔄 | 待废弃，保持兼容 |

---

## 风险监控点

1. **Eastmoney API 变更**: 监控接口响应，异常时自动降级
2. **AkShare 数据延迟**: 对比多源数据，标记陈旧数据
3. **构建失败**: CI/CD 中添加类型检查步骤
4. **数据不一致**: 明确标注数据来源和层级

---

**最后更新**: 2026-03-13
