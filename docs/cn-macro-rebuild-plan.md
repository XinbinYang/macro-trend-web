# 中国宏观数据稳态重建方案

> 目标：优先恢复月度/季度宏观数据的稳定可用展示，不再引入构建期 Python/AkShare 运行时风险

---

## 1. 最小稳态方案

### 1.1 核心原则
- **零 Python 运行时依赖**：生产环境不再执行任何 AkShare 数据获取脚本
- **静态 JSON 作为唯一数据源**：前端只读取预构建的 JSON 文件
- **人工月度更新**：数据更新改为离线生成 + 手动部署模式

### 1.2 数据范围（6项核心指标）

| 指标 | 频率 | 来源 | 用途 |
|------|------|------|------|
| PMI 制造业 | 月度 | 国家统计局 | 增长维度 |
| CPI 同比 | 月度 | 国家统计局 | 通胀维度 |
| M2 同比 | 月度 | 央行 | 流动性维度 |
| LPR 1年期 | 月度 | 央行 | 政策维度 |
| 城镇调查失业率 | 月度 | 国家统计局 | 增长维度 |
| 社融规模 | 月度 | 央行 | 信用维度 |

### 1.3 文件结构

```
data/macro/cn/
├── latest.json          # 当前生产数据（前端直接读取）
├── staging.json         # 待验证数据（更新前预览）
└── archive/
    ├── 2026-01.json
    ├── 2026-02.json
    └── ...              # 月度归档
```

### 1.4 JSON Schema

```typescript
interface CnMacroSnapshot {
  region: "CN";
  status: "LIVE" | "OFF" | "STALE";  // STALE = 数据超过45天
  updatedAt: string;  // ISO 8601
  asOf: string | null;  // 数据截止日期 YYYY-MM
  series: {
    pmi_mfg: { value: number | null; asOf: string | null; source: string };
    cpi_yoy: { value: number | null; asOf: string | null; source: string };
    m2_yoy: { value: number | null; asOf: string | null; source: string };
    lpr_1y: { value: number | null; asOf: string | null; source: string };
    unemployment_urban: { value: number | null; asOf: string | null; source: string };
    social_financing: { value: number | null; asOf: string | null; source: string; unit: "万亿" };
  };
  notes: string;
}
```

---

## 2. 数据更新方式

### 2.1 月度更新流程

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: 数据获取（离线环境）                                │
│  - 在本地/开发机运行 update_macro_cn_monthly.py             │
│  - 从国家统计局/央行官网或 AkShare 获取最新数据              │
│  - 输出到 staging.json                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: 数据验证                                            │
│  - 人工核对数值合理性                                        │
│  - 对比官方发布渠道（stats.gov.cn, pbc.gov.cn）             │
│  - 确认 asOf 日期与官方发布周期一致                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: 部署上线                                            │
│  - staging.json → latest.json                               │
│  - 旧数据归档到 archive/YYYY-MM.json                        │
│  - git commit + push + Vercel 自动部署                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 更新频率

| 指标 | 官方发布时间 | 建议更新日期 |
|------|-------------|-------------|
| PMI | 每月最后一天 | 次月1-2日 |
| CPI/M2/LPR/失业率/社融 | 每月10-15日 | 每月15-20日 |

### 2.3 应急更新

- 重要数据发布（如两会、政治局会议后）可临时更新
- 紧急修复：直接修改 latest.json 并热部署

---

## 3. 前后端改造建议

### 3.1 后端改造（app/api/macro-cn/route.ts）

当前实现已符合要求，仅需增强以下功能：

```typescript
// 新增：数据新鲜度检查
function checkDataFreshness(asOf: string | null): "FRESH" | "STALE" | "OFF" {
  if (!asOf) return "OFF";
  const dataDate = new Date(asOf + "-01");
  const now = new Date();
  const daysDiff = (now.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 45) return "STALE";  // 超过45天标记为过期
  return "FRESH";
}

// 响应中增加 freshness 字段
return NextResponse.json({
  success: true,
  data,
  freshness: checkDataFreshness(data.asOf),  // 前端可据此显示警告
});
```

### 3.2 前端改造（app/page.tsx）

当前实现已接入 `/api/macro-cn`，建议增强：

1. **数据新鲜度提示**：
   ```tsx
   {cnMacroStatus === "LIVE" && freshness === "STALE" && (
     <Badge className="bg-amber-500/20 text-amber-400">
       数据可能滞后 · 上次更新 {data.asOf}
     </Badge>
   )}
   ```

2. **离线模式展示**：
   - 当 status 为 "OFF" 时，显示占位符而非隐藏卡片
   - 所有指标显示 "—" 并标注 "数据维护中"

3. **手动刷新按钮**（可选）：
   - 添加 "检查更新" 按钮，触发 Vercel 重新部署（需配合 webhook）

### 3.3 新增组件建议

```typescript
// components/cn-macro-panel.tsx
// 专门展示中国宏观数据的独立组件

interface CnMacroPanelProps {
  data: CnMacroSnapshot | null;
  status: "LOADING" | "LIVE" | "OFF" | "STALE";
}

// 功能：
// - 六宫格指标卡片展示
// - 数据新鲜度警告
// - 点击展开历史趋势（读取 archive 数据）
```

---

## 4. 降级与缓存策略

### 4.1 多级降级策略

```
Level 1 (正常): latest.json 存在且 fresh
                ↓ 文件缺失或损坏
Level 2 (归档回退): 读取 archive/ 目录最新月份
                ↓ 归档也缺失
Level 3 (静态兜底): 使用嵌入式 fallback 数据（硬编码最近已知值）
                ↓ 完全无数据
Level 4 (OFF 模式): 显示 "数据维护中" 占位符
```

### 4.2 缓存策略

| 层级 | 策略 | TTL | 说明 |
|------|------|-----|------|
| CDN (Vercel Edge) | 静态文件缓存 | 1小时 | latest.json 变更后自动失效 |
| 浏览器 | fetch cache | 1天 | 宏观数据月度更新，无需频繁刷新 |
| API Route | Cache-Control | 1天 | /api/macro-cn 返回适当缓存头 |

### 4.3 错误处理

```typescript
// app/api/macro-cn/route.ts 错误处理增强

try {
  // 尝试读取 latest.json
  const data = await readLatestJson();
  
  if (!data) {
    // 尝试读取归档
    const archived = await readLatestArchive();
    if (archived) {
      return NextResponse.json({
        success: true,
        data: archived,
        freshness: "STALE",
        note: "使用归档数据",
      });
    }
    
    // 使用兜底数据
    return NextResponse.json({
      success: true,
      data: FALLBACK_DATA,
      freshness: "STALE",
      note: "使用兜底数据",
    });
  }
  
  return NextResponse.json({ success: true, data });
} catch (e) {
  // 完全失败返回 OFF
  return NextResponse.json({
    success: false,
    status: "OFF",
    error: "数据服务暂时不可用",
  });
}
```

### 4.4 监控与告警

建议添加（可选）：

1. **数据新鲜度监控**：
   - 每日检查 latest.json 的 asOf 日期
   - 超过30天未更新发送提醒

2. **健康检查端点**：
   ```typescript
   // app/api/health/macro-cn/route.ts
   export async function GET() {
     const data = await readLatestJson();
     const freshness = checkDataFreshness(data?.asOf);
     return NextResponse.json({
       status: freshness === "FRESH" ? "healthy" : "stale",
       asOf: data?.asOf,
       lastUpdated: data?.updatedAt,
     });
   }
   ```

---

## 5. 实施检查清单

### 立即执行
- [ ] 确认当前 latest.json 数据完整性
- [ ] 创建 archive/ 目录并归档历史数据
- [ ] 更新 API route 添加 freshness 检查
- [ ] 前端添加 STALE 状态展示

### 本月内
- [ ] 编写数据更新 SOP（标准操作流程文档）
- [ ] 设置日历提醒（每月15日检查更新）
- [ ] 测试归档回退逻辑

### 后续优化
- [ ] 开发数据验证自动化脚本
- [ ] 添加历史趋势图表（读取 archive 数据）
- [ ] 考虑接入官方 API（如国家统计局开放接口）

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 忘记月度更新 | 数据滞后 | 日历提醒 + 数据新鲜度警告 |
| 数据录入错误 | 误导决策 | 双人复核 + 与官方数据比对 |
| Vercel 部署失败 | 服务中断 | 归档回退 + 兜底数据 |
| 官方数据源变更 | 获取失败 | 监控脚本 + 人工介入 |

---

**结论**：本方案通过将 Python/AkShare 运行时从生产环境移除，改为离线生成 + 静态部署模式，从根本上消除了构建期风险，同时保证了宏观数据的稳定可用展示。
