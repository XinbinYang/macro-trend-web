# PBoC LPR Truth Spec

## Objective
Treat PBoC-announced LPR as **Truth** source for CN policy dimension.

## Fields
- `macro_cn.lpr_1y` (percent)
- `macro_cn.lpr_5y` (percent)

## Source of Truth
- **PBoC official announcement** (人民银行官网/公告)

## Ingestion Channels (implementation detail)
- Preferred: AkShare official mirror (scrape / API), **but label as source=PBOC**.
- Fallback: Manual seed via env + Cron route (temporary, auditable).

## Quality Tagging
- `source`: "PBOC" (display) / stored as `pboc`
- `quality_tag`: Truth
- `is_stale`: monthly stale logic (>=2 months)

## Current Implementation
- Route: `/api/cron/monthly-cn-policy`
- Env:
  - `PBOC_LPR_1Y`
  - `PBOC_LPR_5Y`
  - optional `PBOC_LPR_ASOF` (YYYY-MM-DD)

## Next Steps
- Replace env-seeded values with AkShare / official site fetcher.
- Add monitor/alert when new month announcement published but data not updated.
