import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache (15 second TTL)
const cryptoCache: Map<string, { data: QuoteData; timestamp: number }> = new Map();
const yahooCache: Map<string, { data: QuoteData | null; timestamp: number }> = new Map();
const CACHE_TTL_MS = 15000;

interface QuoteData {
  price: number;
  change: number;
  changePct: number;
  marketCap?: number;
  volume24h?: number;
  highRange?: number;
  lowRange?: number;
}

// Common crypto symbol to CoinGecko ID mapping
const cryptoIdMap: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'DOGE': 'dogecoin',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'BCH': 'bitcoin-cash',
  'NEAR': 'near',
  'APT': 'aptos',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'FIL': 'filecoin',
  'SHIB': 'shiba-inu',
};

// Generate stable mock prices using symbol as seed
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getBasePrice(symbol: string, assetType: string): number {
  const hash = hashCode(symbol);
  
  if (assetType === 'crypto') {
    const tier = hash % 4;
    if (tier === 0) return 0.5 + (hash % 100) / 10;
    if (tier === 1) return 10 + (hash % 500);
    if (tier === 2) return 500 + (hash % 5000);
    return 20000 + (hash % 30000);
  }
  
  if (assetType === 'etf') {
    return 50 + (hash % 450);
  }
  
  const tier = hash % 4;
  if (tier === 0) return 1 + (hash % 1400) / 100;
  if (tier === 1) return 10 + (hash % 4000) / 100;
  if (tier === 2) return 40 + (hash % 11000) / 100;
  return 100 + (hash % 30000) / 100;
}

function getMockQuote(symbol: string, assetType: string) {
  const basePrice = getBasePrice(symbol, assetType);
  const now = new Date();
  const timeSeed = Math.floor(now.getTime() / 60000);
  const combinedSeed = hashCode(symbol) + timeSeed;
  
  const movementPct = (seededRandom(combinedSeed) - 0.5) * 0.04;
  const price = basePrice * (1 + movementPct);
  
  const daySeed = hashCode(symbol + now.toDateString());
  const dayChangePct = (seededRandom(daySeed) - 0.5) * 0.12;
  const dayChange = basePrice * dayChangePct;
  
  return {
    symbol: symbol.toUpperCase(),
    price: Math.round(price * 100) / 100,
    change: Math.round(dayChange * 100) / 100,
    changePct: Math.round(dayChangePct * 10000) / 100,
    isDelayed: true,
    quoteStatus: 'available' as const,
  };
}

async function fetchCoinGeckoPrice(symbol: string): Promise<QuoteData | null> {
  const coinId = cryptoIdMap[symbol.toUpperCase()];
  if (!coinId) {
    return null;
  }

  const cached = cryptoCache.get(coinId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&price_change_percentage=24h`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const coinData = data[0];
    const quote: QuoteData = {
      price: Math.round(coinData.current_price * 100) / 100,
      change: Math.round((coinData.price_change_24h || 0) * 100) / 100,
      changePct: Math.round((coinData.price_change_percentage_24h || 0) * 100) / 100,
      marketCap: coinData.market_cap,
      volume24h: coinData.total_volume,
      highRange: coinData.ath,
      lowRange: coinData.atl,
    };

    cryptoCache.set(coinId, { data: quote, timestamp: Date.now() });
    return quote;
  } catch (error) {
    return null;
  }
}

async function fetchYahooPrice(symbol: string): Promise<QuoteData | null> {
  const upperSymbol = symbol.toUpperCase();
  
  const cached = yahooCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperSymbol)}?interval=1d&range=5d&includePrePost=true`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      // Cache the null result to avoid hammering the API
      yahooCache.set(upperSymbol, { data: null, timestamp: Date.now() });
      return null;
    }

    const data = await response.json();
    const chartResult = data?.chart?.result?.[0];
    
    if (!chartResult) {
      yahooCache.set(upperSymbol, { data: null, timestamp: Date.now() });
      return null;
    }

    const meta = chartResult.meta;
    if (!meta || meta.regularMarketPrice === undefined) {
      yahooCache.set(upperSymbol, { data: null, timestamp: Date.now() });
      return null;
    }

    let price = meta.regularMarketPrice;
    if (price === null || price === undefined) {
      price = meta.postMarketPrice ?? meta.preMarketPrice ?? null;
    }
    
    if (price === null || price === undefined) {
      yahooCache.set(upperSymbol, { data: null, timestamp: Date.now() });
      return null;
    }

    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    const quote: QuoteData = {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      marketCap: meta.marketCap,
      volume24h: meta.regularMarketVolume,
      highRange: meta.fiftyTwoWeekHigh,
      lowRange: meta.fiftyTwoWeekLow,
    };

    yahooCache.set(upperSymbol, { data: quote, timestamp: Date.now() });
    return quote;
  } catch (error) {
    yahooCache.set(upperSymbol, { data: null, timestamp: Date.now() });
    return null;
  }
}

// Validate symbol exists via Yahoo Finance
async function validateSymbol(symbol: string, assetType: string): Promise<{ valid: boolean; reason?: string }> {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // For crypto, check our mapping
  if (assetType === 'crypto') {
    if (cryptoIdMap[upperSymbol]) {
      return { valid: true };
    }
    return { valid: false, reason: 'Symbol not found' };
  }
  
  // For stocks/ETFs, validate format first (1-5 letters)
  if (!/^[A-Z]{1,5}$/.test(upperSymbol)) {
    return { valid: false, reason: 'Invalid symbol format' };
  }
  
  // Check with Yahoo Finance
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperSymbol)}?interval=1d&range=1d`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return { valid: false, reason: 'Symbol not found' };
    }

    const data = await response.json();
    const chartResult = data?.chart?.result?.[0];
    
    if (!chartResult || !chartResult.meta?.regularMarketPrice) {
      return { valid: false, reason: 'Symbol not found' };
    }
    
    return { valid: true };
  } catch (error) {
    // If Yahoo is down, allow the symbol (will show as unavailable later)
    return { valid: true };
  }
}

async function getQuote(symbol: string, assetType: string, useProduction: boolean) {
  const upperSymbol = symbol.toUpperCase();
  
  // In production mode, use real data sources
  if (useProduction) {
    // Crypto: use CoinGecko (live)
    if (assetType === 'crypto') {
      const cryptoQuote = await fetchCoinGeckoPrice(symbol);
      if (cryptoQuote) {
        return {
          symbol: upperSymbol,
          price: cryptoQuote.price,
          change: cryptoQuote.change,
          changePct: cryptoQuote.changePct,
          isDelayed: false,
          quoteStatus: 'available',
          marketCap: cryptoQuote.marketCap,
          volume24h: cryptoQuote.volume24h,
          highRange: cryptoQuote.highRange,
          lowRange: cryptoQuote.lowRange,
        };
      }
      // Crypto not found - return unavailable (no mock fallback)
      return {
        symbol: upperSymbol,
        price: null,
        change: null,
        changePct: null,
        isDelayed: false,
        quoteStatus: 'unavailable',
      };
    }
    
    // Stocks/ETFs: use Yahoo Finance (delayed) - NO mock fallback
    if (assetType === 'stock' || assetType === 'etf') {
      const yahooQuote = await fetchYahooPrice(symbol);
      if (yahooQuote) {
        return {
          symbol: upperSymbol,
          price: yahooQuote.price,
          change: yahooQuote.change,
          changePct: yahooQuote.changePct,
          isDelayed: true,
          quoteStatus: 'available',
          marketCap: yahooQuote.marketCap,
          volume24h: yahooQuote.volume24h,
          highRange: yahooQuote.highRange,
          lowRange: yahooQuote.lowRange,
        };
      }
      // Yahoo failed or symbol not found - return unavailable (NO mock fallback)
      return {
        symbol: upperSymbol,
        price: null,
        change: null,
        changePct: null,
        isDelayed: true,
        quoteStatus: 'unavailable',
      };
    }
  }

  // Mock mode only - used when MARKET_DATA_PROVIDER=mock
  return getMockQuote(symbol, assetType);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Handle symbol validation request
    if (body.action === 'validate') {
      const { symbol, assetType } = body;
      const result = await validateSymbol(symbol, assetType);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle quotes request
    const { symbols } = body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return new Response(
        JSON.stringify({ error: 'symbols must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const providerMode = Deno.env.get('MARKET_DATA_PROVIDER') || 'production';
    const useProduction = providerMode === 'production';

    const quotes = await Promise.all(
      symbols.map((item: { symbol: string; assetType: string }) => 
        getQuote(item.symbol, item.assetType || 'stock', useProduction)
      )
    );

    return new Response(
      JSON.stringify({ quotes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in market-data function:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch market data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
