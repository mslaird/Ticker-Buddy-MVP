-- Enforce ticker count limits based on user plan
-- This migration adds a database-level constraint to prevent users from bypassing
-- client-side plan limits by adding more tickers than allowed.

-- Create function to check ticker limit before insert
CREATE OR REPLACE FUNCTION public.check_ticker_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_plan TEXT;
  ticker_limit INT;
  current_count INT;
BEGIN
  -- Get user's plan from profiles table
  SELECT plan INTO user_plan
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- If no profile found, reject (should not happen due to trigger on auth.users)
  IF user_plan IS NULL THEN
    RAISE EXCEPTION 'User profile not found. Please contact support.';
  END IF;

  -- Set limit based on plan
  ticker_limit := CASE
    WHEN user_plan = 'pro' THEN 5
    ELSE 3
  END;

  -- Count current tickers for this user
  SELECT COUNT(*) INTO current_count
  FROM public.tickers
  WHERE user_id = NEW.user_id;

  -- Check if limit would be exceeded
  IF current_count >= ticker_limit THEN
    RAISE EXCEPTION 'Ticker limit reached. Your % plan allows % tickers.', user_plan, ticker_limit
      USING HINT = 'Upgrade to Pro for more tickers or remove existing tickers.';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce limit on INSERT
CREATE TRIGGER enforce_ticker_limit_on_insert
  BEFORE INSERT ON public.tickers
  FOR EACH ROW
  EXECUTE FUNCTION public.check_ticker_limit();

-- Add comment for documentation
COMMENT ON FUNCTION public.check_ticker_limit() IS
  'Enforces per-plan ticker limits at database level. Free: 3 tickers, Pro: 5 tickers.';
