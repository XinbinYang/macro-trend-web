# macro-trend-web Project Structure

## Overview
- **Type**: Next.js 14 Web Application (React 18)
- **Purpose**: Global Macro Trading Dashboard - AI-powered macro research platform
- **Runtime**: Node.js 18+, Server-Side Rendering (SSR)

---

## Tech Stack

### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| next | 14.2.35 | React SSR framework |
| react | 18 | UI library |
| typescript | ^5 | Type safety |
| tailwindcss | ^3.4.1 | Styling |

### Data & State
| Package | Purpose |
|---------|---------|
| @tanstack/react-query | Client-side data fetching/caching |
| @trpc/client/server | Type-safe API layer |
| drizzle-orm | SQL ORM (MySQL) |
| zod | Runtime validation |

### External Integrations
| Package | Purpose |
|---------|---------|
| axios | HTTP client |
| supabase-js | Database (future) |
| lightweight-charts | TradingView charts |
| recharts | Data visualization |
| jspdf/pdfkit | PDF report generation |
| lucide-react | Icons |

---

## Data Interfaces

### Core Types (`shared/types.ts`, `shared/macro-types.ts`)
```
- MarketQuote: { symbol, name, price, change, changePercent, volume, timestamp, source, region, category, dataType }
- EconomicEvent: { id, date, time, country, event, importance, actual?, forecast?, previous? }
- AIInsight: { summary, impact, suggestion }
- Report: { id, title, date, type, coreThesis, scenario, keyPoints, content, model }
```

### Key Data Models
| Model | Source | Type |
|-------|--------|------|
| A-Share ETF | EastMoney (realtime) | API |
| US Indices | Yahoo Finance | API |
| US Macro | FRED API | API |
| China Bonds | AkShare (sample) | Mock |
| Economic Calendar | Static (2026-03) | Hardcoded |
| News | Brave Search / Fallback | API |

---

## Deployment

### Vercel Configuration (`vercel.json`)
```json
{
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| FRED_API_KEY | Yes (prod) | US macro data |
| ALPHA_VANTAGE_API_KEY | No | Global stocks |
| OPENROUTER_API_KEY | Yes (AI) | GPT/DeepSeek LLM |
| DEEPSEEK_API_KEY | Yes (CN) | China region LLM |
| BRAVE_API_KEY | No | News search |
| DATABASE_URL | No | MySQL connection |
| JWT_SECRET | No | Auth cookies |

### Build & Run
```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # Production build
npm start      # Production server
```

---

## Project Structure

```
macro-trend-web/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes (8 endpoints)
│   │   ├── market-data/          # Unified market snapshot
│   │   ├── market-data-realtime/ # Real-time quotes + bonds
│   │   ├── historical-data/      # Chart data
│   │   ├── news/                 # Finance news
│   │   ├── economic-calendar/    # Events calendar
│   │   ├── ai-insight/           # News AI analysis
│   │   ├── reports/
│   │   │   ├── generate/         # AI report generation
│   │   │   └── download/        # PDF report download
│   │   └── trpc/                # tRPC proxy
│   ├── assets/               # Asset detail pages
│   ├── portfolio/            # Portfolio tracking
│   ├── reports/             # Report management
│   └── ...                  # Other pages
├── server/                  # Server-side logic
│   ├── routers/              # tRPC routers
│   ├── analysis-engine.ts    # Report generation
│   ├── market-data.ts       # Data aggregation
│   ├── macro-indicators.ts  # Macro analysis
│   ├── portfolio-engine.ts  # Portfolio calculations
│   └── pdf-generator.ts     # PDF creation
├── lib/                     # Shared utilities
│   ├── api/                 # External API clients
│   │   ├── eastmoney-api.ts    # A-share data
│   │   ├── fred-api.ts         # US macro
│   │   ├── akshare-bonds.ts   # China bonds (sample)
│   │   ├── market-data.ts     # Yahoo Finance
│   │   ├── news.ts            # Brave Search
│   │   └── ...
│   ├── trpc*.ts             # tRPC client/server
│   └── pdf*.ts              # PDF utilities
├── components/              # React components
├── shared/                  # Shared types/constants
└── docs/                   # Documentation
```
