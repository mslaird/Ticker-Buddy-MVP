/**
 * Advanced Metrics Fetcher
 * 
 * Reuses the existing market-data edge function to extract advanced metrics
 * (52-week high/low, volume, market cap) from the same provider.
 * 
 * IMPORTANT: This does NOT replace or modify core quote/price fetching.
 * It simply extracts additional fields from the existing quote data.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AdvancedMetrics {
  yearHigh: number | null;
  yearLow: number | null;
  volume: number | null;
  marketCap: number | null;
  sourceLabel: string;
}

export interface FetchAdvancedMetricsResult {
  data: AdvancedMetrics | null;
  error: string | null;
  isLoading: boolean;
}

/**
 * Fetches advanced metrics for a single symbol using the existing market-data edge function.
 * Returns 52-week high/low, volume, and market cap.
 * 
 * @param symbol - The ticker symbol (e.g., "BMNR", "SPY")
 * @param assetType - The asset type ("stock", "etf", "crypto")
 * @returns AdvancedMetrics or null if unavailable
 */
export async function fetchAdvancedMetrics(
  symbol: string,
  assetType: string
): Promise<{ data: AdvancedMetrics | null; error: string | null }> {
  if (!symbol || symbol.trim() === '') {
    return { data: null, error: 'No symbol provided' };
  }

  const upperSymbol = symbol.trim().toUpperCase();

  try {
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: {
        symbols: [{ symbol: upperSymbol, assetType: assetType || 'stock' }],
      },
    });

    if (error) {
      console.error('[fetchAdvancedMetrics] Edge function error:', error);
      return { data: null, error: 'Failed to fetch advanced metrics' };
    }

    const quotes = data?.quotes;
    if (!Array.isArray(quotes) || quotes.length === 0) {
      return { data: null, error: 'No quote data returned' };
    }

    const quote = quotes[0];

    // TEMP DEBUG — REMOVE AFTER VERIFICATION
    console.log('[MarketCap Debug] Raw quote response for', upperSymbol, ':', JSON.stringify(quote, null, 2));

    // Extract 52-week high/low from the quote's highRange/lowRange fields
    // These are populated from Yahoo's fiftyTwoWeekHigh/fiftyTwoWeekLow or CoinGecko's ATH/ATL
    const yearHigh = typeof quote.highRange === 'number' ? quote.highRange : null;
    const yearLow = typeof quote.lowRange === 'number' ? quote.lowRange : null;
    const volume = typeof quote.volume24h === 'number' ? quote.volume24h : null;
    const marketCap = typeof quote.marketCap === 'number' ? quote.marketCap : null;

    // Determine source label based on asset type
    const sourceLabel = assetType === 'crypto' ? 'CoinGecko' : 'Yahoo Finance';

    return {
      data: {
        yearHigh,
        yearLow,
        volume,
        marketCap,
        sourceLabel,
      },
      error: null,
    };
  } catch (err) {
    console.error('[fetchAdvancedMetrics] Exception:', err);
    return { data: null, error: 'Network error fetching advanced metrics' };
  }
}
