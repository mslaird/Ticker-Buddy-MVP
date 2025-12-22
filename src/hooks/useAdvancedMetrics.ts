/**
 * useAdvancedMetrics Hook
 * 
 * Fetches and caches advanced metrics (52-week high/low, volume, market cap)
 * for a given ticker symbol. Uses the existing market-data edge function.
 * 
 * IMPORTANT: This hook is isolated from core quote/price fetching logic.
 * It provides supplementary data for the AssetDetailDrawer Pro section.
 * 
 * Usage:
 *   const { yearHigh, yearLow, volume, marketCap, isLoading, error } = useAdvancedMetrics({
 *     symbol: ticker?.symbol ?? '',
 *     assetType: ticker?.asset_type ?? 'stock',
 *     enabled: !!ticker && isOpen,
 *   });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAdvancedMetrics, AdvancedMetrics } from '@/lib/fetchAdvancedMetrics';

export interface UseAdvancedMetricsOptions {
  symbol: string;
  assetType: string;
  enabled?: boolean;
}

export interface UseAdvancedMetricsResult {
  yearHigh: number | null;
  yearLow: number | null;
  volume: number | null;
  marketCap: number | null;
  isLoading: boolean;
  error: string | null;
  sourceLabel: string;
}

const CACHE_TTL_MS = 60000; // 1 minute cache

// Simple in-memory cache
const metricsCache: Map<string, { data: AdvancedMetrics; timestamp: number }> = new Map();

export function useAdvancedMetrics({
  symbol,
  assetType,
  enabled = true,
}: UseAdvancedMetricsOptions): UseAdvancedMetricsResult {
  const [data, setData] = useState<AdvancedMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  const normalizedSymbol = (symbol ?? '').trim().toUpperCase();
  const cacheKey = `${normalizedSymbol}:${assetType}`;

  const doFetch = useCallback(async () => {
    if (!normalizedSymbol || !enabled) {
      return;
    }

    // Check cache first
    const cached = metricsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setData(cached.data);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchedRef.current === cacheKey) {
      return;
    }
    fetchedRef.current = cacheKey;

    setIsLoading(true);
    setError(null);

    const result = await fetchAdvancedMetrics(normalizedSymbol, assetType);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else if (result.data) {
      setData(result.data);
      metricsCache.set(cacheKey, { data: result.data, timestamp: Date.now() });
    }

    setIsLoading(false);
  }, [normalizedSymbol, assetType, enabled, cacheKey]);

  useEffect(() => {
    if (enabled && normalizedSymbol) {
      doFetch();
    } else {
      // Reset state when disabled
      setData(null);
      setError(null);
      setIsLoading(false);
      fetchedRef.current = null;
    }
  }, [enabled, normalizedSymbol, doFetch]);

  // Reset fetched ref when symbol changes
  useEffect(() => {
    fetchedRef.current = null;
  }, [normalizedSymbol]);

  return {
    yearHigh: data?.yearHigh ?? null,
    yearLow: data?.yearLow ?? null,
    volume: data?.volume ?? null,
    marketCap: data?.marketCap ?? null,
    isLoading,
    error,
    sourceLabel: data?.sourceLabel ?? '',
  };
}
