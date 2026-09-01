import express, { Request, Response } from 'express';
import cors from 'cors';
import fetch from 'node-fetch'; // Import node-fetch
import dotenv from 'dotenv'; // Import dotenv

dotenv.config(); // Load environment variables from .env file

// --- Constants (mirroring frontend) ---
const API_KEY = process.env.FMP_API_KEY;
const API_BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Define Index Endpoints (MATCH FRONTEND activeIndex state)
const INDEX_ENDPOINTS = {
    'SP500': `${API_BASE_URL}/sp500_constituent?apikey=${API_KEY}`,
    'DOW30': `${API_BASE_URL}/dowjones_constituent?apikey=${API_KEY}`,
    'Nasdaq100': `${API_BASE_URL}/nasdaq_constituent?apikey=${API_KEY}`,
    'Russell2000': `${API_BASE_URL}/russell_2000_constituent?apikey=${API_KEY}`,
};

// --- Type definition (mirroring frontend) ---
// (Consider sharing types between frontend/backend?)
interface StockQuote {
    symbol: string;
    name?: string; 
    marketCap: number;
    changesPercentage: number;
    sector: string;
}

// Helper function for async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Simple In-Memory Cache --- 
interface CacheEntry {
    data: StockQuote[];
    timestamp: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // Cache for 1 hour

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); 
app.use(express.json());

// --- API Routes ---

// Test route (keep for now)
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ message: 'Server is running!' });
});

// Define the async handler function separately
const handleHistoricalData = async (req: Request, res: Response) => {
    const { index: indexName, date: formattedDate } = req.query;

    // --- Input Validation ---
    if (!API_KEY) {
        return res.status(500).json({ error: 'API Key is missing on server.' }); 
    }
    if (typeof indexName !== 'string' || !(indexName in INDEX_ENDPOINTS)) {
        return res.status(400).json({ error: 'Invalid or missing index parameter.' });
    }
    if (typeof formattedDate !== 'string' || !/\d{4}-\d{2}-\d{2}/.test(formattedDate)) {
         return res.status(400).json({ error: 'Invalid or missing date parameter (YYYY-MM-DD).'});
    }

    // --- Cache Check ---
    const cacheKey = `${indexName}-${formattedDate}`;
    const cachedEntry = cache.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS)) {
        console.log(`>>> [Server] Cache hit for ${cacheKey}. Sending cached data.`);
        return res.json(cachedEntry.data);
    }
    console.log(`>>> [Server] Cache miss or expired for ${cacheKey}. Fetching from API...`);
    // --- End Cache Check ---

    const CONSTITUENTS_URL = INDEX_ENDPOINTS[indexName as keyof typeof INDEX_ENDPOINTS];

    console.log(`>>> [Server] Fetching ${indexName} constituents for ${formattedDate}...`);
    let symbols: string[] = [];
    let sectorMap: { [key: string]: string } = {};

    try {
        // --- Fetch Constituents ---
        const constituentsResponse = await fetch(CONSTITUENTS_URL);
        if (!constituentsResponse.ok) throw new Error(`Server failed to fetch ${indexName} list: ${constituentsResponse.status}`);
        const constituentsData = await constituentsResponse.json() as any[];
        if (!Array.isArray(constituentsData)) throw new Error(`Server received invalid data format for ${indexName} constituents.`);
        
        constituentsData.forEach((stock: any) => {
            if (stock.symbol) {
                symbols.push(stock.symbol);
                sectorMap[stock.symbol] = stock.sector || "Other";
            }
        });
        if (symbols.length === 0) throw new Error(`Server found no symbols for ${indexName}.`);
        console.log(`>>> [Server] Fetched ${symbols.length} ${indexName} symbols.`);

        // --- Fetch Historical EOD Data (Batched) ---
        console.log(`>>> [Server] Fetching HISTORICAL EOD for ${formattedDate}...`);
        const BATCH_SIZE = 50;
        let allEodData: any[] = [];

        for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
            const symbolsChunk = symbols.slice(i, i + BATCH_SIZE);
            console.log(`>>> [Server] Fetching EOD batch ${Math.floor(i / BATCH_SIZE) + 1} for ${symbolsChunk.length} symbols...`);
            const EOD_URL = `${API_BASE_URL}/batch-request-end-of-day-prices?date=${formattedDate}&symbols=${symbolsChunk.join(',')}&apikey=${API_KEY}`;

            try {
                const eodResponse = await fetch(EOD_URL);
                if (!eodResponse.ok) {
                    let apiErrorMsg = '';
                    try { 
                        const errorBody = await eodResponse.json() as any;
                        apiErrorMsg = errorBody?.message || `Status ${eodResponse.status}`;
                    } catch (_) { apiErrorMsg = `Status ${eodResponse.status}`; }
                    if (eodResponse.status === 429) {
                         throw new Error(`429 Rate Limit Exceeded - Batch ${Math.floor(i / BATCH_SIZE) + 1}`);
                    }
                    throw new Error(`EOD Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${apiErrorMsg}`);
                }
                
                const eodChunkResponse = await eodResponse.json() as any;

                let eodChunkData: any[] = [];
                if (Array.isArray(eodChunkResponse?.output)) {
                    eodChunkData = eodChunkResponse.output;
                } else if (Array.isArray(eodChunkResponse)) {
                    eodChunkData = eodChunkResponse;
                } else {
                    console.error(`[Server] Invalid EOD Chunk Data received (Batch ${Math.floor(i / BATCH_SIZE) + 1}):`, eodChunkResponse);
                    throw new Error(`Invalid data format in EOD batch ${Math.floor(i / BATCH_SIZE) + 1}`);
                }
                console.log(`>>> [Server] Received ${eodChunkData.length} EOD results for batch ${Math.floor(i / BATCH_SIZE) + 1}.`);
                allEodData = allEodData.concat(eodChunkData);

            } catch (batchError) {
                if (batchError instanceof Error && batchError.message.startsWith('429 Rate Limit')) {
                    console.error(`[Server] Rate limit hit: ${batchError.message}`);
                    return res.status(429).json({ error: `API rate limit exceeded during EOD fetch. Try again later.` });
                }
                console.error(`[Server] Error fetching EOD batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
                throw batchError; 
            }

            // *** INCREASE DELAY AGAIN ***
            if (i + BATCH_SIZE < symbols.length) {
                console.log(`>>> [Server] Waiting 5 seconds before next EOD batch...`); // Increased delay again
                await delay(5000); // Increased delay back to 5 seconds
            }
        }
        console.log(`>>> [Server] Total EOD results received: ${allEodData.length}. Combining...`);

        // --- Combine EOD data with sector (same logic as frontend) ---
        const combinedHistDataWithNulls = allEodData.map((eod: any): StockQuote | null => {
            if (!eod.symbol) return null;
            const symbol = eod.symbol;
            const sector = sectorMap[symbol];
            const sizingValue = eod.volume ?? eod.close ?? 0;
            if (!sector) return null;
            return {
                symbol: symbol,
                name: undefined, // EOD doesn't include name
                marketCap: sizingValue,
                changesPercentage: 0, // EOD doesn't include change %
                sector: sector,
            };
        });
        let combinedData = combinedHistDataWithNulls.filter((stock): stock is StockQuote => stock !== null);

        // --- Final Processing (same logic as frontend) ---
         combinedData = combinedData.filter(stock => stock.symbol !== 'GOOG'); // Exclude GOOG
        if (combinedData.length === 0) throw new Error(`Server found no valid stocks remaining for ${indexName} on ${formattedDate}.`);
        console.log(`>>> [Server] Data fetch successful for ${indexName} on ${formattedDate}. Storing in cache and sending ${combinedData.length} stocks.`);

        // --- Store in Cache --- 
        cache.set(cacheKey, { data: combinedData, timestamp: Date.now() });
        // --- End Store in Cache ---

        // --- Send Success Response ---
        return res.json(combinedData); 

    } catch (err: any) {
        console.error(`>>> [Server] FetchData Error (${indexName}, ${formattedDate}):`, err);
        return res.status(500).json({ error: err.message || `An internal server error occurred while fetching historical data for ${indexName}.` }); 
    }
};

// Use the handler function in the route definition
app.get('/api/historical-data', handleHistoricalData);

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
}); 