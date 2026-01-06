-- Verification script for P1 migrations
-- This script checks that all indexes and triggers were created successfully

-- Check 1: Verify indexes on tickers table
SELECT
  'INDEXES' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tickers'
  AND indexname IN (
    'idx_tickers_user_id',
    'idx_tickers_user_symbol',
    'idx_tickers_created_at'
  )
ORDER BY indexname;

-- Check 2: Verify trigger exists
SELECT
  'TRIGGER' as check_type,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'tickers'
  AND trigger_name = 'enforce_ticker_limit_on_insert';

-- Check 3: Verify function exists
SELECT
  'FUNCTION' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'check_ticker_limit';

-- Check 4: Count total indexes on tickers table
SELECT
  'INDEX_COUNT' as check_type,
  COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'tickers';
