import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from 'react';
import * as d3 from 'd3'; // We'll likely need D3
// Import DatePicker and its CSS
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- Define Constants OUTSIDE Component Scope ---

// Mapping for ETF Categories (Based on Finviz)
// TODO: Expand and refine this map
const etfCategoryMap: { [symbol: string]: string[] } = {
  // US Index
  'SPY': ['US Index', 'Large Cap Blend'], 'QQQ': ['US Index', 'Large Cap Growth'], 'DIA': ['US Index', 'Large Cap Value'],
  'IVV': ['US Index', 'Large Cap Blend'], 'VOO': ['US Index', 'Large Cap Blend'], 'RSP': ['US Index', 'Equal Weight'],
  'VTI': ['US Index', 'Total Market'], 'IWB': ['US Index', 'Large Cap Blend'], 'SCHB': ['US Index', 'Total Market'],
  // US Sector
  'XLK': ['US Sector', 'Technology'], 'XLY': ['US Sector', 'Consumer Cyclical'], 'XLP': ['US Sector', 'Consumer Defensive'],
  'XLE': ['US Sector', 'Energy'], 'XLF': ['US Sector', 'Financials'], 'XLV': ['US Sector', 'Healthcare'],
  'XLI': ['US Sector', 'Industrials'], 'XLB': ['US Sector', 'Basic Materials'], 'XLU': ['US Sector', 'Utilities'],
  'IYR': ['US Sector', 'Real Estate'], 'SOXX': ['US Sector', 'Semiconductors'], 'VGT': ['US Sector', 'Technology'],
  'XRT': ['US Sector', 'Retail'], 'XBI': ['US Sector', 'Biotechnology'], 'XOP': ['US Sector', 'Oil & Gas E&P'],
  'KRE': ['US Sector', 'Regional Banks'], 
  // US Size/Style
  'IWF': ['US Style', 'Large Cap Growth'], 'VUG': ['US Style', 'Large Cap Growth'], 'VTV': ['US Style', 'Large Cap Value'],
  'IWD': ['US Style', 'Large Cap Value'], 'MDY': ['US Style', 'Mid Cap Blend'], 'VO': ['US Style', 'Mid Cap Blend'],
  'IJH': ['US Style', 'Mid Cap Blend'], 'IJR': ['US Style', 'Small Cap Blend'], 'VB': ['US Style', 'Small Cap Blend'],
  'IWM': ['US Style', 'Small Cap Blend'],
  // Volatility / Leverage / Inverse - Reverted to top-level
  'VXX': ['Volatility'], 
  'UVXY': ['Leverage', 'Volatility'], 
  'SQQQ': ['Inverse', 'Nasdaq 100'], 
  'SPXS': ['Inverse', 'S&P 500'],
  'TQQQ': ['Leverage', 'Nasdaq 100'], 
  'SPXL': ['Leverage', 'S&P 500'], 
  'SOXS': ['Inverse', 'Semiconductors'],
  'TNA': ['Leverage', 'Small Cap'], 
  'TZA': ['Inverse', 'Small Cap'],
  // International
  'EFA': ['International', 'Developed Markets'], 'VEA': ['International', 'Developed Markets'], 'IEFA': ['International', 'Developed Markets'],
  'EEM': ['International', 'Emerging Markets'], 'VWO': ['International', 'Emerging Markets'], 'IEMG': ['International', 'Emerging Markets'],
  'EWJ': ['International', 'Japan'], 'FXI': ['International', 'China'], 'EZU': ['International', 'Europe'], 'VGK': ['International', 'Europe'],
  // Commodity / Currency
  'GLD': ['Commodity', 'Gold'], 'IAU': ['Commodity', 'Gold'], 'SLV': ['Commodity', 'Silver'],
  'USO': ['Commodity', 'Oil'], 'UNG': ['Commodity', 'Natural Gas'], 'UUP': ['Currency', 'USD Bullish'], 'FXE': ['Currency', 'Euro Bullish'],
  // Fixed Income
  'AGG': ['Fixed Income', 'Broad Market'], 'BND': ['Fixed Income', 'Broad Market'], 'TLT': ['Fixed Income', 'Long Treasury'],
  'SHV': ['Fixed Income', 'Short Treasury'], 'IEF': ['Fixed Income', 'Intermediate Treasury'], 'HYG': ['Fixed Income', 'High Yield Corp'],
  'LQD': ['Fixed Income', 'Investment Grade Corp'], 'VCIT': ['Fixed Income', 'Intermediate Corp'], 'VCSH': ['Fixed Income', 'Short Corp'],
  'MUB': ['Fixed Income', 'Municipal']
};

// --- World Map Data ---
const worldSymbols = [
  // North America
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', // US
  'RY', 'TD', 'SHOP', 'ENB', 'CNQ', // Canada
  'AMX', // Mexico
  // Europe
  'ASML', 'LVMUY', 'NVO', 'SAP', 'SIEGY', 'HSBC', 'SHEL', // Various EU
  'AZN', // UK
  'NSRGY', // Nestle (Switzerland) - US ADR
  // Asia-Pacific
  'TSM', 'BABA', 
  'TM', // Toyota - US ADR
  'SONY', 
  'SSNLF', // Samsung Electronics (OTC)
  'BHP', // Australia
  'RELIANCE.NS', // India (No common US ADR)
  // South America
  'PBR', 'VALE', // Brazil
  // Add more...
];

const worldCountryMap: { [symbol: string]: string[] } = {
  // North America
  'AAPL': ['North America', 'USA', 'USD'], 'MSFT': ['North America', 'USA', 'USD'], 'GOOGL': ['North America', 'USA', 'USD'], 'AMZN': ['North America', 'USA', 'USD'], 'NVDA': ['North America', 'USA', 'USD'],
  'RY': ['North America', 'Canada', 'CAD'], 'TD': ['North America', 'Canada', 'CAD'], 'SHOP': ['North America', 'Canada', 'CAD'], 'ENB': ['North America', 'Canada', 'CAD'], 'CNQ': ['North America', 'Canada', 'CAD'],
  'AMX': ['North America', 'Mexico', 'MXN'],
  // Europe
  'ASML': ['Europe', 'Netherlands', 'EUR'], 'LVMUY': ['Europe', 'France', 'EUR'], 'NVO': ['Europe', 'Denmark', 'DKK'], 'SAP': ['Europe', 'Germany', 'EUR'], 'SIEGY': ['Europe', 'Germany', 'EUR'], 'HSBC': ['Europe', 'UK', 'GBP'], 'SHEL': ['Europe', 'UK', 'GBP'],
  'AZN': ['Europe', 'UK', 'GBP'],
  'NSRGY': ['Europe', 'Switzerland', 'CHF'], // Update key
  // Asia-Pacific
  'TSM': ['Asia-Pacific', 'Taiwan', 'TWD'], 'BABA': ['Asia-Pacific', 'China', 'CNY'], 
  'TM': ['Asia-Pacific', 'Japan', 'JPY'], // Update key
  'SONY': ['Asia-Pacific', 'Japan', 'JPY'], 
  'SSNLF': ['Asia-Pacific', 'South Korea', 'KRW'],
  'BHP': ['Asia-Pacific', 'Australia', 'AUD'],
  'RELIANCE.NS': ['Asia-Pacific', 'India', 'INR'], // Keep key
  // South America
  'PBR': ['South America', 'Brazil', 'BRL'], 'VALE': ['South America', 'Brazil', 'BRL'],
};

// --- End World Map Data ---

// --- End Constants OUTSIDE Component Scope ---

// Define TypeScript interfaces for our data
interface StockQuote {
  symbol: string;
  name?: string;
  marketCap: number;
  changesPercentage: number;
  sector: string;
  currency?: string;
  // Add other relevant properties if needed
}

// Type for the data structure *after* transformData
interface TreeNodeData extends Partial<StockQuote> {
  name: string;
  children?: TreeNodeData[];
  symbol?: string;
  value?: number; 
}

// Define props if the component needs any input from its parent
interface StockHeatmapProps {
  // Example: initialIndex?: 'sp500' | 'dow' | 'ndx' | 'rut';
}

// Type alias for leaf nodes in the hierarchy (contains StockQuote data)
type LeafNode = d3.HierarchyRectangularNode<TreeNodeData & StockQuote>;

// Helper function for async delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Custom Input Button Component ---
interface DateButtonProps {
  value?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
const DateButton = forwardRef<HTMLButtonElement, DateButtonProps>(({ value, onClick }, ref) => (
  <button className="date-button" onClick={onClick} ref={ref}>
    {value || 'D'} {/* Display selected date or default 'D' */}
  </button>
));
DateButton.displayName = 'DateButton'; // Add display name for DevTools
// --- End Custom Input Button Component ---

const StockHeatmap: React.FC<StockHeatmapProps> = (props) => {
  // --- State, Refs (REMOVE tooltipRef), Constants, Helpers ---
  const [stockData, setStockData] = useState<d3.HierarchyNode<TreeNodeData> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<string>('SP500');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // <-- Add state for selected date (null = live)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false); // <-- Add state for date picker

  // --- ADD: Formatted Date Memo --- 
  const formattedDate = useMemo<string | null>(() => {
      if (!selectedDate) return null;
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
  }, [selectedDate]);
  // --- END: Formatted Date Memo ---

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hidePopupTimerRef = useRef<number | null>(null); // <-- Use number type for timer ID

  // --- Constants (Ported from StockHeatmap.js, adjust as needed) ---
  // Load API key securely from environment variables using Vite's convention
  const API_KEY = import.meta.env.VITE_FMP_API_KEY;
  
  if (!API_KEY) {
    console.error("Error: VITE_FMP_API_KEY is not defined in your .env file.");
    // Potentially set an error state here or return a message component
  }
  
  const API_BASE_URL = "https://financialmodelingprep.com/api/v3";
  const indexTypes = useMemo(() => ['SP500', 'DOW30', 'Nasdaq100', 'Russell2000'], []);
  const indexDisplayNames = useMemo(() => ({ // Map short names to display names
      SP500: 'S&P 500',
      DOW30: 'DOW 30',
      Nasdaq100: 'Nasdaq 100',
      Russell2000: 'Russell 2000'
  }), []);
  const INDEX_ENDPOINTS = {
      SP500: `${API_BASE_URL}/sp500_constituent?apikey=${API_KEY}`,
      DOW: `${API_BASE_URL}/dowjones_constituent?apikey=${API_KEY}`,
      NDX: `${API_BASE_URL}/nasdaq_constituent?apikey=${API_KEY}`,
  };
  const INDEX_DESCRIPTIONS = {
      SP500: "Standard and Poor's 500 U.S. index stocks categorized by sectors and industries. Size represents market cap.",
      DOW: "Dow Jones Industrial Average (30 large cap stocks) categorized by sectors. Size represents market cap.",
      NDX: "Nasdaq 100 index stocks (largest non-financial companies) categorized by sectors. Size represents market cap.",
      ETF: "Overview of major Exchange Traded Funds (ETFs) categorized by asset class and strategy. Size represents market cap.",
      WORLD: "Overview of major global stocks categorized by region and country. Size represents market cap."
  };
  const MIN_RECT_HEIGHT_FOR_CHANGE = 25;
  // Define treemap padding constants for reuse
  const PADDING_TOP = 25;
  const PADDING_RIGHT = 2;
  const PADDING_BOTTOM = 2;
  const PADDING_LEFT = 2;
  const PADDING_INNER = 2;

  // Define tab configurations using uppercase IDs
  const indexTabs = [
      { id: 'SP500', name: 'S&P 500' },
      { id: 'DOW', name: 'DOW 30' },
      { id: 'NDX', name: 'Nasdaq 100' },
      { id: 'ETF', name: 'ETF Map' },
      { id: 'WORLD', name: 'World Map' }
  ];

  const MIN_RECT_WIDTH_FOR_TEXT = 25;

  // --- Helper Functions (Define BEFORE useEffect that uses them) ---

  // Color calculation logic (Adjusted for very-high vibrance)
  const calculateColor = useCallback((percentageChange: number): string => {
    const scale = d3.scaleLinear<string>()
        .domain([-3, -2, -1, 0, 1, 2, 3])
        // Very high vibrance range, almost original
        .range(["#D01846", "#AF1F3E", "#8A2635", "#3A3A3A", "#307A3F", "#2A9E4A", "#1AC656"])
        .clamp(true);
    return scale(percentageChange);
  }, []);

  // Calculate STROKE color: Specific hex for pos/neg, LIGHTER dynamic for near-zero/zero
  const calculateStrokeColor = useCallback((percentageChange: number): string => {
    // Calculate the base fill color first
    const baseColor = calculateColor(percentageChange);
    // Return a slightly lighter version for the stroke effect
    const lighterColor = d3.color(baseColor)?.brighter(0.8);
    return lighterColor ? lighterColor.toString() : baseColor; // Fallback to base color if lightening fails
  }, [calculateColor]);

  // Format percentage change
  const formatPercentage = useCallback((value: number | undefined): string => {
      if (value === undefined) return "N/A";
      if (value === 0) return "0.0%";
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }, []);

  // Helper for styling percentage text in tooltips/popups - WRAP IN useCallback
  const getPercentageStyle = useCallback((percentage: number): { color: string; textShadow: string; fontWeight: string } => {
    if (percentage > 0) {
        return { 
            color: '#39FF14', 
            textShadow: 'none',
            fontWeight: 'bold' 
        };
    } else if (percentage < 0) {
        return {
            color: '#FF0000', 
            textShadow: 'none', 
            fontWeight: 'bold'
        };
    } else {
        return {
            color: '#cccccc', 
            textShadow: 'none', 
            fontWeight: 'bold'
        };
    }
  }, []); // Empty dependency array as it has no external dependencies

  // transformData function - Apply sizing conditionally
  const transformData = (flatData: StockQuote[], currentActiveIndex: string): d3.HierarchyNode<TreeNodeData> | null => {
    if (!flatData || flatData.length === 0) {
        console.error("transformData received empty or invalid data.");
        return null;
    }

    // Create a nested structure using d3.group and splitting sector paths
    const groupedData = d3.group(flatData, d => d.sector); // Initial group by full path

    const buildHierarchy = (map: Map<string, any>, pathPrefix: string[] = []): TreeNodeData[] => {
      return Array.from(map, ([key, value]) => {
          const currentPath = [...pathPrefix, key];
          if (value instanceof Map) { // If it's a nested map, recurse
            return {
              name: key,
              children: buildHierarchy(value, currentPath)
            };
          } else { // If it's an array of stocks (leaf node group)
             // Check if the group key itself needs splitting (e.g., "US Sector > Technology")
            const keyParts = key.split(' > ');
            const nodeName = keyParts[keyParts.length - 1]; // Use the last part as node name
            
            // If the values are stocks, create child nodes for each stock
            if (Array.isArray(value) && value.length > 0 && value[0].symbol) {
                return {
                    name: nodeName,
                    children: value.map(stock => ({
                        name: stock.symbol, // Leaf node name is the symbol
                        ...stock // Spread the rest of the stock data
                    }))
                };
            } else {
                 // Should not happen with current structure, but handle gracefully
                 console.warn("Unexpected data structure in buildHierarchy for key:", key);
                 return { name: nodeName, children: [] };
            }
          }
      });
    };
    
    // Process the initial grouped map to handle path splitting
    const processedMap = new Map<string, any>();
    for (const [fullPath, stocks] of groupedData) {
        const parts = fullPath.split(' > ');
        let currentLevel = processedMap;
        parts.forEach((part, index) => {
            if (index === parts.length - 1) { // Last part, assign stocks
                 if (!currentLevel.has(part)) {
                     currentLevel.set(part, []);
                 }
                 // Ensure we push stocks to the correct array
                 const stockArray = currentLevel.get(part);
                 if (Array.isArray(stockArray)) {
                     stockArray.push(...stocks);
                 } else {
                     // This case handles potential pre-existing Map structures if paths overlap
                     // For simplicity, we assume distinct leaf paths for now
                     console.warn(`Overwriting structure at ${parts.slice(0, index + 1).join(' > ')}?`);
                     currentLevel.set(part, stocks);
                 }

            } else { // Intermediate part, ensure map exists
                if (!currentLevel.has(part)) {
                    currentLevel.set(part, new Map<string, any>());
                }
                let nextLevel = currentLevel.get(part);
                // Ensure it's actually a Map before proceeding
                 if (!(nextLevel instanceof Map)) {
                     console.warn(`Structure conflict at ${parts.slice(0, index + 1).join(' > ')}. Resetting.`);
                     nextLevel = new Map<string, any>();
                     currentLevel.set(part, nextLevel);
                 }
                currentLevel = nextLevel;
            }
        });
    }

    // Build the final hierarchical structure for D3
    const rootHierarchy = {
        name: "root",
        children: buildHierarchy(processedMap)
    };

    // Apply sizing based on the active index
    const sizeMetricAccessor = (d: TreeNodeData) => {
      const cap = d.marketCap ?? 0;
      if (currentActiveIndex === 'WORLD') {
        // WORLD MAP: Use square root scaling, ensure positive cap, fallback to sqrt(1e6)
        return cap > 0 ? Math.sqrt(cap) : Math.sqrt(1e6); 
      } else {
        // OTHER MAPS: Use linear market cap, ensure positive cap, fallback to 1e6
        return cap > 0 ? cap : 1e6; 
      }
    };

    const hierarchy = d3.hierarchy<TreeNodeData>(rootHierarchy)
        .sum(sizeMetricAccessor) // Use conditional size metric
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    console.log(`>>> transformData completed (Using ${currentActiveIndex === 'WORLD' ? 'sqrt(MarketCap)' : 'MarketCap'}). Root node:`, hierarchy);
    return hierarchy;
  };

  // --- Calculated Values ---

  // --- Effects ---

  // Get initial container dimensions and set up resize listener
  useEffect(() => {
    const updateDimensions = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
        }, 200);
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Fetch data when activeIndex changes
  useEffect(() => {
    if (!API_KEY) {
        setError("API Key is missing.");
        setIsLoading(false);
        return;
    }
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setStockData(null);

      // --- HANDLE ETF CASE --- 
      if (activeIndex === 'ETF') {
        console.log(">>> Fetching ETF data...");
        // Placeholder list based roughly on Finviz categories
        // TODO: Refine this list and categorization method
        const etfSymbols = [
            // US Index
            'SPY', 'QQQ', 'DIA', 'IVV', 'VOO', 'RSP', 'VTI', 'IWB', 'SCHB',
            // US Sector
            'XLK', 'XLY', 'XLP', 'XLE', 'XLF', 'XLV', 'XLI', 'XLB', 'XLU', 'IYR', 
            'SOXX', 'VGT', 'XRT', 'XBI', 'XOP', 'KRE', 
            // US Size/Style
            'IWF', 'VUG', 'VTV', 'IWD', 'MDY', 'VO', 'IJH', 'IJR', 'VB', 'IWM',
            // Volatility / Leverage / Inverse
            'VXX', 'UVXY', 'SQQQ', 'SPXS', 'TQQQ', 'SPXL', 'SOXS', 'TNA', 'TZA',
            // International
            'EFA', 'VEA', 'IEFA', 'EEM', 'VWO', 'IEMG', 'EWJ', 'FXI', 'EZU', 'VGK',
            // Commodity / Currency
            'GLD', 'IAU', 'SLV', 'USO', 'UNG', 'UUP', 'FXE',
            // Fixed Income
            'AGG', 'BND', 'TLT', 'SHV', 'IEF', 'HYG', 'LQD', 'VCIT', 'VCSH', 'MUB'
            // Add more as needed...
        ];

        const QUOTE_URL = `${API_BASE_URL}/quote/${etfSymbols.join(',')}?apikey=${API_KEY}`;
        
        try {
            const quoteResponse = await fetch(QUOTE_URL);
            if (!quoteResponse.ok) throw new Error(`Failed to fetch ETF quotes: ${quoteResponse.status}`);
            const quoteData = await quoteResponse.json();
            if (!Array.isArray(quoteData)) throw new Error(`Invalid data format for ETF quotes.`);
            console.log(`>>> Received ${quoteData.length} ETF quotes. Combining...`);

            // Use the etfCategoryMap 
            const etfDataWithCategories: StockQuote[] = quoteData.map((quote: any) => {
                // Check marketCap for ETFs too now
                if (!quote.symbol || typeof quote.marketCap !== 'number') return null;
                
                const categories = etfCategoryMap[quote.symbol];
                const sectorPath = categories ? categories.join(' > ') : 'Other'; 

                return {
                    symbol: quote.symbol,
                    marketCap: quote.marketCap > 0 ? quote.marketCap : 1e6, // Use marketCap, ensure > 0
                    changesPercentage: typeof quote.changesPercentage === 'number' ? quote.changesPercentage : 0,
                    sector: sectorPath
                };
            }).filter((etf): etf is StockQuote => etf !== null); // Revert type guard

            if (etfDataWithCategories.length === 0) throw new Error('No valid ETF data remaining.');
            console.log(`>>> Using ${etfDataWithCategories.length} ETFs. Transforming...`);

            const hierarchicalData = transformData(etfDataWithCategories, activeIndex);
            if (!hierarchicalData) throw new Error('Failed to transform ETF data.');

            console.log(`>>> ETF Data fetch successful.`);
            setStockData(hierarchicalData);
            setError(null);

        } catch (err: any) {
            console.error(`>>> FetchData Error (ETF):`, err);
            setError(err.message || 'An unknown error occurred fetching ETF data.');
            setStockData(null);
        } finally {
            setIsLoading(false);
        }
        return; // Exit useEffect after handling ETF case
      }
      // --- END ETF CASE ---

      // --- HANDLE WORLD MAP CASE --- 
      else if (activeIndex === 'WORLD') {
        console.log(">>> Fetching World Map data...");
        
        // --- Fetch FX Rates --- 
        let fxRates: { [currency: string]: number } = { 'USD': 1.0 }; // Base case
        const currenciesNeeded = new Set<string>();
        worldSymbols.forEach(symbol => {
            const currency = worldCountryMap[symbol]?.[2];
            if (currency && currency !== 'USD') {
                currenciesNeeded.add(currency);
            }
        });

        if (currenciesNeeded.size > 0) {
            const fxPairs = Array.from(currenciesNeeded).map(curr => `${curr}USD`);
            const FX_URL = `${API_BASE_URL}/fx/${fxPairs.join(',')}?apikey=${API_KEY}`;
            console.log(`>>> Fetching FX rates for: ${fxPairs.join(', ')}`);
            try {
                 const fxResponse = await fetch(FX_URL);
                 if (!fxResponse.ok) throw new Error(`Failed to fetch FX rates: ${fxResponse.status}`);
                 const fxData = await fxResponse.json();
                 if (!Array.isArray(fxData)) throw new Error ('Invalid FX data format');
                 
                 fxData.forEach((pair: any) => {
                     if (pair.ticker && typeof pair.bid === 'number' && pair.bid > 0) {
                         const currency = pair.ticker.substring(0, 3); 
                         // CORRECT: Store the RECIPROCAL to get LocalCurrency/USD
                         fxRates[currency] = 1 / pair.bid; 
                     }
                 });
                 console.log(">>> FX Rates (Local Currency per USD - Calculated):", fxRates);
            } catch (fxErr: any) {
                 console.error(">>> Failed to fetch or process FX rates:", fxErr);
                 // Proceed without conversion, results will be skewed
                 setError('Warning: Failed to get FX rates. Market caps not converted.'); 
            }
        }
        // --- End Fetch FX Rates ---

        const QUOTE_URL = `${API_BASE_URL}/quote/${worldSymbols.join(',')}?apikey=${API_KEY}`;
        
        try {
            const quoteResponse = await fetch(QUOTE_URL);
            if (!quoteResponse.ok) throw new Error(`Failed to fetch World quotes: ${quoteResponse.status}`);
            const quoteData = await quoteResponse.json();
            if (!Array.isArray(quoteData)) throw new Error(`Invalid data format for World quotes.`);
            console.log(`>>> Received ${quoteData.length} World quotes. Raw Data:`, quoteData); // LOG RAW QUOTES

            // Log BABA quote data for debugging
            const babaQuote = quoteData.find((q: any) => q.symbol === 'BABA');
            console.log('>>> BABA Quote Data:', babaQuote);
            console.log('>>> CNY FX Rate Used:', fxRates['CNY']);

            // Use worldCountryMap and FX rates
            const worldDataMapped: (StockQuote | null)[] = quoteData.map((quote: any): StockQuote | null => { 
                if (!quote.symbol || typeof quote.marketCap !== 'number' || quote.marketCap <= 0) return null;
                
                const regionCountryInfo = worldCountryMap[quote.symbol];
                if (!regionCountryInfo) return null; 

                const region = regionCountryInfo[0];
                const country = regionCountryInfo[1];
                const currency = regionCountryInfo[2] || 'USD'; 
                const sectorPath = `${region} > ${country}`;
                
                const originalMarketCap = quote.marketCap;
                let marketCapInUSD = originalMarketCap;
                const rate = fxRates[currency]; // Get rate for logging

                // ENSURE conversion uses division
                if (currency !== 'USD' && rate) {
                    marketCapInUSD = originalMarketCap / rate;
                }
                if (!marketCapInUSD || marketCapInUSD <= 0) {
                     marketCapInUSD = 1e6; // Use a fallback SMALLER than most real caps
                }

                // LOG CONVERSION DETAILS
                if (currency !== 'USD') {
                    console.log(`Converting ${quote.symbol} (${currency}): Orig Cap=${originalMarketCap.toExponential(2)}, Rate=${rate?.toFixed(4)}, USD Cap=${marketCapInUSD.toExponential(2)}`);
                }

                const stockQuote: StockQuote = {
                    symbol: quote.symbol,
                    marketCap: marketCapInUSD, 
                    changesPercentage: typeof quote.changesPercentage === 'number' ? quote.changesPercentage : 0,
                    sector: sectorPath, 
                    currency: currency 
                };
                return stockQuote;
            });
            
            // Filter out nulls - Type predicate matches StockQuote
            const worldDataWithCountries: StockQuote[] = worldDataMapped.filter((stock): stock is StockQuote => stock !== null); 
            console.log(`>>> Mapped & Filtered World Data (${worldDataWithCountries.length} stocks):`, worldDataWithCountries); // LOG FILTERED DATA

            if (worldDataWithCountries.length === 0) throw new Error('No valid World data remaining.');
            console.log(`>>> Using ${worldDataWithCountries.length} World stocks. Transforming...`);

            const hierarchicalData = transformData(worldDataWithCountries, activeIndex);
            if (!hierarchicalData) throw new Error('Failed to transform World data.');

            console.log(`>>> World Map Data fetch successful.`);
            setStockData(hierarchicalData);
            setError(null);

        } catch (err: any) {
            console.error(`>>> FetchData Error (World):`, err);
            setError(err.message || 'An unknown error occurred fetching World data.');
            setStockData(null);
        } finally {
            setIsLoading(false);
        }
        return; // Exit useEffect after handling WORLD case
      }
       // --- END WORLD MAP CASE ---

      // --- Original Index Constituent fetching logic (SP500, DOW, NDX) --- 
      else {
        const CONSTITUENTS_URL = INDEX_ENDPOINTS[activeIndex as keyof typeof INDEX_ENDPOINTS]; 
        const indexName = activeIndex;

        if (!CONSTITUENTS_URL) {
            setError(`Endpoint not defined for index type "${activeIndex}".`);
          setIsLoading(false);
          return;
      }

        console.log(`>>> Fetching ${indexName} constituents...`);
        let symbols: string[] = [];
        // Revert to just storing sector
        let sectorMap: { [key: string]: string } = {}; 

        try {
          const constituentsResponse = await fetch(CONSTITUENTS_URL);
          if (!constituentsResponse.ok) throw new Error(`Failed to fetch ${indexName} list: ${constituentsResponse.status}`);
          const constituentsData = await constituentsResponse.json();
          if (!Array.isArray(constituentsData)) throw new Error(`Invalid data format for ${indexName} constituents.`);
          
          // Process constituents to get symbols and sector
          constituentsData.forEach((stock: any) => {
              if (stock.symbol) { 
                  symbols.push(stock.symbol); 
                  sectorMap[stock.symbol] = stock.sector || "Other";
              }
          });
          if (symbols.length === 0) throw new Error(`No symbols found for ${indexName}.`);
          console.log(`>>> Fetched ${symbols.length} ${indexName} symbols. Fetching quotes...`);

          const QUOTE_URL = `${API_BASE_URL}/quote/${symbols.join(',')}?apikey=${API_KEY}`;
          const quoteResponse = await fetch(QUOTE_URL);
          if (!quoteResponse.ok) throw new Error(`Failed to fetch ${indexName} quotes: ${quoteResponse.status}`);
          const quoteData = await quoteResponse.json();
          if (!Array.isArray(quoteData)) throw new Error(`Invalid data format for ${indexName} quotes.`);
          console.log(`>>> Received ${quoteData.length} ${indexName} quotes. Combining...`);

          // Combine quote data with sector info
          const combinedDataWithNulls = quoteData.map((quote: any) => {
              if (!quote.symbol || typeof quote.marketCap !== 'number') return null;
              const sector = sectorMap[quote.symbol];
              if (!sector) return null; 
              // Construct object matching StockQuote more closely
              const stockQuoteItem: StockQuote = {
                  symbol: quote.symbol as string, 
                  name: quote.name as string | undefined,
                  marketCap: quote.marketCap as number,
                  changesPercentage: typeof quote.changesPercentage === 'number' ? quote.changesPercentage : 0,
                  sector: sector, // Use sector from map
              };
              return stockQuoteItem;
          });
          
          // Filter out nulls with correct type predicate
          let combinedData: StockQuote[] = combinedDataWithNulls.filter((stock): stock is StockQuote => stock !== null);
          
          combinedData = combinedData.filter(stock => stock.symbol !== 'GOOG'); // Keep GOOG filter
          if (combinedData.length === 0) throw new Error(`No valid stocks remaining for ${indexName}.`);
          console.log(`>>> Using ${combinedData.length} ${indexName} stocks. Transforming...`);

          const hierarchicalData = transformData(combinedData, activeIndex);
          if (!hierarchicalData) throw new Error(`Failed to transform ${indexName} data.`);
          console.log(`>>> Data fetch successful for ${indexName}.`);
          setStockData(hierarchicalData); setError(null);
      } catch (err: any) {
            console.error(`>>> FetchData Error (${indexName}):`, err);
            setError(err.message || `An unknown error occurred (${indexName}).`); setStockData(null);
        } finally { setIsLoading(false); }
      }
    };
    fetchData();
  }, [activeIndex, API_KEY]); // Keep dependencies minimal

  // --- Handler Functions for Sector Hover (Defined BEFORE useEffect) --- 
  const sectorMouseoverHandler = useCallback((event: MouseEvent, d: d3.HierarchyRectangularNode<TreeNodeData>) => {
      // Clear any pending hide timer immediately on mouse enter
      if (hidePopupTimerRef.current) {
          clearTimeout(hidePopupTimerRef.current);
          hidePopupTimerRef.current = null;
      }

      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      const sectorPopup = d3.select<HTMLDivElement, unknown>("#sector-popup");
      const highlightColor = "#541d97"; 
      const frameClass = "sector-highlight-frame";

      // Remove any existing frames first
      svg.selectAll(`.${frameClass}`).remove();
      
      // --- Add Highlight Frame using SVG Path (Rounded Donut Shape - REVERTING AGAIN) --- 
      const x0 = d.x0 ?? 0;
      const y0 = d.y0 ?? 0;
      const x1 = d.x1 ?? 0;
      const y1 = d.y1 ?? 0;
      const cornerRadius = 4; 
      
      // Inner bounds based on padding constants
      const ix0 = x0 + PADDING_LEFT;
      const iy0 = y0 + PADDING_TOP; 
      const ix1 = x1 - PADDING_RIGHT;
      const iy1 = y1 - PADDING_BOTTOM;

      // Calculate adjusted inner top coordinate
      const adjusted_iy0 = iy0 - 10; // Raise the inner cutout significantly (was -3)

      // Ensure radius isn't too large for the OUTER box
      const effectiveRadius = Math.max(0, Math.min(cornerRadius, (x1 - x0) / 2, (y1 - y0) / 2)); 
      
      // Construct the path string 'd' (Outer rounded, Inner sharp)
      const pathData = `
        M ${x0 + effectiveRadius},${y0} 
        L ${x1 - effectiveRadius},${y0} 
        A ${effectiveRadius},${effectiveRadius} 0 0 1 ${x1},${y0 + effectiveRadius} 
        L ${x1},${y1 - effectiveRadius} 
        A ${effectiveRadius},${effectiveRadius} 0 0 1 ${x1 - effectiveRadius},${y1} 
        L ${x0 + effectiveRadius},${y1} 
        A ${effectiveRadius},${effectiveRadius} 0 0 1 ${x0},${y1 - effectiveRadius} 
        L ${x0},${y0 + effectiveRadius} 
        A ${effectiveRadius},${effectiveRadius} 0 0 1 ${x0 + effectiveRadius},${y0} 
        Z 
        M ${ix0},${adjusted_iy0} L ${ix1},${adjusted_iy0} L ${ix1},${iy1} L ${ix0},${iy1} Z
      `; // Use adjusted_iy0 for the inner path's top

      // Insert the path element BEFORE the first sector label
      svg.insert("path", ".sector-label") 
         .attr("class", frameClass)
         .attr("d", pathData)
         .attr("fill", highlightColor)
         .attr("fill-rule", "evenodd") // Create the donut hole
         .style("pointer-events", "none");
      // --- End Highlight Frame ---

      // Prepare Popup Content
      const stocks = d.leaves() as LeafNode[]; 
      let listHtml = `<h3 style="margin: 0 0 5px 0; padding-bottom: 3px; border-bottom: 1px solid #555;">${d.data.name}</h3><ul style="margin: 0; padding-left: 15px; list-style: none; max-height: 150px; overflow-y: auto;">`;
      stocks.sort((a, b) => (b.data.marketCap ?? 0) - (a.data.marketCap ?? 0))
            .forEach(stock => {
                const percentage = stock.data.changesPercentage ?? 0;
                const styleProps = getPercentageStyle(percentage);
                const companyName = stock.data.name ? ` (${stock.data.name})` : ''; // Get company name if available
                // Add class="sector-popup-item" and border/padding styles
                // Conditionally display % change or note for historical
                const changeHtml = selectedDate === null 
                    ? `<span style="color:${styleProps.color}; font-weight:${styleProps.fontWeight}; text-shadow:${styleProps.textShadow};">${formatPercentage(percentage)}</span>`
                    : `<span style="color:#aaaaaa; font-size: 0.8em;">(EOD)</span>`; // Indicate End-of-Day view
                listHtml += `<li class="sector-popup-item" style="margin-bottom: 3px; padding-bottom: 3px; border-bottom: 1px solid #444; font-size: 0.9em;"><strong>${stock.data.symbol}${companyName}</strong>: ${changeHtml}</li>`;
            });
      listHtml += "</ul>";

      // Show and Position Popup
      if (!sectorPopup.empty()) {
          sectorPopup.transition().duration(100).style("opacity", 0.95);
          sectorPopup.html(listHtml) 
                     .style("left", `${event.pageX + 20}px`)
                     .style("top", `${event.pageY - 15}px`);
      }
  }, [
      formatPercentage, 
      getPercentageStyle, 
      selectedDate, 
      activeIndex, 
      // Add padding constants as dependencies
      PADDING_LEFT, 
      PADDING_TOP, 
      PADDING_RIGHT, 
      PADDING_BOTTOM 
  ]);

  const sectorMouseoutHandler = useCallback(() => {
      // Don't hide immediately, start a timer
      // Clear any existing timer first (belt and suspenders)
      if (hidePopupTimerRef.current) {
          clearTimeout(hidePopupTimerRef.current);
      }
      hidePopupTimerRef.current = setTimeout(() => {
          if (!svgRef.current) return; 
          // Remove Highlight Frame 
          d3.select(svgRef.current).selectAll(".sector-highlight-frame").remove();
          // Hide Popup
          d3.select<HTMLDivElement, unknown>("#sector-popup").transition().duration(200).style("opacity", 0);
           hidePopupTimerRef.current = null; // Clear ref after execution
      }, 300); // 300ms delay - adjust as needed
  }, []); // No external dependencies needed here

  // --- Main D3 Rendering Effect ---
  useEffect(() => {
    const svgElement = svgRef.current;
    
    // --- Tooltip Setup --- 
    let tileTooltip = d3.select<HTMLDivElement, unknown>("#tooltip-react");
    if (tileTooltip.empty()) {
        tileTooltip = d3.select("body").append("div")
            .attr("id", "tooltip-react")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "rgba(31, 31, 31, 0.9)")
            .style("border", "1px solid #00cc00") // Changed border to 1px
            .style("border-radius", "4px")
            .style("padding", "8px 12px")
            .style("color", "#ffffff")
            .style("font-size", "12px")
            .style("pointer-events", "none") 
            .style("white-space", "nowrap")
            .style("z-index", "999"); 
    }

    // --- NEW: Sector Popup Setup --- 
    let sectorPopup = d3.select<HTMLDivElement, unknown>("#sector-popup");
    if (sectorPopup.empty()) {
        sectorPopup = d3.select("body").append("div")
            .attr("id", "sector-popup")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "rgba(40, 40, 40, 0.95)") // Slightly different background
            .style("border", "1px solid #cccccc")
            .style("border-radius", "6px")
            .style("padding", "10px")
            .style("color", "#ffffff")
            .style("font-size", "12px")
            .style("pointer-events", "auto") // <-- CHANGE to auto
            .style("max-height", "300px") // Prevent excessive height
            .style("overflow-y", "auto") // Allow scrolling if list is long
            .style("z-index", "998"); // Slightly below tile tooltip if overlaps occur
        
        // --- Add mouse listeners directly to the popup --- 
        sectorPopup
            .on("mouseenter", () => {
                // When mouse enters the popup, clear the hide timer
                if (hidePopupTimerRef.current) {
                    clearTimeout(hidePopupTimerRef.current);
                    hidePopupTimerRef.current = null;
                }
            })
            .on("mouseleave", () => {
                // When mouse leaves the popup, START the hide timer
                if (hidePopupTimerRef.current) {
                    clearTimeout(hidePopupTimerRef.current);
                }
                hidePopupTimerRef.current = setTimeout(() => {
                    if (!svgRef.current) return;
                    d3.select(svgRef.current).selectAll(".sector-highlight-frame").remove();
                    sectorPopup.transition().duration(200).style("opacity", 0);
                    hidePopupTimerRef.current = null; 
                }, 300); // Use the same 300ms delay
            });
    }

    if (!stockData || !svgElement) {
        if (svgElement) {
            d3.select(svgElement).selectAll("*").remove();
        }
        return;
    }

    const svgWidth = svgElement.clientWidth;
    const svgHeight = svgElement.clientHeight;

    if (svgWidth <= 0 || svgHeight <= 0) {
        d3.select(svgElement).selectAll("*").remove();
      return;
    }

    const svg = d3.select(svgElement);
    svg.selectAll("*").remove();

    // Determine padding based on active index
    const currentPaddingTop = activeIndex === 'WORLD' ? 25 : 15; // Use 25 for World, 15 otherwise

    const treemapLayout = d3.treemap<TreeNodeData>()
        .size([svgWidth, svgHeight])
        .paddingTop(currentPaddingTop) // Use dynamic padding
        .paddingRight(PADDING_RIGHT)   
        .paddingBottom(PADDING_BOTTOM) 
        .paddingLeft(PADDING_LEFT)     // Use constant
        .paddingInner(0.5)
        .tile(d3.treemapSquarify); 

    const root = treemapLayout(stockData);
    const leaves = root.leaves();
    if (!Array.isArray(leaves)) { 
        console.error("D3 Error: root.leaves() did not return an Array!"); 
        return; 
    }

    const cell = svg.selectAll("g.tile-cell")
      .data(leaves as LeafNode[])
      .join("g")
        .attr("class", "tile-cell")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    cell.append("defs").append("clipPath")
        .attr("id", (d, i) => `clip-${i}`)
      .append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    cell.append("rect")
        .attr("class", "tile-border-rect")
        .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
        .attr("fill", d => calculateStrokeColor(d.data.changesPercentage ?? 0))
        .attr("stroke", "none");

    cell.append("rect")
        .attr("class", "tile-fill-rect")
        .attr("x", 0.5).attr("y", 0.5)
        .attr("width", d => Math.max(0, (d.x1 - d.x0) - 1))
        .attr("height", d => Math.max(0, (d.y1 - d.y0) - 1))
        .attr("fill", d => calculateColor(d.data.changesPercentage ?? 0))
        .attr("stroke", "none")
        .on("mouseover", function(event, d: LeafNode) {
            d3.select(this.parentNode as Element).select(".tile-border-rect")
              .attr("fill", "#ffffff"); 
            const percentage = d.data.changesPercentage ?? 0;
            const formattedPercentage = formatPercentage(percentage);
            const changeSpan = `<span>${formattedPercentage}</span>`;
            
            // --- Custom Market Cap Formatting ---
            const formatMarketCap = (value: number | undefined): string => {
              const num = value ?? 0;
              if (num >= 1e12) { // Trillions
                  return (num / 1e12).toFixed(2) + 'T'; 
              } else if (num >= 1e9) { // Billions
                  return (num / 1e9).toFixed(1) + 'B'; 
              } else if (num >= 1e6) { // Millions
                  return (num / 1e6).toFixed(1) + 'M'; 
              } else if (num >= 1e3) { // Thousands
                  return (num / 1e3).toFixed(0) + 'k'; 
              } else { // < 1000
                  return num.toFixed(0);
              }
            };
            // --- End Custom Market Cap Formatting ---

            let tooltipHtml = '';
            // Use the custom formatting function
            const marketCapFormatted = formatMarketCap(d.data.marketCap); 

            // Combine ETF and Live Stock logic (show Mkt Cap for both)
            if (selectedDate === null) { 
                 const companyName = d.data.name ? ` (${d.data.name})` : ''; // Add name if available
                 tooltipHtml = `<strong>${d.data.symbol}${companyName}</strong><br/>${changeSpan}<br/>Mkt Cap: ${marketCapFormatted}`;
            } else {
                // Historical view: Show Symbol, EOD Value (Close/Volume used for size)
                 // NOTE: Historical sizing might be inconsistent now as it uses marketCap field
                 const historicalValue = d.data.marketCap ?? 0; 
                 const valueFormatted = historicalValue > 10000 ? d3.format(".3s")(historicalValue) : historicalValue.toFixed(2);
                 tooltipHtml = `<strong>${d.data.symbol}</strong><br/>EOD Val: ${valueFormatted}<br/>(${formattedDate})`;
            }
            
            tileTooltip.transition().duration(100).style("opacity", 0.9);
            tileTooltip.html(tooltipHtml)
                   .style("left", `${event.pageX + 15}px`)
                   .style("top", `${event.pageY - 30}px`);
                   
            // Apply styles using the helper function
            const spanElement = tileTooltip.select('span'); 
            const styleProps = getPercentageStyle(percentage);
            spanElement
                .style('color', styleProps.color)
                .style('font-weight', styleProps.fontWeight)
                .style('text-shadow', styleProps.textShadow);
        })
        .on("mousemove", function(event) {
             tileTooltip.style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 30}px`);
        })
        .on("mouseout", function(_event, d: LeafNode) {
            d3.select(this.parentNode as Element).select(".tile-border-rect")
               .attr("fill", calculateStrokeColor(d.data.changesPercentage ?? 0)); 
            tileTooltip.transition().duration(200).style("opacity", 0);
        });

    cell.append("foreignObject")
        .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
        .style("pointer-events", "none")
        .attr("clip-path", (d, i) => `url(#clip-${i})`)
        .append("xhtml:div")
          .attr("class", "tile-text-container")
          .style("display", "flex").style("flex-direction", "column")
          .style("justify-content", "center").style("align-items", "center")
          .style("width", "100%").style("height", "100%")
          .style("overflow", "hidden").style("text-align", "center")
          .style("font-family", "'Roboto', sans-serif").style("color", "#ffffff")
          .style("font-weight", "bold")
          .each(function(d, i) { 
            const textContainer = d3.select(this);
            const w = d.x1 - d.x0;
            const h = d.y1 - d.y0;
            const MAX_FONT_SIZE = 24;
            const MIN_VISIBLE_FONT_SIZE = 6;
            const calculatedFontSize = Math.min(w * 0.22, h * 0.40, MAX_FONT_SIZE);
            const finalFontSize = calculatedFontSize >= MIN_VISIBLE_FONT_SIZE ? calculatedFontSize : 0;
            const isVisible = finalFontSize > 0;
            if (i < 5) { /* console.log(...) */ }
            textContainer.style("opacity", isVisible ? 1 : 0)
                         .style("font-size", `${finalFontSize}px`);
            let tickerSpan = textContainer.select<HTMLSpanElement>("span.ticker");
            if (tickerSpan.empty()) tickerSpan = textContainer.append("span").attr("class", "ticker");
            tickerSpan.style("line-height", "1.1")
                      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)")
                      .text(d.data.symbol ?? 'ERR');
            let changeSpan = textContainer.select<HTMLSpanElement>("span.change");
            if (changeSpan.empty()) changeSpan = textContainer.append("span").attr("class", "change");
            changeSpan.style('font-size', `${finalFontSize * 0.8}px`).style("line-height", "1.1")
                      .style('display', isVisible && h > MIN_RECT_HEIGHT_FOR_CHANGE ? 'block' : 'none')
                      .style("text-shadow", "1px 1px 1px rgba(0,0,0,0.6)")
                      .text(formatPercentage(d.data.changesPercentage));
        });

    // --- Sector/Region/Country Labels --- 
    // Select nodes at depth 1 (Region) and depth 2 (Country for World Map)
    const labelNodes = root.descendants().filter(d => d.depth === 1 || (activeIndex === 'WORLD' && d.depth === 2));

    // Determine label font size based on depth
    const getLabelFontSize = (d: d3.HierarchyRectangularNode<TreeNodeData>): string => {
        return d.depth === 1 ? '12px' : '10px'; // Smaller font for depth 2 (Country)
    };
    // Determine label text based on depth
    const getLabelText = (d: d3.HierarchyRectangularNode<TreeNodeData>): string => {
        if (d.depth === 1) {
            return d.data.name + ' >'; // Region label
        } else if (d.depth === 2 && activeIndex === 'WORLD') {
            return d.data.name; // Country label (only name)
        } else {
            return ''; // Should not happen with current filter
        }
    };

    // Add/Update labels using the functions
    const sectorLabels = svg.selectAll('.sector-label')
        // Use a function for the key to handle nodes with potentially same name at different depths
        .data(labelNodes, d => `${(d as d3.HierarchyRectangularNode<TreeNodeData>).depth}-${(d as d3.HierarchyRectangularNode<TreeNodeData>).data.name}`)
        .join(
             enter => enter.append('text')
                .attr('class', 'sector-label')
                .style('fill', '#ccc')
                .style('font-weight', '500')
                .style('pointer-events', 'all')
                .style('cursor', 'pointer')
                .on("mouseover", sectorMouseoverHandler)
                .on("mouseout", sectorMouseoutHandler)
                .attr('text-anchor', 'start')
                .attr('dx', 10)
                .call(enter => enter.style('opacity', 0)),
            update => update,
            exit => exit.transition().duration(200).style('opacity', 0).remove() // Fade out exit
        );

    // Apply common styles and transitions
    sectorLabels
        .attr('y', d => d.y0 + 12) // Adjusted y position (was d.y0 + 15)
        .style('font-size', d => getLabelFontSize(d)) // Apply dynamic font size
        .transition().duration(300) // Smooth transition for updates/enters
        .attr('x', d => d.x0) // Base X position (left-aligned)
        .text(d => getLabelText(d)) // Apply dynamic text
        .style('opacity', 1) // Fade in enter/update
        .each(function(d) { // Apply truncation logic
             // Add type assertion for 'this'
             const textElement = this as SVGTextElement;
             if (!textElement || typeof textElement.getComputedTextLength !== 'function') return;
             
             const maxWidth = (d.x1 - d.x0) - 15; 
             let text = getLabelText(d);
             textElement.textContent = text;
             // Use asserted element
             let width = textElement.getComputedTextLength(); 
             
             if (width > maxWidth) {
                 while (width > maxWidth && text.length > 3) {
                     text = text.slice(0, -4) + '...'; 
                     textElement.textContent = text;
                     // Use asserted element
                     width = textElement.getComputedTextLength(); 
                 }
                 if (width > maxWidth) {
                    textElement.textContent = ''; 
                 }
             }
        });

  }, [stockData, dimensions, calculateColor, formatPercentage, calculateStrokeColor, getPercentageStyle, activeIndex, selectedDate]);

  // --- Render Logic ---
  return (
    // Outer div - Use viewport width + aspect-ratio
    <div style={{
        padding: '10px',
        boxSizing: 'border-box',
        width: '90vw', // Set width relative to viewport
        aspectRatio: '2 / 1', // Change aspect ratio to make it taller (was 2.5 / 1)
        margin: '20px auto' 
    }}>
      {/* Inner div - Fill the outer div */}
    <div
      ref={containerRef}
      style={{
            width: '100%',
            height: '100%',
          border: '1px solid #00cc00', // Changed border to 1px
            borderRadius: '8px', backgroundColor: '#0a0a0a',
            position: 'relative', color: '#ffffff', fontFamily: 'Roboto, sans-serif',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', boxSizing: 'border-box'
        }}
      >
        {/* Header Container */}
        <div id="heatmap-header" style={{
            display: 'flex', 
            alignItems: 'baseline',
            padding: '0 10px 0 0', 
            borderBottom: '0.5px solid #00cc00',
            flexShrink: 0
          }}>
          {/* Index Tabs Container - Restore structure from provided code */}
          <div id="index-tabs"> 
            {indexTabs.map((tab) => ( // Use indexTabs array
              <button
                  key={tab.id} 
                  onClick={() => setActiveIndex(tab.id)} // Use tab.id
                  disabled={isLoading}
                  // Revert class name logic to use 'active'
                  className={`index-tab ${activeIndex === tab.id ? 'active' : ''}`} 
                  style={{
                    // Re-add inline margin
                    marginRight: '2px', 
                    cursor: isLoading ? 'default' : 'pointer' 
                   }}>
                    {tab.name}
              </button>
          ))}
      </div>

          {/* Index Description */}
           {/* Use div as in provided code */} 
          <div id="heatmap-description" style={{
                margin: '0 20px',          
                textAlign: 'center',      
                flexGrow: 1,              
                fontSize: '10pt' 
              }}>
             <p style={{ 
                  margin: 0, 
                  color: '#ffffff'
                }}>
                 {INDEX_DESCRIPTIONS[activeIndex as keyof typeof INDEX_DESCRIPTIONS]}
             </p>
      </div>

            {/* Live Data Indicator */}
            <div className="live-indicator" style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
              <span className="live-dot" style={{ marginRight: '5px' }}></span>
              <span className="live-text">Live Data</span>
        </div>
        </div>

        {/* Status Messages */}
        {isLoading && ( <div style={{ /* Loading styles */ }}>Loading data for {activeIndex}...</div> )}
        {error && ( <div style={{ /* Error styles */ }}>Error: {error}</div> )}

        {/* Restore SVG Container */}
        <svg ref={svgRef} id="treemap-chart-react"
            style={{ display: 'block', flexGrow: 1, minHeight: 0 }}>
            {/* D3 will populate this */}
      </svg>

        {/* Footer Section */}
        <div id="heatmap-footer" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '5px 10px 8px 5px', // Change top padding from 0 to 5px
            marginTop: '5px', backgroundColor: '#0a0a0a', flexShrink: 0,
            borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'
          }}>
            {/* Date Button Container - Using DatePicker with Custom Input */}
            <div id="date-search-placeholder">
                 <DatePicker
                    selected={selectedDate} 
                    onChange={(date: Date | null) => {
                        setSelectedDate(date);
                        setIsDatePickerOpen(false); 
                    }}
                    // Use React.createElement with forwardRef for custom input
                    customInput={React.createElement(forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(({ value, onClick }, ref) => (
                        <button 
                            className="date-button" 
                            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} // Directly toggle state on click
                            ref={ref}
                        >
                            {value || 'D'} 
                        </button>
                    )))}
                    open={isDatePickerOpen} 
                    onClickOutside={() => setIsDatePickerOpen(false)} 
                    dateFormat="yyyy-MM-dd"
                    placeholderText="Live / Select Date" 
                    isClearable 
                    popperPlacement="right-start"
                    maxDate={new Date()}
                  />
            </div>
            {/* Legend Container */}
            <div id="legend-container" style={{ display: 'flex' }}>
                 {/* Legend Items */}
                 <div className="legend-item"><div className="legend-color" style={{ backgroundColor: "#D31245" }}></div><span className="legend-label">-3%</span></div>
                 <div className="legend-item"><div className="legend-color" style={{ backgroundColor: "#B01E3C" }}></div><span className="legend-label">-2%</span></div>
                 <div className="legend-item"><div className="legend-color" style={{ backgroundColor: "#8B2534" }}></div><span className="legend-label">-1%</span></div>
                 <div className="legend-item"><div className="legend-color" style={{ backgroundColor: "#3A3A3A" }}></div><span className="legend-label">0%</span></div>
                 <div className="legend-item"><div className="legend-color" style={{ backgroundColor: "#2E7A3E" }}></div><span className="legend-label">+1%</span></div>
                 <div className="legend-item"><div className="legend-color" style={{ backgroundColor: "#279B48" }}></div><span className="legend-label">+2%</span></div>
                 <div className="legend-item"><div className="legend-color" style={{ backgroundColor: "#17C653" }}></div><span className="legend-label">+3%</span></div>
        </div>
        </div>

      </div>
    </div>
  );
};

export default StockHeatmap; 