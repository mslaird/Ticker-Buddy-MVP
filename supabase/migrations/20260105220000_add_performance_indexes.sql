-- Performance optimization: Add indexes for common queries
-- This migration adds indexes to improve query performance for user-scoped lookups

-- Index on profiles.user_id for faster profile lookups
-- Note: user_id already has a UNIQUE constraint which creates an index, but we'll add this for clarity
-- Actually, UNIQUE constraints automatically create indexes, so this is redundant but harmless
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Index on tickers.user_id for faster ticker lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_tickers_user_id ON public.tickers(user_id);

-- Composite index for ticker lookups by user and symbol (for duplicate checks)
CREATE INDEX IF NOT EXISTS idx_tickers_user_symbol ON public.tickers(user_id, symbol);

-- Index on tickers.created_at for ordering (used in useTickers hook)
CREATE INDEX IF NOT EXISTS idx_tickers_created_at ON public.tickers(created_at);

-- Note: These indexes will improve performance for:
-- 1. Profile lookups by user_id (already optimized by UNIQUE, but explicit is better)
-- 2. Ticker queries filtered by user_id (most common operation)
-- 3. Duplicate ticker checks (user_id + symbol)
-- 4. Ticker ordering by created_at

