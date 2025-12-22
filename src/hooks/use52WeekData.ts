import { useState, useEffect, useRef } from 'react';

interface FiftyTwoWeekData {
  high52w: number | null;
  low52w: number | null;
  loading: boolean;
  source: 'chart' | 'quote' | 'none';
}

// Cache: symbol -> { data, timestamp }
const cache = new Map<string, { data: { high: number; low: number }; timestamp: number }>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Isolated hook for fetching 52-week high/low data.
 * This does NOT modify or interfere with any existing price/quote fetching.
 * Used only for Advanced Metrics (Pro) display.
 */
export function use52WeekData(symbol: string | null, assetType: string): FiftyTwoWeekData {
  const [data, setData] = useState<FiftyTwoWeekData>({
    high52w: null,
    low52w: null,
    loading: false,
    source: 'none',
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!symbol || assetType === 'crypto') {
      // Crypto uses different range data, not 52-week
      setData({ high52w: null, low52w: null, loading: false, source: 'none' });
      return;
    }

    // Check cache first
    const cached = cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      console.log(`[52WeekData] Cache hit for ${symbol}`);
      setData({
        high52w: cached.data.high,
        low52w: cached.data.low,
        loading: false,
        source: 'chart',
      });
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setData(prev => ({ ...prev, loading: true }));

    const fetchData = async () => {
      try {
        // Fetch 1-year daily chart data from Yahoo Finance
        // Using a 5 second timeout to prevent blocking
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const json = await response.json();
        const result = json?.chart?.result?.[0];
        
        if (!result) {
          throw new Error('No chart result');
        }

        // Try to compute from chart data first
        const quotes = result.indicators?.quote?.[0];
        if (quotes?.high && quotes?.low) {
          const highs = quotes.high.filter((v: number | null) => v !== null && !isNaN(v)) as number[];
          const lows = quotes.low.filter((v: number | null) => v !== null && !isNaN(v)) as number[];
          
          if (highs.length > 0 && lows.length > 0) {
            const high52 = Math.max(...highs);
            const low52 = Math.min(...lows);
            
            console.log(`[52WeekData] Chart computed for ${symbol}: high=${high52.toFixed(2)}, low=${low52.toFixed(2)}`);
            
            // Cache the result
            cache.set(symbol, { data: { high: high52, low: low52 }, timestamp: Date.now() });
            
            setData({
              high52w: high52,
              low52w: low52,
              loading: false,
              source: 'chart',
            });
            return;
          }
        }

        // Fallback: try quote-level fields if available
        const meta = result.meta;
        if (meta?.fiftyTwoWeekHigh !== undefined && meta?.fiftyTwoWeekLow !== undefined) {
          console.log(`[52WeekData] Quote fallback for ${symbol}: high=${meta.fiftyTwoWeekHigh}, low=${meta.fiftyTwoWeekLow}`);
          
          cache.set(symbol, { 
            data: { high: meta.fiftyTwoWeekHigh, low: meta.fiftyTwoWeekLow }, 
            timestamp: Date.now() 
          });
          
          setData({
            high52w: meta.fiftyTwoWeekHigh,
            low52w: meta.fiftyTwoWeekLow,
            loading: false,
            source: 'quote',
          });
          return;
        }

        throw new Error('No 52-week data available');
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.log(`[52WeekData] Request aborted for ${symbol}`);
          return;
        }
        
        console.warn(`[52WeekData] Failed to fetch for ${symbol}:`, (err as Error).message);
        
        setData({
          high52w: null,
          low52w: null,
          loading: false,
          source: 'none',
        });
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [symbol, assetType]);

  return data;
}
