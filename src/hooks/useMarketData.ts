import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Ticker } from './useTickers';

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
  // Debug fields for equities
  debugBaseline?: number | null;
  debugOpen?: number | null;
  debugPrevClose?: number | null;
  debugMarketState?: string;
}

interface MarketDataState {
  quotes: Record<string, Quote>;
  loading: boolean;
  lastUpdated: Date | null;
}

const DEFAULT_POLL_INTERVAL = 15; // seconds

export function useMarketData(tickers: Ticker[], isActive: boolean, pollIntervalSeconds: number = DEFAULT_POLL_INTERVAL) {
  const [state, setState] = useState<MarketDataState>({
    quotes: {},
    loading: false,
    lastUpdated: null,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const errorCountRef = useRef(0);

  const fetchQuotes = useCallback(async () => {
    if (tickers.length === 0) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const symbols = tickers.map(t => ({
        symbol: t.symbol,
        assetType: t.asset_type,
      }));

      const { data, error } = await supabase.functions.invoke('market-data', {
        body: { symbols },
      });

      if (error) {
        console.error('Error fetching market data:', error);
        errorCountRef.current += 1;
        return;
      }

      const quotes: Record<string, Quote> = {};
      for (const quote of data.quotes) {
        quotes[quote.symbol] = quote;
      }

      setState({
        quotes,
        loading: false,
        lastUpdated: new Date(),
      });

      // Reset error count on success
      errorCountRef.current = 0;

      // Update tickers in database with latest prices (only if available)
      const now = new Date().toISOString();
      for (const ticker of tickers) {
        const quote = quotes[ticker.symbol];
        if (quote && quote.price !== null && quote.quoteStatus !== 'unavailable') {
          await supabase
            .from('tickers')
            .update({
              last_price: quote.price,
              day_change: quote.change,
              day_change_pct: quote.changePct,
              last_updated_at: now,
            })
            .eq('id', ticker.id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      errorCountRef.current += 1;
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [tickers]);

  useEffect(() => {
    if (!isActive || tickers.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial fetch
    fetchQuotes();

    // Set up polling interval
    intervalRef.current = setInterval(() => {
      // Stop polling if too many consecutive errors
      if (errorCountRef.current >= 3) {
        console.warn('Too many market data errors, stopping polling');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }
      fetchQuotes();
    }, pollIntervalSeconds * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, tickers.length, fetchQuotes, pollIntervalSeconds]);

  return state;
}
