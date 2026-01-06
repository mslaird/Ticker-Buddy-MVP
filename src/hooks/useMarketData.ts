import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Ticker } from './useTickers';
import { captureError, addBreadcrumb } from '@/lib/sentry';

export interface Quote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  isDelayed?: boolean;
  quoteStatus?: 'available' | 'unavailable' | 'source_unavailable';
  marketCap?: number;
  volume24h?: number;
  highRange?: number;
  lowRange?: number;
}

export interface MarketDataError {
  type: 'network' | 'rate_limit' | 'server' | 'unknown';
  message: string;
  retryAfter?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  percentRemaining: number;
}

interface MarketDataState {
  quotes: Record<string, Quote>;
  loading: boolean;
  lastUpdated: Date | null;
  error: MarketDataError | null;
  isPolling: boolean;
  rateLimit: RateLimitInfo | null;
}

const DEFAULT_POLL_INTERVAL = 15; // seconds
const MIN_POLL_INTERVAL = 5; // seconds - minimum allowed interval
const MAX_POLL_INTERVAL = 300; // seconds - maximum allowed interval (5 minutes)
const MAX_CONSECUTIVE_ERRORS = 3;
const ERROR_TOAST_COOLDOWN_MS = 30000; // 30 seconds - don't spam user with error toasts
const EXPONENTIAL_BACKOFF_BASE = 2; // Base multiplier for exponential backoff

export function useMarketData(tickers: Ticker[], isActive: boolean, pollIntervalSeconds: number = DEFAULT_POLL_INTERVAL) {
  const [state, setState] = useState<MarketDataState>({
    quotes: {},
    loading: false,
    lastUpdated: null,
    error: null,
    isPolling: false,
    rateLimit: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);
  const lastErrorToastRef = useRef<number>(0);
  const backoffMultiplierRef = useRef(1); // Track exponential backoff multiplier

  const showErrorToast = useCallback((error: MarketDataError) => {
    const now = Date.now();
    // Only show toast if enough time has passed since last error toast
    if (now - lastErrorToastRef.current < ERROR_TOAST_COOLDOWN_MS) {
      return;
    }
    lastErrorToastRef.current = now;

    let message = error.message;
    if (error.type === 'rate_limit' && error.retryAfter) {
      message += ` Retry after ${error.retryAfter} seconds.`;
    }

    toast.error(message, {
      duration: error.type === 'rate_limit' ? 5000 : 3000,
    });
  }, []);

  const fetchQuotes = useCallback(async () => {
    if (tickers.length === 0) {
      setState(prev => ({ ...prev, loading: false, error: null }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const symbols = tickers.map(t => ({
        symbol: t.symbol,
        assetType: t.asset_type,
      }));

      const { data, error, status } = await supabase.functions.invoke('market-data', {
        body: { symbols },
      });

      if (error) {
        console.error('Error fetching market data:', error);
        errorCountRef.current += 1;

        // Classify error type
        let errorType: MarketDataError['type'] = 'unknown';
        let errorMessage = 'Failed to fetch market data';
        let retryAfter: number | undefined;

        // Check for rate limit (429)
        if (status === 429 || error.message?.includes('rate limit')) {
          errorType = 'rate_limit';
          errorMessage = 'Rate limit exceeded. Please wait before refreshing.';
          // Try to extract retry-after from error if available
          const retryMatch = error.message?.match(/retry.*?(\d+)/i);
          if (retryMatch) {
            retryAfter = parseInt(retryMatch[1], 10);
          }
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorType = 'network';
          errorMessage = 'Network error. Check your connection and try again.';
        } else if (status && status >= 500) {
          errorType = 'server';
          errorMessage = 'Server error. Please try again later.';
        }

        const marketError: MarketDataError = {
          type: errorType,
          message: errorMessage,
          retryAfter,
        };

        // Report non-network errors to Sentry
        if (errorType !== 'network') {
          captureError(new Error(`Market data fetch failed: ${errorMessage}`), {
            errorType,
            status,
            tickerCount: tickers.length,
            errorCount: errorCountRef.current,
          });
        }

        setState(prev => ({
          ...prev,
          loading: false,
          error: marketError,
        }));

        showErrorToast(marketError);
        
        // Apply exponential backoff on errors
        if (errorCountRef.current > 1) {
          backoffMultiplierRef.current = Math.min(
            backoffMultiplierRef.current * EXPONENTIAL_BACKOFF_BASE,
            8 // Cap at 8x multiplier (max 2 minutes backoff for 15s interval)
          );
        }
        
        return;
      }

      const quotes: Record<string, Quote> = {};
      for (const quote of data.quotes) {
        quotes[quote.symbol] = quote;
      }

      // Extract rate limit info from response
      let rateLimitInfo: RateLimitInfo | null = null;
      if (data.rateLimit) {
        const { limit, remaining, reset } = data.rateLimit;
        const percentRemaining = limit > 0 ? Math.round((remaining / limit) * 100) : 100;

        rateLimitInfo = {
          limit,
          remaining,
          reset,
          percentRemaining,
        };

        // Log warning if rate limit is getting low (dev mode only)
        if (import.meta.env.DEV && percentRemaining < 20) {
          console.warn(
            `[Rate Limit] Low quota: ${remaining}/${limit} requests remaining (${percentRemaining}%)`
          );
        }

        // Add breadcrumb for monitoring
        if (percentRemaining < 30) {
          addBreadcrumb('Rate limit approaching', {
            remaining,
            limit,
            percentRemaining,
          });
        }

        // Send to Sentry if critically low
        if (percentRemaining < 10 && percentRemaining > 0) {
          captureError(new Error('Rate limit critically low'), {
            remaining,
            limit,
            percentRemaining,
            resetAt: new Date(reset).toISOString(),
          });
        }
      }

      setState({
        quotes,
        loading: false,
        lastUpdated: new Date(),
        error: null,
        isPolling: true,
        rateLimit: rateLimitInfo,
      });

      // Reset error count and backoff on success
      errorCountRef.current = 0;
      backoffMultiplierRef.current = 1; // Reset backoff multiplier
      lastErrorToastRef.current = 0; // Reset toast cooldown on success

      // Batch update tickers in database with latest prices (only if available)
      // Use Promise.all for parallel updates instead of sequential await
      const now = new Date().toISOString();
      const updatePromises = tickers
        .filter(ticker => {
          const quote = quotes[ticker.symbol];
          return quote && quote.price !== null && quote.quoteStatus !== 'unavailable';
        })
        .map(ticker => {
          const quote = quotes[ticker.symbol];
          return supabase
            .from('tickers')
            .update({
              last_price: quote.price,
              day_change: quote.change,
              day_change_pct: quote.changePct,
              last_updated_at: now,
            })
            .eq('id', ticker.id);
        });

      // Execute all updates in parallel (fire and forget - don't block UI)
      if (updatePromises.length > 0) {
        Promise.all(updatePromises).catch(err => {
          // Silently fail - these are non-critical updates
          console.warn('Failed to update some ticker prices in database:', err);

          // Report to Sentry for monitoring (non-blocking)
          captureError(
            err instanceof Error ? err : new Error('Database ticker update failed'),
            { tickerCount: updatePromises.length }
          );
        });
      }
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      errorCountRef.current += 1;

      const marketError: MarketDataError = {
        type: err instanceof TypeError ? 'network' : 'unknown',
        message: err instanceof Error ? err.message : 'Failed to fetch market data',
      };

      // Report unexpected errors to Sentry
      if (!(err instanceof TypeError)) {
        captureError(err instanceof Error ? err : new Error('Unknown market data error'), {
          errorCount: errorCountRef.current,
          tickerCount: tickers.length,
        });
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: marketError,
      }));

      showErrorToast(marketError);
      
      // Apply exponential backoff on errors
      if (errorCountRef.current > 1) {
        backoffMultiplierRef.current = Math.min(
          backoffMultiplierRef.current * EXPONENTIAL_BACKOFF_BASE,
          8 // Cap at 8x multiplier
        );
      }
    }
  }, [tickers, showErrorToast]);

  useEffect(() => {
    if (!isActive || tickers.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState(prev => ({ ...prev, isPolling: false }));
      return;
    }

    // Clamp polling interval to reasonable bounds
    const clampedInterval = Math.max(
      MIN_POLL_INTERVAL,
      Math.min(MAX_POLL_INTERVAL, pollIntervalSeconds)
    );

    // Initial fetch
    fetchQuotes();

    // Set up polling interval with exponential backoff on errors
    const scheduleNextPoll = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Stop polling if too many consecutive errors
      if (errorCountRef.current >= MAX_CONSECUTIVE_ERRORS) {
        console.warn('Too many market data errors, stopping polling');
        setState(prev => ({
          ...prev,
          isPolling: false,
          error: prev.error || {
            type: 'unknown',
            message: 'Too many errors. Polling stopped. Please refresh the page.',
          },
        }));
        return;
      }

      // Calculate next poll interval with exponential backoff
      const baseInterval = clampedInterval * 1000; // Convert to milliseconds
      const backoffInterval = baseInterval * backoffMultiplierRef.current;
      
      intervalRef.current = setTimeout(() => {
        fetchQuotes();
        scheduleNextPoll(); // Schedule next poll recursively
      }, backoffInterval);
    };

    scheduleNextPoll();

    setState(prev => ({ ...prev, isPolling: true }));

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setState(prev => ({ ...prev, isPolling: false }));
    };
  }, [isActive, tickers.length, fetchQuotes, pollIntervalSeconds]);

  // Expose retry function
  const retry = useCallback(() => {
    errorCountRef.current = 0;
    backoffMultiplierRef.current = 1; // Reset backoff on manual retry
    lastErrorToastRef.current = 0;
    fetchQuotes();
  }, [fetchQuotes]);

  return {
    ...state,
    retry,
  };
}
