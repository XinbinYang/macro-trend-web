-- ============================================================================
-- Schema Migration: Add CN Rates (Yield Curve + Credit Spread) to macro_cn
-- ============================================================================
-- 
-- Purpose:
--   - Add daily CN treasury yield curve points (2Y, 5Y, 10Y)
--   - Add AAA credit spread 5Y (AAA中短票5Y - 国债5Y)
--
-- Data Source: ChinaMoney (https://www.chinamoney.com.cn)
--   - CYCC000: 国债收益率曲线
--   - CYCC82B: AAA级中短期票据收益率曲线
--
-- Cadence: Daily (日更)
-- TTL in展示层: 1 day (for EOD data)
-- ============================================================================

-- Step 1: Add columns to macro_cn table
-- These will store the daily yield curve points
ALTER TABLE macro_cn 
ADD COLUMN IF NOT EXISTS yield_2y DECIMAL(8,4) NULL,
ADD COLUMN IF NOT EXISTS yield_5y DECIMAL(8,4) NULL,
ADD COLUMN IF NOT EXISTS yield_10y DECIMAL(8,4) NULL,
ADD COLUMN IF NOT EXISTS credit_spread_5y DECIMAL(8,2) NULL;

-- Step 2: Add source tracking for rates data
ALTER TABLE macro_cn
ADD COLUMN IF NOT EXISTS rates_source VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS rates_updated_at TIMESTAMP WITH TIME ZONE NULL;

-- Step 3: Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_macro_cn_date_rates 
ON macro_cn(date) 
WHERE yield_2y IS NOT NULL OR yield_5y IS NOT NULL OR yield_10y IS NOT NULL;

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- To rollback this migration:
-- 
-- -- Remove index
-- DROP INDEX IF EXISTS idx_macro_cn_date_rates;
-- 
-- -- Remove columns
-- ALTER TABLE macro_cn DROP COLUMN IF EXISTS credit_spread_5y;
-- ALTER TABLE macro_cn DROP COLUMN IF EXISTS yield_10y;
-- ALTER TABLE macro_cn DROP COLUMN IF EXISTS yield_5y;
-- ALTER TABLE macro_cn DROP COLUMN IF EXISTS yield_2y;
-- ALTER TABLE macro_cn DROP COLUMN IF EXISTS rates_source;
-- ALTER TABLE macro_cn DROP COLUMN IF EXISTS rates_updated_at;
-- ============================================================================
