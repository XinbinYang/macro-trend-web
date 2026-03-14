-- ============================================================================
-- Schema Migration: Add US SOFR + Core PCE YoY to macro_us
-- ============================================================================
-- 
-- Purpose:
--   - Add US SOFR (Secured Overnight Financing Rate) - daily policy rate
--   - Add US Core PCE YoY - monthly inflation indicator (Fed's preferred metric)
--   - Add M2 YoY and FCI as预留 columns (not on write path yet)
--
-- Data Source: FRED (Federal Reserve Economic Data)
--   - SOFR: SOFR series (daily)
--   - Core PCE YoY: PCEPILFE series computed YoY (monthly)
--   - M2 YoY: M2SL series computed YoY (weekly)
--   - FCI:预留 (not implemented yet)
--
-- Cadence: Daily (SOFR daily, PCE monthly)
-- TTL in展示层: 1 day (for EOD data)
-- Quality Tag: Indicative (external source)
-- ============================================================================

-- Step 1: Add columns to macro_us table
ALTER TABLE macro_us 
ADD COLUMN IF NOT EXISTS sofr DECIMAL(8,4) NULL,
ADD COLUMN IF NOT EXISTS core_pce_yoy DECIMAL(8,4) NULL,
ADD COLUMN IF NOT EXISTS m2_yoy DECIMAL(8,4) NULL,
ADD COLUMN IF NOT EXISTS fci DECIMAL(8,4) NULL;

-- Step 2: Add source tracking for policy/inflation data
ALTER TABLE macro_us
ADD COLUMN IF NOT EXISTS policy_source VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS policy_updated_at TIMESTAMP WITH TIME ZONE NULL;

-- Step 3: Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_macro_us_date_policy 
ON macro_us(date) 
WHERE sofr IS NOT NULL OR core_pce_yoy IS NOT NULL;

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- To rollback this migration:
-- 
-- -- Remove index
-- DROP INDEX IF EXISTS idx_macro_us_date_policy;
-- 
-- -- Remove columns
-- ALTER TABLE macro_us DROP COLUMN IF EXISTS fci;
-- ALTER TABLE macro_us DROP COLUMN IF EXISTS m2_yoy;
-- ALTER TABLE macro_us DROP COLUMN IF EXISTS core_pce_yoy;
-- ALTER TABLE macro_us DROP COLUMN IF EXISTS sofr;
-- ALTER TABLE macro_us DROP COLUMN IF EXISTS policy_source;
-- ALTER TABLE macro_us DROP COLUMN IF EXISTS policy_updated_at;
-- ============================================================================
