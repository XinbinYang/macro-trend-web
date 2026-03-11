# Sample/Mock/Static Inventory Review

Generated from heuristic scan of `macro-trend-web` repository.
Review Date: 2026-03-11

---

## Summary

| Category | Count | Description |
|----------|-------|-------------|
| SAMPLE_PLACEHOLDER | 4 | Hardcoded data posing as real; misleading if unmarked |
| MOCK_FALLBACK | 5 | Allowed fallback for when APIs fail; acceptable if labeled |
| STATIC_COPY | 3 | Static text/copy; generally acceptable |
| REAL_AI | 2 | Genuine AI-generated content; properly labeled |
| REAL_DATA | 1 | Real data with proper source labeling |

---

## Detailed Inventory

| Page/Component | File Path | Snippet | Category | Risk | Suggested Fix | Priority |
|----------------|-----------|---------|----------|------|---------------|----------|
| Market Data (A-Share Indices) | `app/api/market-data-realtime/route.ts` | Hardcoded A-share prices (CSI300: 4602.63, CSI500: 5847.21, etc.) with `source: "AkShare(sample)"` | SAMPLE_PLACEHOLDER | **High** - Prices look realistic but are static; users may mistake for live data | Add prominent "示例数据" badge in UI; implement real AkShare integration | **P0** |
| Market Data (HK Index) | `app/api/market-data-realtime/route.ts` | Hardcoded HSI price (25249.48) with `source: "AkShare(sample)"` | SAMPLE_PLACEHOLDER | **High** - Same as above | Add "示例数据" badge; implement real data feed | **P0** |
| China Bond Futures | `lib/api/akshare-bonds.ts` | Hardcoded bond futures prices (TS2506: 102.85, TF2506: 106.18, etc.) | SAMPLE_PLACEHOLDER | **High** - Financial data appears real but is static | Add UI warning label; replace with live AkShare/Python service | **P0** |
| China Yield Curve | `lib/api/akshare-bonds.ts` | Hardcoded yield curve (1Y: 1.85%, 2Y: 1.95%, etc.) | SAMPLE_PLACEHOLDER | **Medium** - Less visible but still misleading | Add "示例数据" label; implement real data | **P1** |
| A-Share Fallback | `lib/api/eastmoney-api.ts` | Mock A-share ETF data (510300: 3.856, etc.) used when EastMoney API fails | MOCK_FALLBACK | **Low** - Properly designed fallback with console logging | Keep; ensure UI shows "数据加载中/模拟数据" indicator | **P2** |
| FRED Macro Data | `lib/api/fred-api.ts` | Mock FRED data (Fed Funds: 4.5%, Treasury 10Y: 4.25%, etc.) when no API key | MOCK_FALLBACK | **Low** - Acceptable fallback pattern | Keep; UI already shows `source: "FRED(mock)"` when active | **P2** |
| Global Indices | `app/api/market-data/route.ts` | Mock NASDAQ/SP500 data (QQQ: 512.45, SPY: 595.23) | MOCK_FALLBACK | **Low** - Comment states "For now, return mock data" | Replace with Yahoo Finance integration or add UI warning | **P1** |
| Forge API | `server/_core/dataApi.ts` | Generic mock response `{ mock: true, apiId }` when Forge unconfigured | MOCK_FALLBACK | **Low** - Development fallback | Keep for dev; ensure production has Forge configured | **P2** |
| Economic Calendar | `app/api/economic-calendar/route.ts` | Hardcoded 2026-03 events (FOMC, CPI, ECB, etc.) | MOCK_FALLBACK | **Medium** - Calendar data appears authoritative but is static | Add "示例日历" label; implement Brave Search or real calendar API | **P1** |
| Report Generation | `app/api/reports/generate/route.ts` | AI-generated report with `[建议]` placeholders in prompt template | REAL_AI | **None** - Properly uses AI; placeholders are instruction markers | Keep; placeholders are for AI to fill, not user-facing | - |
| AI Insight | `app/api/ai-insight/route.ts` | Returns `openrouter` generated content with `source` label | REAL_AI | **None** - Properly labeled AI-generated content | Keep; correctly implements "必须真 AI" rule | - |
| Report Detail | `app/reports/[id]/page.tsx` | Static mock reports (w1, w2, w3) for demo/history | STATIC_COPY | **Low** - Demo content for non-critical feature | Add "历史示例" label; ensure new reports are AI-generated | **P2** |
| Glossary Page | `app/academy/glossary/page.tsx` | Placeholder text in search input | STATIC_COPY | **None** - Standard UI placeholder pattern | Keep | - |
| Login Page | `app/login/page.tsx` | Form field placeholders ("您的姓名", "your@email.com") | STATIC_COPY | **None** - Standard form placeholders | Keep | - |
| UI Components | `components/ui/input.tsx`, `select.tsx` | CSS classes for placeholder styling | STATIC_COPY | **None** - Component styling | Keep | - |

---

## Risk Assessment Legend

| Risk Level | Description |
|------------|-------------|
| **High** | Static data appears realistic and could be mistaken for live market data; financial decisions could be affected |
| **Medium** | Static data in secondary features; less likely to cause harm but still misleading |
| **Low** | Properly labeled fallbacks or demo content; minimal risk |
| **None** | Standard UI patterns or properly labeled AI content |

---

## Priority Action Items

### P0 (Immediate)
1. **A-Share & HK Market Data** (`app/api/market-data-realtime/route.ts`)
   - Add prominent "示例数据 / Sample Data" badge in UI
   - Implement real AkShare integration via Python service
   - Risk: Users may trade based on stale prices

2. **China Bond Futures** (`lib/api/akshare-bonds.ts`)
   - Add UI warning: "演示数据，非实时行情"
   - Set up Python microservice for real AkShare data
   - Risk: Bond prices appear authoritative but are static

### P1 (Short-term)
3. **Global Indices** (`app/api/market-data/route.ts`)
   - Replace mock with Yahoo Finance API integration
   - Or add clear "模拟数据" indicator

4. **Economic Calendar** (`app/api/economic-calendar/route.ts`)
   - Add "示例日历" disclaimer
   - Integrate real economic data API (Brave Search or dedicated service)

5. **China Yield Curve** (`lib/api/akshare-bonds.ts`)
   - Add sample data warning
   - Implement real yield curve feed

### P2 (Backlog)
6. **Report History** (`app/reports/[id]/page.tsx`)
   - Label mock reports as "历史示例"
   - Consider removing or archiving old demo content

7. **Fallback Data** (EastMoney, FRED mocks)
   - Verify UI properly indicates fallback mode
   - Add "使用模拟数据" toast notification

---

## Recommended UI Labeling Pattern

For all SAMPLE_PLACEHOLDER items, implement consistent labeling:

```tsx
// Example component pattern
<div className="data-badge">
  {isSampleData && (
    <span className="badge badge-warning">
      ⚠️ 示例数据 / Sample Data
    </span>
  )}
  {isMockFallback && (
    <span className="badge badge-info">
      ℹ️ 模拟数据 / Simulated
    </span>
  )}
  {isRealData && (
    <span className="badge badge-success">
      ● 实时数据 / Live
    </span>
  )}
</div>
```

---

## Data Source Semantics Reference

| Label | Meaning | User Impact |
|-------|---------|-------------|
| `AkShare(sample)` | Hardcoded placeholder data | **Must be labeled in UI** |
| `FRED(mock)` | Fallback when no API key | Acceptable with indicator |
| `EastMoney` (real) | Live A-share data | No action needed |
| `Yahoo` | Real-time global indices | No action needed |
| `openrouter` | AI-generated content | Already properly labeled |

---

*Review completed. Recommend scheduling P0 items for next sprint.*
