# Executive Summary (One Pager) — macro-trend-web

## What this is
A Next.js 14 “Market Live” dashboard for **macro monitoring** (展示层/Indicative) with clickable asset detail pages, basic AI commentary, and report-generation endpoints.

## What it is NOT (by design)
- Not the **Truth Layer** for backtests/NAV/signal generation.
- Anything labeled `sample/mock/fallback` or sourced from Yahoo/Eastmoney/FRED is **Indicative only**.

## Current status (MVP)
- **Homepage**: global macro dashboard (US/China/HK/commodities/bonds).
- **De-dup rule**: same underlying exposure should not appear via both index + ETF proxy.
  - US equities: use indices `^GSPC/^NDX/^DJI`.
  - HK: keep `HSI` index; remove `EWH` proxy.
  - Gold: keep `GC=F`; remove `GLD` proxy.
  - Bonds: keep US yield curve cards (2/5/10/30Y); remove `TLT` from homepage.
- **Asset details**: route-param decode + historical symbol encoding fixes for index symbols.
- **China index history**: Yahoo unreliable for `000300.SH` style symbols → routed to **Eastmoney Kline** (Indicative).
- **FRED**: no hard-coded key; uses `FRED_API_KEY` if configured; otherwise mock.

## APIs (top-level)
- `GET /api/market-data` — unified snapshot (has mock fallbacks)
- `GET /api/market-data-realtime` — dashboard feed; returns `disclaimer.indicative` vs `disclaimer.truth`
- `GET /api/historical-data` — chart history (Yahoo; CN index → Eastmoney)
- `GET /api/news` — news fetch (source varies)
- `GET /api/economic-calendar` — calendar (static/hardcoded)
- `POST /api/ai-insight` — AI analysis (generated)
- `POST /api/reports/generate` — AI report generation
- `POST /api/reports/download` — report export
- `*/api/trpc/*` — tRPC proxy

## Key risks / watchouts
1) **Data caliber mixing**: must keep “Indicative vs Truth” separation hard.
2) **Sample placeholders**: China bonds and some A/H indices still have `AkShare(sample)` placeholders.
3) **External API fragility**: Yahoo/Eastmoney can rate-limit or change schemas; must keep fallbacks + clear labeling.
4) **Secrets**: no keys in repo; set via Vercel env vars (Polygon/FRED/OpenRouter).

## Next best steps (recommended)
1) **Asset detail page upgrade**: default 1Y + MA200 + MDD + 52W high/low + 1M/3M/1Y returns.
2) **Fix Recharts container warnings**: enforce min-height/layout so width/height never become -1.
3) **Truth layer plan**: define table schema + versioned data package intake (Master + official settles) for backtests/signals.

References:
- Full structure: `docs/PROJECT_STRUCTURE.md`
- Full API inventory: `docs/API_INVENTORY.md`
