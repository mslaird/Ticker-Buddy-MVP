import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory cache (15 second TTL)
const cryptoCache: Map<string, { data: QuoteData; timestamp: number }> = new Map();
const yahooCache: Map<string, { data: QuoteData; timestamp: number }> = new Map();
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
    // ETFs: $50-$500 range, relatively stable
    return 50 + (hash % 450);
  }
  
  // Stocks: Use symbol-seeded tiers for realistic ranges
  // Tier 0: Penny/micro-cap ($1-$15)
  // Tier 1: Small-cap ($10-$50)
  // Tier 2: Mid-cap ($40-$150)
  // Tier 3: Large-cap ($100-$400)
  const tier = hash % 4;
  if (tier === 0) return 1 + (hash % 1400) / 100;      // $1-$15
  if (tier === 1) return 10 + (hash % 4000) / 100;    // $10-$50
  if (tier === 2) return 40 + (hash % 11000) / 100;   // $40-$150
  return 100 + (hash % 30000) / 100;                   // $100-$400
}

function getMockQuote(symbol: string, assetType: string) {
  const basePrice = getBasePrice(symbol, assetType);
  const now = new Date();
  const timeSeed = Math.floor(now.getTime() / 60000);
  const combinedSeed = hashCode(symbol) + timeSeed;
  
  // Intraday movement: ±2% max
  const movementPct = (seededRandom(combinedSeed) - 0.5) * 0.04;
  const price = basePrice * (1 + movementPct);
  
  // Daily change: cap at ±6% for realistic equity behavior
  const daySeed = hashCode(symbol + now.toDateString());
  const dayChangePct = (seededRandom(daySeed) - 0.5) * 0.12; // ±6% max
  const dayChange = basePrice * dayChangePct;
  
  return {
    symbol: symbol.toUpperCase(),
    price: Math.round(price * 100) / 100,
    change: Math.round(dayChange * 100) / 100,
    changePct: Math.round(dayChangePct * 10000) / 100,
    isDelayed: true,
  };
}

async function fetchCoinGeckoPrice(symbol: string): Promise<QuoteData | null> {
  const coinId = cryptoIdMap[symbol.toUpperCase()];
  if (!coinId) {
    return null;
  }

  // Check cache first
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
  
  // Check cache first
  const cached = yahooCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // Use the chart API endpoint
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperSymbol)}?interval=1d&range=5d&includePrePost=true`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const chartResult = data?.chart?.result?.[0];
    if (!chartResult) {
      return null;
    }

    const meta = chartResult.meta;
    if (!meta || meta.regularMarketPrice === undefined) {
      return null;
    }

    // Get price - prefer regularMarketPrice, fallback to postMarket or preMarket
    let price = meta.regularMarketPrice;
    if (price === null || price === undefined) {
      price = meta.postMarketPrice ?? meta.preMarketPrice ?? null;
    }
    
    if (price === null || price === undefined) {
      return null;
    }

    // Calculate change from previous close
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
    return null;
  }
}

async function getQuote(symbol: string, assetType: string, useProduction: boolean) {
  // In production mode, use real data sources
  if (useProduction) {
    // Crypto: use CoinGecko (live)
    if (assetType === 'crypto') {
      const cryptoQuote = await fetchCoinGeckoPrice(symbol);
      if (cryptoQuote) {
        return {
          symbol: symbol.toUpperCase(),
          price: cryptoQuote.price,
          change: cryptoQuote.change,
          changePct: cryptoQuote.changePct,
          isDelayed: false,
          marketCap: cryptoQuote.marketCap,
          volume24h: cryptoQuote.volume24h,
          highRange: cryptoQuote.highRange,
          lowRange: cryptoQuote.lowRange,
        };
      }
    }
    
    // Stocks/ETFs: use Yahoo Finance (delayed)
    if (assetType === 'stock' || assetType === 'etf') {
      const yahooQuote = await fetchYahooPrice(symbol);
      if (yahooQuote) {
        return {
          symbol: symbol.toUpperCase(),
          price: yahooQuote.price,
          change: yahooQuote.change,
          changePct: yahooQuote.changePct,
          isDelayed: true,
          marketCap: yahooQuote.marketCap,
          volume24h: yahooQuote.volume24h,
          highRange: yahooQuote.highRange,
          lowRange: yahooQuote.lowRange,
        };
      }
    }
  }

  // Use mock as fallback
  return getMockQuote(symbol, assetType);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbols } = await req.json();
    
    if (!symbols || !Array.isArray(symbols)) {
      console.error('Invalid request: symbols must be an array');
      return new Response(
        JSON.stringify({ error: 'symbols must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default to production mode (CoinGecko for crypto, Yahoo for equities)
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
