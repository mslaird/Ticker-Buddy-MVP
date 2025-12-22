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

// Crypto symbol to friendly display name fallback map
const cryptoNameMap: Record<string, string> = {
  'BTC': 'Bitcoin',
  'ETH': 'Ethereum',
  'SOL': 'Solana',
  'ADA': 'Cardano',
  'XRP': 'Ripple',
  'DOGE': 'Dogecoin',
  'AVAX': 'Avalanche',
  'DOT': 'Polkadot',
  'LINK': 'Chainlink',
  'MATIC': 'Polygon',
  'LTC': 'Litecoin',
  'BCH': 'Bitcoin Cash',
  'UNI': 'Uniswap',
  'ATOM': 'Cosmos',
  'NEAR': 'NEAR Protocol',
  'APT': 'Aptos',
  'ARB': 'Arbitrum',
  'OP': 'Optimism',
  'FIL': 'Filecoin',
  'SHIB': 'Shiba Inu',
  'XLM': 'Stellar',
  'ALGO': 'Algorand',
  'VET': 'VeChain',
  'ICP': 'Internet Computer',
  'HBAR': 'Hedera',
  'SAND': 'The Sandbox',
  'MANA': 'Decentraland',
  'AXS': 'Axie Infinity',
  'AAVE': 'Aave',
  'MKR': 'Maker',
  'CRO': 'Cronos',
  'FTM': 'Fantom',
  'EGLD': 'MultiversX',
  'THETA': 'Theta Network',
  'XTZ': 'Tezos',
  'EOS': 'EOS',
  'FLOW': 'Flow',
  'KCS': 'KuCoin',
  'NEO': 'NEO',
  'KLAY': 'Klaytn',
  'XMR': 'Monero',
  'CAKE': 'PancakeSwap',
  'GRT': 'The Graph',
  'CHZ': 'Chiliz',
  'ENJ': 'Enjin Coin',
  'ZEC': 'Zcash',
  'BAT': 'Basic Attention Token',
  'COMP': 'Compound',
  'SNX': 'Synthetix',
  'YFI': 'yearn.finance',
  'SUSHI': 'SushiSwap',
  '1INCH': '1inch',
  'CRV': 'Curve DAO',
  'LDO': 'Lido DAO',
  'RPL': 'Rocket Pool',
  'PEPE': 'Pepe',
  'WIF': 'dogwifhat',
  'BONK': 'Bonk',
  'FLOKI': 'Floki',
  'RENDER': 'Render',
  'INJ': 'Injective',
  'SEI': 'Sei',
  'SUI': 'Sui',
  'TIA': 'Celestia',
  'JUP': 'Jupiter',
  'PYTH': 'Pyth Network',
  'WLD': 'Worldcoin',
  'BLUR': 'Blur',
  'RNDR': 'Render Token',
  'IMX': 'Immutable X',
  'GMX': 'GMX',
  'PENDLE': 'Pendle',
  'STX': 'Stacks',
  'RUNE': 'THORChain',
  'OSMO': 'Osmosis',
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

// Cache for market cap data (separate from quote cache)
const marketCapCache: Map<string, { data: number | null; timestamp: number }> = new Map();
const MARKET_CAP_CACHE_TTL_MS = 60000; // 1 minute for market cap

// Fetch market cap from Yahoo v10 quoteSummary API (server-side only)
async function fetchYahooMarketCap(symbol: string): Promise<number | null> {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // Check cache first
  const cached = marketCapCache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < MARKET_CAP_CACHE_TTL_MS) {
    return cached.data;
  }
  
  // Try multiple endpoints in order of reliability
  const endpoints = [
    `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(upperSymbol)}?modules=price`,
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(upperSymbol)}?modules=price`,
  ];
  
  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const priceData = data?.quoteSummary?.result?.[0]?.price;
        
        if (priceData) {
          const marketCap = priceData.marketCap?.raw;
          if (typeof marketCap === 'number' && marketCap > 0) {
            marketCapCache.set(upperSymbol, { data: marketCap, timestamp: Date.now() });
            return marketCap;
          }
        }
      }
    } catch (error) {
      // Continue to next endpoint
    }
  }
  
  // Cache null result to avoid repeated failed requests
  marketCapCache.set(upperSymbol, { data: null, timestamp: Date.now() });
  return null;
}

// Fetch using Yahoo chart API (more reliable from server environments)
async function fetchYahooWithRetry(symbol: string): Promise<{ data: any; networkError: boolean }> {
  const upperSymbol = symbol.toUpperCase().trim();
  
  // Use v8 chart API - more reliable from server environments
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperSymbol)}?interval=1d&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperSymbol)}?interval=1d&range=1d`,
  ];
  
  const retryDelays = [0, 500, 1000];
  
  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (attempt > 0) {
        await sleep(retryDelays[attempt]);
      }
      
      try {
        console.log(`Yahoo chart fetch attempt ${attempt + 1} for ${upperSymbol}`);
        
        const response = await fetch(endpoint, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const chart = data?.chart?.result?.[0];
          
          if (chart && chart.meta) {
            const meta = chart.meta;
            const price = meta.regularMarketPrice;
            const previousClose = meta.chartPreviousClose || meta.previousClose;
            
            // Compute change from previousClose (Yahoo's standard approach)
            let change: number | null = null;
            let changePct: number | null = null;
            
            if (typeof price === 'number' && typeof previousClose === 'number' && previousClose > 0) {
              change = price - previousClose;
              changePct = (change / previousClose) * 100;
            }
            
            if (typeof price === 'number') {
              console.log(`Yahoo chart success for ${upperSymbol}: price=${price}, prevClose=${previousClose}, change=${change?.toFixed(2)}, changePct=${changePct?.toFixed(2)}%`);
              
              return { 
                data: {
                  regularMarketPrice: price,
                  regularMarketChange: change,
                  regularMarketChangePercent: changePct,
                  fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
                  fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
                  regularMarketVolume: meta.regularMarketVolume,
                },
                networkError: false 
              };
            }
          }
          
          // No valid chart data
          console.log(`Yahoo chart no valid data for ${upperSymbol}`);
          return { data: null, networkError: false };
        }
        
        console.log(`Yahoo chart HTTP ${response.status} for ${upperSymbol}`);
        
        if (response.status === 429) {
          await sleep(1500);
        }
      } catch (error) {
        console.error(`Yahoo chart network error for ${upperSymbol}:`, error);
      }
    }
  }
  
  console.log(`Yahoo chart all attempts failed for ${upperSymbol}`);
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

  // Use Yahoo's native change fields directly
  let change: number | null = null;
  let changePct: number | null = null;
  
  if (typeof result.regularMarketChange === 'number' && !Number.isNaN(result.regularMarketChange)) {
    change = result.regularMarketChange;
  }
  
  if (typeof result.regularMarketChangePercent === 'number' && !Number.isNaN(result.regularMarketChangePercent)) {
    changePct = result.regularMarketChangePercent;
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

// Well-known ETF symbols for quick detection
const knownETFs = new Set([
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'EFA', 'EEM',
  'AGG', 'BND', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY', 'TIP', 'VCIT', 'VCSH',
  'GLD', 'SLV', 'USO', 'UNG', 'DBC', 'GSG', 'PDBC', 'IAU', 'SGOL', 'PPLT',
  'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLB', 'XLU', 'XLRE',
  'VNQ', 'IYR', 'SCHH', 'RWR', 'USRT', 'REET', 'ICF', 'REM', 'MORT', 'REZ',
  'ARKK', 'ARKG', 'ARKW', 'ARKF', 'ARKQ', 'ARKX', 'PRNT', 'IZRL', 'CTRU',
  'VGT', 'FTEC', 'IYW', 'IGV', 'SMH', 'SOXX', 'XSD', 'PSJ', 'SKYY', 'CLOU',
  'VHT', 'XBI', 'IBB', 'IHI', 'IHF', 'XHS', 'ARKG', 'IDNA', 'GNOM', 'HELX',
  'VFH', 'IYF', 'KRE', 'KBE', 'IAI', 'IAT', 'KBWB', 'KBWP', 'KBWR', 'KBWY',
  'VDE', 'XOP', 'OIH', 'AMLP', 'MLPA', 'FCG', 'PXE', 'IEO', 'ERX', 'DRIP',
  'SCHD', 'VIG', 'DVY', 'VYM', 'HDV', 'SDY', 'NOBL', 'DGRO', 'DGRW', 'FVD',
  'SPHD', 'SPLV', 'USMV', 'EFAV', 'EEMV', 'ACWV', 'XMLV', 'XSLV', 'SMMV',
  'MTUM', 'VLUE', 'QUAL', 'SIZE', 'VFMO', 'VFQY', 'VFMF', 'JMOM', 'QMOM',
  'IEMG', 'VWO', 'SCHE', 'SPEM', 'FNDE', 'DEM', 'EDIV', 'DGS', 'DVYE',
  'EWJ', 'EWG', 'EWU', 'EWC', 'EWA', 'EWZ', 'EWY', 'EWT', 'EWH', 'EWS',
  'FXI', 'MCHI', 'ASHR', 'CNYA', 'KBA', 'GXC', 'KWEB', 'CQQQ', 'PGJ',
  'SOXL', 'SOXS', 'TQQQ', 'SQQQ', 'UPRO', 'SPXU', 'TNA', 'TZA', 'FAS',
  'IGM', 'IXN', 'CIBR', 'HACK', 'BUG', 'BOTZ', 'ROBO', 'AIQ', 'IRBO',
]);

// Fallback: try Yahoo search API to get display name
async function fetchDisplayNameFallback(symbol: string, isDev: boolean): Promise<string | null> {
  try {
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=5&newsCount=0`;
    
    if (isDev) {
      console.log(`[resolveSymbol] Fallback search for display name: ${symbol}`);
    }
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      const quotes = data?.quotes || [];
      
      // Find exact symbol match (case-insensitive)
      const upperSymbol = symbol.toUpperCase();
      const exactMatch = quotes.find((q: any) => 
        q.symbol?.toUpperCase() === upperSymbol
      );
      
      if (exactMatch) {
        const name = exactMatch.longname || exactMatch.shortname || null;
        if (isDev) {
          console.log(`[resolveSymbol] Fallback found name: ${name}`);
        }
        return name;
      }
    }
  } catch (err) {
    if (isDev) {
      console.log(`[resolveSymbol] Fallback search failed:`, err);
    }
  }
  return null;
}

// Resolve symbol and detect asset type
async function resolveSymbol(symbol: string): Promise<{
  canonicalSymbol: string;
  detectedType: 'stock' | 'etf' | 'crypto';
  displayName: string | null;
  confidence: 'high' | 'medium' | 'low';
  sourceUsed: string;
}> {
  const upperSymbol = symbol.toUpperCase().trim();
  const isDev = Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;
  
  if (isDev) {
    console.log(`[resolveSymbol] Resolving: ${upperSymbol}`);
  }
  
  // 1. Check if it's a known crypto
  if (cryptoIdMap[upperSymbol]) {
    // Use built-in name map for crypto display names
    const cryptoName = cryptoNameMap[upperSymbol] || null;
    const nameSource = cryptoName ? 'fallback_map' : 'none';
    
    if (isDev) {
      console.log(`[resolveSymbol] ${upperSymbol} -> crypto (cryptoIdMap), name_source: ${nameSource}, name: ${cryptoName}`);
    }
    return {
      canonicalSymbol: upperSymbol,
      detectedType: 'crypto',
      displayName: cryptoName,
      confidence: 'high',
      sourceUsed: 'cryptoIdMap',
    };
  }
  
  // 2. Check if it's a known ETF - still need to fetch display name
  if (knownETFs.has(upperSymbol)) {
    if (isDev) {
      console.log(`[resolveSymbol] ${upperSymbol} -> etf (knownETFs), fetching display name...`);
    }
    // Try to get display name via search API since known ETFs don't have cached names
    const fallbackName = await fetchDisplayNameFallback(upperSymbol, isDev);
    return {
      canonicalSymbol: upperSymbol,
      detectedType: 'etf',
      displayName: fallbackName,
      confidence: 'high',
      sourceUsed: 'knownETFs',
    };
  }
  
  // 3. Try Yahoo Finance for stocks/ETFs - check quoteType in meta
  if (/^[A-Z]{1,5}$/.test(upperSymbol)) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(upperSymbol)}?interval=1d&range=1d`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        
        if (meta && typeof meta.regularMarketPrice === 'number') {
          const quoteType = (meta.quoteType || '').toUpperCase();
          let displayName = meta.shortName || meta.longName || null;
          
          if (isDev) {
            console.log(`[resolveSymbol] Yahoo quoteType for ${upperSymbol}: ${quoteType}, shortName: ${displayName}`);
          }
          
          // If no display name, try fallback search (common for ETFs/funds)
          if (!displayName && (quoteType === 'ETF' || quoteType === 'MUTUALFUND')) {
            if (isDev) {
              console.log(`[resolveSymbol] No display name from chart, trying fallback search...`);
            }
            displayName = await fetchDisplayNameFallback(upperSymbol, isDev);
          }
          
          // Yahoo returns quoteType: EQUITY for stocks, ETF for ETFs
          if (quoteType === 'ETF') {
            return {
              canonicalSymbol: upperSymbol,
              detectedType: 'etf',
              displayName,
              confidence: 'high',
              sourceUsed: displayName ? 'yahoo_quoteType' : 'yahoo_quoteType_no_name',
            };
          }
          
          if (quoteType === 'EQUITY' || quoteType === 'STOCK') {
            return {
              canonicalSymbol: upperSymbol,
              detectedType: 'stock',
              displayName,
              confidence: 'high',
              sourceUsed: 'yahoo_quoteType',
            };
          }
          
          // Unknown quoteType but valid price - default to stock with medium confidence
          return {
            canonicalSymbol: upperSymbol,
            detectedType: 'stock',
            displayName,
            confidence: 'medium',
            sourceUsed: 'yahoo_fallback',
          };
        }
      }
    } catch (err) {
      if (isDev) {
        console.log(`[resolveSymbol] Yahoo lookup failed for ${upperSymbol}:`, err);
      }
    }
  }
  
  // 4. Fallback - try search API for name, assume stock with low confidence
  const fallbackName = await fetchDisplayNameFallback(upperSymbol, isDev);
  
  if (isDev) {
    console.log(`[resolveSymbol] ${upperSymbol} -> stock (fallback, low confidence), name: ${fallbackName}`);
  }
  
  return {
    canonicalSymbol: upperSymbol,
    detectedType: 'stock',
    displayName: fallbackName,
    confidence: 'low',
    sourceUsed: 'fallback',
  };
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
        // Fetch market cap separately if not available from chart API
        let marketCap: number | undefined = yahooQuote.marketCap;
        if (typeof marketCap !== 'number' || marketCap <= 0) {
          const fetchedMarketCap = await fetchYahooMarketCap(symbol);
          marketCap = fetchedMarketCap ?? undefined;
        }
        
        return {
          symbol: upperSymbol,
          price: yahooQuote.price,
          change: yahooQuote.change,
          changePct: yahooQuote.changePct,
          isDelayed: true,
          quoteStatus: 'available',
          marketCap: marketCap,
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
    
    // Handle symbol resolution request (auto-detect asset type)
    if (body.action === 'resolve') {
      const { symbol } = body;
      if (!symbol || typeof symbol !== 'string') {
        return new Response(
          JSON.stringify({ error: 'symbol is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const result = await resolveSymbol(symbol);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
