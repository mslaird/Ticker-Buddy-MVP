import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3'; // We'll likely need D3

// Define TypeScript interfaces for our data
interface StockQuote {
  symbol: string;
  marketCap: number;
  changesPercentage: number;
  sector: string;
  // Add other relevant properties if needed
}

interface HierarchicalStockData extends d3.HierarchyNode<StockQuote> {
  // D3 HierarchyNode requires a 'data' property, which will be our StockQuote
  // It also adds 'value', 'depth', 'height', 'parent', 'children'
}

// Define props if the component needs any input from its parent
interface StockHeatmapProps {
  // Example: initialIndex?: 'sp500' | 'dow' | 'ndx' | 'rut';
}

const StockHeatmap: React.FC<StockHeatmapProps> = (props) => {
  // --- State ---
  const [stockData, setStockData] = useState<HierarchicalStockData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<'sp500' | 'dow' | 'ndx' | 'rut'>('sp500'); // Default index
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // --- Refs ---
  // Ref to the container div to measure its size
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to the SVG element where D3 will draw
  const svgRef = useRef<SVGSVGElement>(null);
  // Ref to the tooltip div
  const tooltipRef = useRef<HTMLDivElement>(null);

  // --- Constants (Ported from StockHeatmap.js, adjust as needed) ---
  // Load API key securely from environment variables using Vite's convention
  const API_KEY = import.meta.env.VITE_FMP_API_KEY;
  
  if (!API_KEY) {
    console.error("Error: VITE_FMP_API_KEY is not defined in your .env file.");
    // Potentially set an error state here or return a message component
  }
  
  const API_BASE_URL = "https://financialmodelingprep.com/api/v3";
  // Use template literal with the loaded API key
  const INDEX_ENDPOINTS = {
      sp500: `${API_BASE_URL}/sp500_constituent?apikey=${API_KEY}`,
      dow: `${API_BASE_URL}/dowjones_constituent?apikey=${API_KEY}`,
      ndx: `${API_BASE_URL}/nasdaq_constituent?apikey=${API_KEY}`,
      rut: `${API_BASE_URL}/russell_2000_constituent?apikey=${API_KEY}`,
  };
  const INDEX_DESCRIPTIONS = {
      sp500: "Standard and Poor's 500 U.S. index stocks categorized by sectors and industries. Size represents market cap.",
      dow: "Dow Jones Industrial Average (30 large cap stocks) categorized by sectors. Size represents market cap.",
      ndx: "Nasdaq 100 index stocks (largest non-financial companies) categorized by sectors. Size represents market cap.",
      rut: "Russell 2000 index stocks (small-cap US stocks) categorized by sectors. Size represents market cap."
  };
  const MIN_RECT_WIDTH_FOR_TEXT = 25;
  const MIN_RECT_HEIGHT_FOR_TEXT = 15;
  const MIN_RECT_HEIGHT_FOR_CHANGE = 35;

  // --- Effects ---

  // Effect to get initial container dimensions and set up resize listener
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    // Initial dimensions
    updateDimensions();

    // Resize listener
    window.addEventListener('resize', updateDimensions);

    // Cleanup listener on component unmount
    return () => window.removeEventListener('resize', updateDimensions);
  }, []); // Empty dependency array ensures this runs only once on mount


  // Effect to fetch data when activeIndex changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setStockData(null); // Clear previous data

      const currentEndpoint = INDEX_ENDPOINTS[activeIndex];
      if (!currentEndpoint) {
          setError(`Error: Endpoint not defined for index type "${activeIndex}".`);
          setIsLoading(false);
          return;
      }

      console.log(`Fetching data for ${activeIndex}...`);
      // TODO: Implement the full fetch and processing logic from StockHeatmap.js
      // 1. Fetch constituents
      // 2. Fetch quotes
      // 3. Combine and filter data
      // 4. Transform data using transformData function (needs porting)
      // 5. Set state: setStockData(hierarchicalData), setIsLoading(false)
      // Handle errors: setError(message), setIsLoading(false)

      try {
        // Placeholder - replace with actual fetching and processing
        console.log(`Simulating fetch for: ${currentEndpoint}`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

        // --- TODO: Port the actual fetching logic here ---
        // Example structure:
        // const constituents = await fetchConstituents(currentEndpoint);
        // const symbols = constituents.map(c => c.symbol);
        // const quotes = await fetchQuotes(symbols);
        // const combined = combineAndFilter(quotes, constituents); // Needs sector info too
        // const hierarchical = transformData(combined); // Needs porting
        // setStockData(hierarchical);


        // TEMPORARY: Set loading to false after simulation
        console.log("Fetch simulation complete.");
        setIsLoading(false);


      } catch (err: any) {
          console.error("Error fetching stock data:", err);
          setError(err.message || 'Failed to fetch stock data.');
          setIsLoading(false);
      }
    };

    fetchData();

  }, [activeIndex, API_KEY]); // Add API_KEY back to dependency array


  // Effect to run D3 rendering when data or dimensions change
  useEffect(() => {
    if (!stockData || !svgRef.current || dimensions.width === 0 || dimensions.height === 0) {
      // Don't render if no data, no SVG ref, or dimensions aren't set yet
      return;
    }

    console.log("Rendering D3 treemap...");
    // TODO: Implement D3 rendering logic from StockHeatmap.js
    // 1. Select the SVG element using svgRef.current
    // 2. Configure the d3.treemap layout using current dimensions
    // 3. Bind data (stockData) to SVG elements (groups, rects, text)
    // 4. Set attributes (position, size, fill color) based on data
    // 5. Add text labels
    // 6. Set up tooltip interactions (needs porting of handlers)

    // --- Temporary placeholder ---
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Example: Draw a simple rectangle indicating size
    svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", dimensions.width)
      .attr("height", dimensions.height)
      .attr("fill", "#222"); // Placeholder background

    svg.append("text")
      .attr("x", dimensions.width / 2)
      .attr("y", dimensions.height / 2)
      .attr("fill", "white")
      .attr("text-anchor", "middle")
      .text(`Data loaded for ${activeIndex}. Ready for D3 render (${dimensions.width}x${dimensions.height})`);
    // --- End Temporary placeholder ---


  }, [stockData, dimensions]); // Re-render if data or dimensions change

  // --- Helper Functions (Port from StockHeatmap.js or rewrite for React) ---

  // TODO: Port the transformData function
  const transformData = (flatData: StockQuote[]): any /* Define proper return type */ => {
      console.warn("transformData function needs to be ported from StockHeatmap.js");
      // This function needs to create the hierarchical structure D3 expects
      // e.g., { name: "root", children: [ { name: "Sector", children: [ { stockQuoteData } ] } ] }
      // It used d3.nest (deprecated) or d3.group in modern D3
      // Return placeholder
      return { name: "root", children: [] };
  };

  // TODO: Port color calculation logic
  const calculateColor = (percentageChange: number): string => {
    // Logic from getFillColor in StockHeatmap.js
    const maxChange = 2.0; // Example max change for scaling
    const scale = d3.scaleLinear<string>()
        .domain([-maxChange, 0, maxChange])
        .range(["#f63c6b", "#555", "#00cc00"]) // Red -> Gray -> Green
        .clamp(true);
    return scale(percentageChange);
  };

  // TODO: Port tooltip handlers (handleMouseOver, handleMouseMove, handleMouseOut)
  // These will likely attach to the SVG elements created by D3


  // --- Render Logic ---
  return (
    <div
      ref={containerRef}
      id="treemap-container-react" // Use a different ID if needed
      style={{
          width: '100%', // Example: make it fill its parent
          height: '500px', // Example: fixed height, or make it dynamic
          border: '0.5px solid #00cc00',
          backgroundColor: '#0a0a0a',
          position: 'relative', // Needed for absolute positioning of tooltip/status
          color: '#ffffff', // Default text color based on guidelines
          fontFamily: 'Roboto, sans-serif'
      }}
    >
      {/* Index Selection Tabs */}
      <div id="index-tabs" style={{ padding: '10px', backgroundColor: '#1f1f1f', borderBottom: '0.5px solid #00cc00' }}>
          {Object.keys(INDEX_ENDPOINTS).map((key) => (
              <button
                  key={key}
                  onClick={() => setActiveIndex(key as 'sp500' | 'dow' | 'ndx' | 'rut')}
                  disabled={isLoading}
                  style={{
                      marginRight: '10px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      backgroundColor: activeIndex === key ? '#00cc00' : '#333',
                      color: activeIndex === key ? '#0a0a0a' : '#ffffff',
                      border: 'none',
                      borderRadius: '3px',
                      fontFamily: 'Roboto, sans-serif'
                  }}
              >
                  {key.toUpperCase()}
              </button>
          ))}
      </div>

       {/* Description Area */}
      <div id="heatmap-description" style={{ padding: '5px 10px', fontSize: '0.9em', color: '#999999' }}>
        <p>{INDEX_DESCRIPTIONS[activeIndex]}</p>
      </div>

      {/* Status Messages/Loading Indicator */}
      {isLoading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
            Loading data for {activeIndex.toUpperCase()}...
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#f63c6b', zIndex: 10 }}>
            Error: {error}
        </div>
      )}

      {/* SVG Container for D3 Chart */}
      <svg
        ref={svgRef}
        id="treemap-chart-react" // Use a different ID if needed
        width={dimensions.width}
        height={dimensions.height - 70} // Adjust height based on tabs/description taking space
        viewBox={`0 0 ${dimensions.width} ${dimensions.height - 70}`} // Adjust viewBox too
        style={{ display: 'block' }} // Prevent extra space below SVG
      >
        {/* D3 will populate this SVG */}
      </svg>

      {/* Tooltip Element (position managed by JS/D3) */}
      <div
        ref={tooltipRef}
        id="tooltip-react" // Use a different ID if needed
        style={{
            position: 'absolute',
            opacity: 0, // Initially hidden
            backgroundColor: 'rgba(31, 31, 31, 0.9)', // #1f1f1f with opacity
            border: '0.5px solid #00cc00',
            borderRadius: '4px',
            padding: '8px 12px',
            color: '#ffffff',
            fontSize: '12px',
            pointerEvents: 'none', // Important! Tooltip shouldn't block mouse events
            whiteSpace: 'nowrap',
            zIndex: 20
        }}
      >
        {/* Tooltip content will be set dynamically */}
      </div>

    </div>
  );
};

export default StockHeatmap; 