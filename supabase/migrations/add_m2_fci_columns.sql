-- Migration: Add M2 and FCI source/timestamp columns to macro_us
-- Idempotent: uses IF NOT EXISTS
-- Run in Supabase Dashboard > SQL Editor

ALTER TABLE macro_us
  ADD COLUMN IF NOT EXISTS m2_source TEXT,
  ADD COLUMN IF NOT EXISTS m2_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fci_source TEXT,
  ADD COLUMN IF NOT EXISTS fci_updated_at TIMESTAMPTZ;
