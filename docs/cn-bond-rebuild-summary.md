# 中国债券数据稳态重建方案 - 执行总结

## 任务完成状态

✅ **已完成**: 中国债券模块从 sample/兼容状态升级到稳态方案的 P0 阶段

---

## 交付物清单

### 1. 设计方案文档
**文件**: `macro-trend-web/docs/cn-bond-rebuild-plan.md`

包含:
- 最小稳态方案 (3层数据架构)
- 数据源与更新频率矩阵
- 前后端改造建议
- 4级降级策略
- 落地优先级 (P0/P1/P2/P3)

### 2. 统一适配器
**文件**: `macro-trend-web/lib/api/bond-cn.ts`

特性:
- L1/L2/L3 三级数据分层
- 4级降级链: Eastmoney → AkShare → Cache → Seed
- 保持旧接口兼容 (`getChinaBondFutures`, `getChinaBondYieldCurve`)
- 数据验证和异常处理

### 3. API 路由
**文件**: `macro-trend-web/app/api/bond-cn/route.ts`

特性:
- 统一入口: `/api/bond-cn?level=L1|L2|L3`
- 支持实时/日度切换
- 错误兜底 (返回200避免前端崩溃)
- 智能缓存控制

### 4. 数据同步脚本
**文件**: `macro-trend-web/scripts/sync_cn_bond_data.py`

特性:
- AkShare 国债期货数据获取
- 中债估值收益率曲线获取
- 自动归档机制
- 失败回退保护

### 5. 实施检查清单
**文件**: `macro-trend-web/docs/cn-bond-rebuild-checklist.md`

### 6. Seed 数据
**文件**: `macro-trend-web/data/bond-cn/latest.json`

---

## 核心设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 实时数据源 | Eastmoney 优先 | 免key、稳定、延迟可接受 |
| 日度数据源 | AkShare | 免费、Python生态成熟 |
| 数据层级 | L1/L2/L3 | 展示/分析/真值分离 |
| 降级策略 | 4级链 | 确保任何情况下不崩溃 |
| 接口兼容 | 保持旧接口 | 非破坏性升级 |

---

## 数据源矩阵

| 数据类别 | 推荐源 | 备用源 | 更新频率 |
|----------|--------|--------|----------|
| 国债期货实时 | Eastmoney | Sina/腾讯 | 实时(15s延迟) |
| 国债期货日度 | AkShare (中金所) | CFFEX官网 | 日度 EOD |
| 中债估值曲线 | AkShare (中债登) | Wind/Choice | 日度 EOD |
| 中债总财富指数 | Master Parquet | AkShare | 日度 EOD |

---

## 降级策略

```
Level 1 (正常)
├── 实时: Eastmoney API
├── 日度: AkShare CFFEX
└── 曲线: AkShare 中债估值

Level 2 (轻度降级)
├── 实时: 本地缓存 (5分钟内)
├── 日度: 昨日归档数据
└── 曲线: 昨日曲线

Level 3 (重度降级)
├── 实时: 显示 "OFF"
├── 日度: 最近可用日度数据
└── 曲线: 最近可用曲线

Level 4 (完全离线)
└── 所有数据标记为 "OFF"
    └── 显示 seed 数据 + 提示
```

---

## 可立即落地的部分 (P0)

✅ **已完成**:
1. 统一适配器 (`lib/api/bond-cn.ts`)
2. API 路由 (`app/api/bond-cn/route.ts`)
3. 数据同步脚本 (`scripts/sync_cn_bond_data.py`)
4. Seed 数据初始化
5. 构建验证通过

**验证命令**:
```bash
cd macro-trend-web
npm run type-check  # 通过
npm run build       # 通过
```

---

## 后续建议 (P1/P2)

### P1 (本周内)
- 配置定时任务 (每日 17:30 运行同步脚本)
- 前端 Hook 封装 (`useCnBondData`)
- 状态显示组件 (`BondDataBadge`)

### P2 (下周)
- L3 真值层对接 Master Parquet
- 数据质量监控 (异常检测)
- 测试覆盖

### P3 (后续)
- WebSocket 实时推送
- 数据可视化增强
- 完整文档

---

## 关键文件路径

```
macro-trend-web/
├── app/api/bond-cn/route.ts          # 新API路由
├── lib/api/bond-cn.ts                 # 统一适配器 (重构)
├── lib/api/akshare-bonds.ts           # 旧适配器 (保持兼容)
├── scripts/sync_cn_bond_data.py       # 数据同步脚本
├── data/bond-cn/latest.json           # 最新数据
├── data/bond-cn/archive/              # 历史归档
├── docs/cn-bond-rebuild-plan.md       # 设计方案
└── docs/cn-bond-rebuild-checklist.md  # 实施清单
```

---

## 验证 API

```bash
# L1 展示层
curl "http://localhost:3000/api/bond-cn?level=L1"

# L2 分析层 (含收益率曲线)
curl "http://localhost:3000/api/bond-cn?level=L2"

# 实时模式
curl "http://localhost:3000/api/bond-cn?level=L1&realtime=true"
```

---

## 风险缓解

| 风险 | 缓解措施 |
|------|----------|
| Eastmoney API 变更 | 封装适配器，快速切换 |
| AkShare 数据延迟 | 多源对比，标记陈旧 |
| 构建失败 | 类型检查 + seed 数据 |
| 数据不一致 | 层级分离，明确标注 |

---

**结论**: P0 阶段已完成，中国债券模块已具备稳态运行能力，构建链不会破坏，可安全部署。
