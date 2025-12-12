-- Add price tracking columns to tickers table
ALTER TABLE public.tickers
ADD COLUMN IF NOT EXISTS last_price numeric,
ADD COLUMN IF NOT EXISTS day_change numeric,
ADD COLUMN IF NOT EXISTS day_change_pct numeric,
ADD COLUMN IF NOT EXISTS last_updated_at timestamp with time zone;