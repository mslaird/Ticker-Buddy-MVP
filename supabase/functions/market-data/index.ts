import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

// Seeded random number generator for stable prices
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getBasePrice(symbol: string, assetType: string): number {
  const hash = hashCode(symbol);
  
  if (assetType === 'crypto') {
    // Crypto: wide range from $0.50 to $50000
    const tier = hash % 4;
    if (tier === 0) return 0.5 + (hash % 100) / 10; // Low cap: $0.50 - $10.50
    if (tier === 1) return 10 + (hash % 500); // Mid cap: $10 - $510
    if (tier === 2) return 500 + (hash % 5000); // High cap: $500 - $5500
    return 20000 + (hash % 30000); // BTC-like: $20000 - $50000
  }
  
  if (assetType === 'etf') {
    // ETFs: $50 - $500
    return 50 + (hash % 450);
  }
  
  // Stocks: $10 - $500
  return 10 + (hash % 490);
}

function getQuote(symbol: string, assetType: string) {
  const basePrice = getBasePrice(symbol, assetType);
  
  // Use current minute as part of seed for slight variation over time
  // But keep it stable within the same minute
  const now = new Date();
  const timeSeed = Math.floor(now.getTime() / 60000); // Changes every minute
  const combinedSeed = hashCode(symbol) + timeSeed;
  
  // Small random movement: -2% to +2%
  const movementPct = (seededRandom(combinedSeed) - 0.5) * 0.04;
  const price = basePrice * (1 + movementPct);
  
  // Day change: -5% to +5% based on symbol + day
  const daySeed = hashCode(symbol + now.toDateString());
  const dayChangePct = (seededRandom(daySeed) - 0.5) * 0.1;
  const dayChange = basePrice * dayChangePct;
  
  return {
    symbol: symbol.toUpperCase(),
    price: Math.round(price * 100) / 100,
    change: Math.round(dayChange * 100) / 100,
    changePct: Math.round(dayChangePct * 10000) / 100,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    console.log(`Fetching quotes for ${symbols.length} symbols:`, symbols.map(s => s.symbol));
    
    const quotes = symbols.map((item: { symbol: string; assetType: string }) => 
      getQuote(item.symbol, item.assetType || 'stock')
    );

    console.log('Generated quotes:', quotes);

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
