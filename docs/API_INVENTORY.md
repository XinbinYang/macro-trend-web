# API Inventory - macro-trend-web

## Overview
This document provides a complete inventory of all API routes with parameters, response shapes, environment variables, and data source semantics (truth vs indicative/mock/fallback/sample).

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/market-data` | GET | Unified market snapshot (A-share, US, macro) |
| `/api/market-data-realtime` | GET | Real-time quotes + bonds + yield curves |
| `/api/historical-data` | GET | Historical chart data |
| `/api/news` | GET | Finance news |
| `/api/economic-calendar` | GET | Economic events calendar |
| `/api/ai-insight` | POST | AI analysis of news |
| `/api/reports/generate` | POST | AI-generated macro reports |
| `/api/reports/download` | POST | Download generated report |
| `/api/trpc/*` | * | tRPC proxy |

---

## 1. `/api/market-data`

Unified market data endpoint combining A-share, US indices, and macro indicators.

### Parameters
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | No | `snapshot` | Data type: `snapshot`, `a-share`, `macro`, `all` |

### Response Shape
```json
{
  "timestamp": "2026-03-11T06:44:00.000Z",
  "sources": {
    "aShare": "real" | "mock",
    "global": "real" | "mock"
  },
  "data": {
    "aShare": [{ "symbol", "name", "price", "change", "changePercent", "region" }],
    "global": [{ "symbol", "name", "price", "change", "changePercent" }]
  }
}
```

### Data Semantics
| Source | Truth/Indicative | Fallback |
|--------|------------------|----------|
| A-Share (EastMoney) | **Indicative** (展示层) | Mock with fixed prices (3.856 for 510300) |
| US Indices (Yahoo) | **Indicative** | Mock with fixed prices (QQQ: 512.45) |

### Env Vars Used
- `FRED_API_KEY` (optional, for macro data)

---

## 2. `/api/market-data-realtime`

Comprehensive real-time market data including US equities, A-shares, HK indices, commodities, bonds, and yield curves.

### Parameters
None (GET)

### Response Shape
```json
{
  "success": true,
  "sources": { "Yahoo": 8, "AkShare(sample)": 6 },
  "dataTypes": { "REALTIME": 8, "EOD": 10 },
  "timestamp": "2026-03-11T06:44:00.000Z",
  "data": {
    "us": [{ "symbol", "name", "price", "change", "changePercent", "volume", "source", "region", "category", "dataType", "dataSource" }],
    "china": [{ ... }],
    "hongkong": [{ ... }],
    "global": [{ ... }]
  },
  "bond": {
    "china": {
      "futures": [{ "symbol", "name", "price", "change", "changePercent", "volume", "timestamp", "source" }],
      "yieldCurve": [{ "maturity", "yield", "change" }]
    }
  },
  "disclaimer": {
    "indicative": "Real-time/展示层数据仅供参考(Indicative)，不用于回测真值与策略净值。",
    "truth": "策略回测/净值/信号必须来自 Master + 官方结算镜像(Spot/Settle 双轨)。"
  }
}
```

### Data Semantics
| Source | Truth/Indicative | Fallback |
|--------|------------------|----------|
| US Equities (Yahoo) | **Indicative** (展示层) | - |
| A-Share (AkShare) | **Sample** (占位数据) | Hardcoded prices |
| HK Index (AkShare) | **Sample** | Hardcoded prices |
| China Bonds (AkShare) | **Sample** | Mock data |
| US Treasury Curve (FRED) | **Indicative** | Mock yields if no key |

### Env Vars Used
- `FRED_API_KEY` (optional)

---

## 3. `/api/historical-data`

Fetch historical price data for charting.

### Parameters
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `symbol` | string | **Yes** | - | Asset symbol (e.g., `^NDX`, `GC=F`) |
| `days` | number | No | 30 | Number of days of history |

### Response Shape
```json
{
  "success": true,
  "symbol": "^NDX",
  "days": 30,
  "data": [
    { "date": "2026-02-09", "open": 17000, "high": 17200, "low": 16950, "close": 17180, "volume": 450000000 }
  ]
}
```

### Data Semantics
| Source | Truth/Indicative |
|--------|------------------|
| Yahoo Finance | **Indicative** |

### Env Vars Used
- None

---

## 4. `/api/news`

Fetch latest finance news with optional AI translation.

### Parameters
None (GET)

### Response Shape
```json
{
  "success": true,
  "source": "brave",
  "data": [
    { "id": "1", "time": "14:30", "title": "美联储维持利率不变", "titleEn": "Fed holds rates steady", "content": "...", "source": "Reuters", "url": "..." }
  ]
}
```

### Data Semantics
| Source | Truth/Indicative | Fallback |
|--------|------------------|----------|
| Brave Search API | **Indicative** | Hardcoded fallback (FOMC, CPI, ECB, Oil, BOJ events) |

### Env Vars Used
- `BRAVE_API_KEY` (optional)
- `OPENROUTER_API_KEY` (optional, for translation)

---

## 5. `/api/economic-calendar`

Economic events calendar with forecasts.

### Parameters
None (GET)

### Response Shape
```json
{
  "success": true,
  "data": [
    { "id": "1", "date": "3月11日", "time": "20:30", "country": "美国", "event": "2月非农就业人口变动", "importance": "high", "forecast": "+18.5万", "previous": "+14.3万" }
  ],
  "lastUpdate": "2026-03-11T06:44:00.000Z"
}
```

### Data Semantics
| Source | Truth/Indicative |
|--------|------------------|
| Hardcoded (2026-03) | **Indicative** - Static calendar data |

### Env Vars Used
- None

---

## 6. `/api/ai-insight`

AI-powered analysis of news items.

### Parameters (POST Body)
```json
{
  "titleEn": "Fed holds rates steady amid inflation concerns",
  "source": "Reuters"
}
```

### Response Shape
```json
{
  "success": true,
  "data": {
    "summary": "美联储维持利率不变，通胀担忧持续",
    "impact": "中性",
    "suggestion": "观望"
  },
  "source": "openrouter" | "mock" | "fallback"
}
```

### Data Semantics
| Source | Truth/Indicative | Fallback |
|--------|------------------|----------|
| OpenRouter (GPT-4o-mini) | **Generated** | Keyword-based mock |

### Env Vars Used
- `OPENROUTER_API_KEY` (optional)

---

## 7. `/api/reports/generate`

Generate AI-written macro reports (weekly/quarterly).

### Parameters (POST Body)
```json
{
  "type": "weekly" | "quarterly",
  "isChina": false
}
```

### Response Shape
```json
{
  "success": true,
  "report": {
    "id": "report_1758867841234",
    "title": "全球宏观周报：通胀回落遇阻",
    "date": "2026-03-11",
    "type": "weekly",
    "coreThesis": "市场处于关键转折点",
    "scenario": "inflation",
    "keyPoints": ["美联储政策", "CPI数据", "OPEC+减产"],
    "content": "..."
  },
  "generatedAt": "2026-03-11T06:44:00.000Z",
  "model": "deepseek-chat" | "gpt-5.4",
  "clientIP": "203.0.113.1",
  "isChina": false
}
```

### Data Semantics
| Component | Source | Truth/Indicative |
|-----------|--------|------------------|
| Market Data | `/api/market-data-realtime` | **Indicative** |
| Report Content | LLM (DeepSeek/GPT) | **Generated** |

### Model Selection Logic
- **China IP** → DeepSeek (primary), fallback to GPT-5.4
- **Non-China IP** → GPT-5.4 (primary), fallback to DeepSeek

### Env Vars Used
- `DEEPSEEK_API_KEY` (for China)
- `OPENROUTER_API_KEY` (for GPT)
- `FRED_API_KEY` (for macro data)

---

## 8. `/api/reports/download`

Download/generate PDF report.

### Parameters (POST Body)
```json
{
  "id": "weekly_20260311"
}
```

### Response Shape
```json
{
  "success": true,
  "report": {
    "id": "weekly_20260311",
    "title": "周度宏观报告",
    "date": "2026-03-11",
    "type": "weekly",
    "coreThesis": "...",
    "scenario": "goldilocks",
    "keyPoints": ["..."],
    "executiveSummary": "...",
    "macroBackground": "...",
    "marketAnalysis": "...",
    "tradeStrategies": "...",
    "risksAndCatalysts": "...",
    "disclaimer": "本报告仅供参考，不构成投资建议。"
  }
}
```

### Data Semantics
| Component | Source |
|-----------|--------|
| Market Data | `buildMarketDataSummary()`, `buildQuarterlyMarketSummary()` |
| Macro Indicators | `fetchMacroIndicators()` |
| Report Content | LLM via `generateReport()` |

### Env Vars Used
- `OPENROUTER_API_KEY`
- `FRED_API_KEY`

---

## Data Source Summary Table

| Data Type | Source | Semantic | Used By |
|-----------|--------|----------|---------|
| A-Share ETF | EastMoney API | **Indicative** | `/api/market-data` |
| A-Share Index | AkShare (sample) | **Sample** | `/api/market-data-realtime` |
| US Equities | Yahoo Finance | **Indicative** | `/api/market-data-realtime` |
| US Macro | FRED API | **Indicative** | `/api/market-data`, reports |
| China Bonds | AkShare (mock) | **Sample** | `/api/market-data-realtime` |
| US Treasury Curve | FRED | **Indicative** | `/api/market-data-realtime` |
| News | Brave Search | **Indicative** | `/api/news` |
| Events | Hardcoded | **Static** | `/api/economic-calendar` |
| AI Analysis | OpenRouter | **Generated** | `/api/ai-insight` |
| Reports | LLM (DeepSeek/GPT) | **Generated** | `/api/reports/*` |

---

## Disclaimer Semantics

### Truth (真值) - NOT from this app
- **Master Data Files** - 杨总亲自上传的原始数据
- **AkShare 官方结算镜像** - 每日收盘结算价 (Settle)
- **官方现货价** (Spot) for indices

### Indicative (展示层) - From this app
- Real-time quotes (Yahoo, EastMoney)
- FRED macro indicators
- News feeds

### Sample/Mock (示例/占位)
- A-Share index prices (hardcoded in code)
- China bond futures (mock data)
- Economic calendar (static 2026-03)

### Generated (生成)
- AI insights
- AI-written reports
