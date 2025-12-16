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
  change: number | null;
  changePct: number | null;
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

// Browser-like headers for Yahoo requests
const yahooHeaders = {
  'Accept': 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
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

// Sleep helper for retry backoff
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch with retry and fallback endpoints
async function fetchYahooWithRetry(symbol: string): Promise<{ data: any; networkError: boolean }> {
  const upperSymbol = symbol.toUpperCase().trim();
  const endpoints = [
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(upperSymbol)}`,
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(upperSymbol)}`,
  ];
  
  const retryDelays = [0, 300, 800]; // Initial, first retry, second retry
  
  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (attempt > 0) {
        await sleep(retryDelays[attempt]);
      }
      
      try {
        console.log(`Yahoo fetch attempt ${attempt + 1} for ${upperSymbol}: ${endpoint}`);
        
        const response = await fetch(endpoint, {
          headers: yahooHeaders,
        });

        if (response.ok) {
          const data = await response.json();
          const result = data?.quoteResponse?.result;
          
          // Check if we got valid results
          if (result && Array.isArray(result) && result.length > 0) {
            console.log(`Yahoo success for ${upperSymbol}: got ${result.length} results`);
            return { data: result[0], networkError: false };
          }
          
          // Empty result array - symbol not found
          console.log(`Yahoo returned empty result for ${upperSymbol}`);
          return { data: null, networkError: false };
        }
        
        console.log(`Yahoo HTTP error ${response.status} for ${upperSymbol}`);
        
        // If rate limited, wait longer before retry
        if (response.status === 429) {
          await sleep(1000);
        }
      } catch (error) {
        console.error(`Yahoo network error for ${upperSymbol}:`, error);
        // Continue to retry/fallback
      }
    }
  }
  
  // All attempts failed
  console.log(`Yahoo all attempts failed for ${upperSymbol}`);
  return { data: null, networkError: true };
}

async function fetchYahooPrice(symbol: string): Promise<{ quote: QuoteData | null; networkError: boolean }> {
  const upperSymbol = symbol.toUpperCase().trim();
  
  const cached = yahooCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { quote: cached.data, networkError: false };
  }

  const { data: result, networkError } = await fetchYahooWithRetry(upperSymbol);
  
  if (!result) {
    yahooCache.set(upperSymbol, { data: null, timestamp: Date.now() });
    return { quote: null, networkError };
  }

  // Extract price
  const price = result.regularMarketPrice;
  if (price === null || price === undefined || typeof price !== 'number') {
    console.log(`Yahoo no valid price for ${upperSymbol}`);
    yahooCache.set(upperSymbol, { data: null, timestamp: Date.now() });
    return { quote: null, networkError: false };
  }

  // Extract change - regularMarketChange is the dollar change
  let change: number | null = null;
  if (typeof result.regularMarketChange === 'number' && !Number.isNaN(result.regularMarketChange)) {
    change = result.regularMarketChange;
  }

  // Extract changePct - regularMarketChangePercent is already a percentage (e.g., -1.97 for -1.97%)
  let changePct: number | null = null;
  if (typeof result.regularMarketChangePercent === 'number' && !Number.isNaN(result.regularMarketChangePercent)) {
    changePct = result.regularMarketChangePercent;
  } else if (change !== null && typeof result.regularMarketPreviousClose === 'number' && result.regularMarketPreviousClose > 0) {
    // Fallback: compute from previousClose
    changePct = (change / result.regularMarketPreviousClose) * 100;
  }

  console.log(`Yahoo quote for ${upperSymbol}: price=${price}, change=${change}, changePct=${changePct}`);

  const quote: QuoteData = {
    price: Math.round(price * 100) / 100,
    change: change !== null ? Math.round(change * 100) / 100 : null,
    changePct: changePct !== null ? Math.round(changePct * 100) / 100 : null,
    marketCap: result.marketCap,
    volume24h: result.regularMarketVolume,
    highRange: result.fiftyTwoWeekHigh,
    lowRange: result.fiftyTwoWeekLow,
  };

  yahooCache.set(upperSymbol, { data: quote, timestamp: Date.now() });
  return { quote, networkError: false };
}

// Validate symbol exists via Yahoo Finance
async function validateSymbol(symbol: string, assetType: string): Promise<{ valid: boolean; reason?: string }> {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // For crypto, check our mapping
  if (assetType === 'crypto') {
    if (cryptoIdMap[upperSymbol]) {
      return { valid: true };
    }
    return { valid: false, reason: 'Crypto symbol not supported' };
  }
  
  // For stocks/ETFs, validate format first (1-5 letters)
  if (!/^[A-Z]{1,5}$/.test(upperSymbol)) {
    return { valid: false, reason: 'Symbol must be 1-5 letters (A-Z)' };
  }
  
  // Check with Yahoo Finance
  const { data: result, networkError } = await fetchYahooWithRetry(upperSymbol);
  
  if (networkError) {
    // Network/API issue - allow the symbol but warn user
    return { valid: true, reason: 'Could not verify symbol - will check on refresh' };
  }
  
  if (!result || typeof result.regularMarketPrice !== 'number') {
    return { valid: false, reason: 'Symbol not found' };
  }
  
  return { valid: true };
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
      const { quote: yahooQuote, networkError } = await fetchYahooPrice(symbol);
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
      // Yahoo failed or symbol not found - return unavailable with source info
      return {
        symbol: upperSymbol,
        price: null,
        change: null,
        changePct: null,
        isDelayed: true,
        quoteStatus: networkError ? 'source_unavailable' : 'unavailable',
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
