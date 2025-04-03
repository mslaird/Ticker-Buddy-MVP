import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3'; // We'll likely need D3

// Define TypeScript interfaces for our data
interface StockQuote {
  symbol: string;
  marketCap: number;
  changesPercentage: number;
  sector: string;
  // Add other relevant properties if needed
}

// Type for the data structure *after* transformData
// Sector nodes have name and children; Leaf nodes have name and StockQuote data
interface TreeNodeData {
  name: string;
  children?: TreeNodeData[];
  // Include StockQuote properties directly for leaf nodes
  symbol?: string;
  marketCap?: number;
  changesPercentage?: number;
  sector?: string;
}

// Define props if the component needs any input from its parent
interface StockHeatmapProps {
  // Example: initialIndex?: 'sp500' | 'dow' | 'ndx' | 'rut';
}

const StockHeatmap: React.FC<StockHeatmapProps> = (props) => {
  // --- State, Refs (REMOVE tooltipRef), Constants, Helpers ---
  const [stockData, setStockData] = useState<d3.HierarchyNode<TreeNodeData> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<string>('SP500');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      SP500: `${API_BASE_URL}/sp500_constituent?apikey=${API_KEY}`,
      DOW: `${API_BASE_URL}/dowjones_constituent?apikey=${API_KEY}`,
      NDX: `${API_BASE_URL}/nasdaq_constituent?apikey=${API_KEY}`,
      RUT: `${API_BASE_URL}/russell_2000_constituent?apikey=${API_KEY}`,
  };
  const INDEX_DESCRIPTIONS = {
      SP500: "Standard and Poor's 500 U.S. index stocks categorized by sectors and industries. Size represents market cap.",
      DOW: "Dow Jones Industrial Average (30 large cap stocks) categorized by sectors. Size represents market cap.",
      NDX: "Nasdaq 100 index stocks (largest non-financial companies) categorized by sectors. Size represents market cap.",
      RUT: "Russell 2000 index stocks (small-cap US stocks) categorized by sectors. Size represents market cap."
  };
  const MIN_RECT_WIDTH_FOR_TEXT = 25;
  const MIN_RECT_HEIGHT_FOR_TEXT = 15;
  const MIN_RECT_HEIGHT_FOR_CHANGE = 25;

  // Define tab configurations using uppercase IDs
  const indexTabs = [
      { id: 'SP500', name: 'S&P 500' },
      { id: 'DOW', name: 'DOW 30' },
      { id: 'NDX', name: 'Nasdaq 100' },
      { id: 'RUT', name: 'Russell 2000' }
  ];

  // --- Helper Functions (Define BEFORE useEffect that uses them) ---

  // Color calculation logic (Reverted red spectrum)
  const calculateColor = useCallback((percentageChange: number): string => {
    const scale = d3.scaleLinear<string>()
        .domain([-3, -2, -1, 0, 1, 2, 3]) 
        // Reverted Range: Restored previous reds, kept greens/gray
        .range(["#D31245", "#B01E3C", "#8B2534", "#3A3A3A", "#2E7A3E", "#279B48", "#17C653"]) 
        .clamp(true); 
    return scale(percentageChange); 
  }, []);

  // Calculate STROKE color: Specific hex for pos/neg, LIGHTER dynamic for near-zero/zero
  const calculateStrokeColor = useCallback((percentageChange: number): string => {
    // Check if the value is effectively zero (rounds to 0.0%)
    if (Math.abs(percentageChange) < 0.05) {
        // Use dynamic LIGHTER gray for zero or near-zero changes for visibility
        const baseColor = calculateColor(0); // Explicitly get the gray color
        // Increase brightening factor for more contrast
        const lighterColor = d3.color(baseColor)?.brighter(2.0); 
        return lighterColor ? lighterColor.toString() : baseColor; 
    } else if (percentageChange > 0) {
        // Use fixed bright green for positive changes
        return "#00cc00";
    } else { // percentageChange < -0.05 
        // Use fixed bright red for negative changes
        return "#D31245";
    }
  }, [calculateColor]);

  // Format percentage change
  const formatPercentage = useCallback((value: number | undefined): string => {
      if (value === undefined) return "N/A";
      if (value === 0) return "0.0%";
      return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }, []);

  // transformData function
  const transformData = (flatData: StockQuote[]): d3.HierarchyNode<TreeNodeData> | null => {
    if (!flatData || flatData.length === 0) {
        console.error("transformData received empty or invalid data.");
        return null;
    }
    const groupedData = d3.group(flatData, d => d.sector);
    const rootHierarchy = {
        name: "root",
        children: Array.from(groupedData, ([sectorName, stocks]) => ({
            name: sectorName,
            children: stocks.map(stock => ({
                name: stock.symbol,
                ...stock
            }))
        }))
    };
    const hierarchy = d3.hierarchy<TreeNodeData>(rootHierarchy) // Specify TreeNodeData type
        .sum((d) => d.marketCap ?? 0) // Use nullish coalescing for safety
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    console.log(">>> transformData completed. Root node:", hierarchy);
    return hierarchy;
  };

  // --- Calculated Values ---
  const headerFooterHeight = 110; // Approx combined height for header/desc + footer
  const availableHeight = dimensions.height > headerFooterHeight ? dimensions.height - headerFooterHeight : 0;

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

      const CONSTITUENTS_URL = INDEX_ENDPOINTS[activeIndex as keyof typeof INDEX_ENDPOINTS]; // Use uppercase key
      const indexName = activeIndex; // Already uppercase

      if (!CONSTITUENTS_URL) {
          setError(`Endpoint not defined for index type "${activeIndex}".`);
          setIsLoading(false);
          return;
      }

      console.log(`>>> Fetching ${indexName} constituents...`);
      let symbols: string[] = [];
      let sectorMap: { [key: string]: string } = {};

      try {
        const constituentsResponse = await fetch(CONSTITUENTS_URL);
        if (!constituentsResponse.ok) throw new Error(`Failed to fetch ${indexName} list: ${constituentsResponse.status}`);
        const constituentsData = await constituentsResponse.json();
        if (!Array.isArray(constituentsData)) throw new Error(`Invalid data format for ${indexName} constituents.`);
        constituentsData.forEach((stock: any) => {
            if (stock.symbol) { symbols.push(stock.symbol); sectorMap[stock.symbol] = stock.sector || "Other"; }
        });
        if (symbols.length === 0) throw new Error(`No symbols found for ${indexName}.`);
        console.log(`>>> Fetched ${symbols.length} ${indexName} symbols. Fetching quotes...`);

        const QUOTE_URL = `${API_BASE_URL}/quote/${symbols.join(',')}?apikey=${API_KEY}`;
        const quoteResponse = await fetch(QUOTE_URL);
        if (!quoteResponse.ok) throw new Error(`Failed to fetch ${indexName} quotes: ${quoteResponse.status}`);
        const quoteData = await quoteResponse.json();
        if (!Array.isArray(quoteData)) throw new Error(`Invalid data format for ${indexName} quotes.`);
        console.log(`>>> Received ${quoteData.length} ${indexName} quotes. Combining...`);

        let combinedData: StockQuote[] = quoteData.map((quote: any) => {
            if (!quote.symbol || typeof quote.marketCap !== 'number') return null;
            return {
                symbol: quote.symbol, marketCap: quote.marketCap,
                changesPercentage: typeof quote.changesPercentage === 'number' ? quote.changesPercentage : 0,
                sector: sectorMap[quote.symbol] || "Other"
            };
        }).filter((stock): stock is StockQuote => stock !== null);
        combinedData = combinedData.filter(stock => stock.symbol !== 'GOOG'); // Filter GOOG
        if (combinedData.length === 0) throw new Error(`No valid stocks remaining for ${indexName}.`);
        console.log(`>>> Using ${combinedData.length} ${indexName} stocks. Transforming...`);

        const hierarchicalData = transformData(combinedData);
        if (!hierarchicalData) throw new Error(`Failed to transform ${indexName} data.`);
        console.log(`>>> Data fetch successful for ${indexName}.`);
        setStockData(hierarchicalData); setError(null);
      } catch (err: any) {
          console.error(`>>> FetchData Error (${indexName}):`, err);
          setError(err.message || `An unknown error occurred (${indexName}).`); setStockData(null);
      } finally { setIsLoading(false); }
    };
    fetchData();
  }, [activeIndex, API_KEY]); // API_KEY added as dependency

  // D3 rendering effect
  useEffect(() => {
    const svgElement = svgRef.current;
    let tooltip = d3.select<HTMLDivElement, unknown>("#tooltip-react");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "tooltip-react")
            .style("position", "absolute")
            .style("opacity", 0)
            .style("background-color", "rgba(31, 31, 31, 0.9)") // #1f1f1f with opacity
            .style("border", "0.5px solid #00cc00")
            .style("border-radius", "4px")
            .style("padding", "8px 12px")
            .style("color", "#ffffff")
            .style("font-size", "12px")
            .style("pointer-events", "none") // Tooltip shouldn't block mouse events
            .style("white-space", "nowrap")
            .style("z-index", "999"); // Ensure high z-index
    }

    if (!stockData || !svgElement) {
        // Clear SVG if we abort render due to missing data/ref
        if (svgElement) {
            d3.select(svgElement).selectAll("*").remove();
        }
        return;
    }

    // NOW, measure the SVG's actual dimensions
    const svgWidth = svgElement.clientWidth;
    const svgHeight = svgElement.clientHeight;

    // Check if SVG dimensions are valid before proceeding
    if (svgWidth <= 0 || svgHeight <= 0) {
        // Clear SVG if dimensions are invalid (e.g., hidden container)
        d3.select(svgElement).selectAll("*").remove();
        return;
    }

    const svg = d3.select(svgElement);

    // Clear previous render
    svg.selectAll("*").remove();

    // Use MEASURED SVG dimensions for layout size
    const treemapLayout = d3.treemap<TreeNodeData>()
        .size([svgWidth, svgHeight]) // USE MEASURED SVG DIMENSIONS
        .paddingTop(20)
        .paddingRight(10)
        .paddingBottom(2)
        .paddingLeft(10)
        .paddingInner(3)
        .tile(d3.treemapSquarify);

    const root = treemapLayout(stockData);
    type LeafNode = d3.HierarchyRectangularNode<TreeNodeData & StockQuote>;

    const leaves = root.leaves();
    if (!Array.isArray(leaves)) { console.error("D3 Error: root.leaves() !Array"); return; }

    const cell = svg.selectAll("g.tile-cell")
      .data(leaves as LeafNode[])
      .join("g")
        .attr("class", "tile-cell")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // Clip Paths
    cell.append("defs").append("clipPath")
        .attr("id", (d, i) => `clip-${i}`)
      .append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0);

    // Outer Border Rect
    cell.append("rect")
        .attr("class", "tile-border-rect") // Class for hover targeting
        .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
        .attr("fill", d => calculateStrokeColor(d.data.changesPercentage ?? 0))
        .attr("stroke", "none");

    // Inner Fill Rect + Interactions
    cell.append("rect")
        .attr("class", "tile-fill-rect")
        .attr("x", 0.5).attr("y", 0.5)
        .attr("width", d => Math.max(0, (d.x1 - d.x0) - 1))
        .attr("height", d => Math.max(0, (d.y1 - d.y0) - 1))
        .attr("fill", d => calculateColor(d.data.changesPercentage ?? 0))
        .attr("stroke", "none")
        .on("mouseover", function(event, d: LeafNode) {
            d3.select(this.parentNode as Element).select(".tile-border-rect")
              .attr("fill", "#ffffff"); // Highlight border

            // Use the body-appended tooltip selection
            tooltip.transition().duration(100).style("opacity", 0.9); // Smooth fade-in
            tooltip.html(`<strong>${d.data.symbol}</strong><br/>${formatPercentage(d.data.changesPercentage)}<br/>Mkt Cap: ${d3.format(".3s")(d.data.marketCap ?? 0)}`)
                   .style("left", `${event.pageX + 15}px`) // Adjust offset slightly
                   .style("top", `${event.pageY - 30}px`); // Adjust offset slightly
        })
        .on("mousemove", function(event) {
             // Use the body-appended tooltip selection
             tooltip.style("left", `${event.pageX + 15}px`)
                    .style("top", `${event.pageY - 30}px`);
        })
        .on("mouseout", function(_event, d: LeafNode) {
            d3.select(this.parentNode as Element).select(".tile-border-rect")
               .attr("fill", calculateStrokeColor(d.data.changesPercentage ?? 0)); // Revert border

            // Use the body-appended tooltip selection
            tooltip.transition().duration(200).style("opacity", 0); // Smooth fade-out
        });

    // Text Labels (foreignObject)
    cell.append("foreignObject")
        .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
        .style("pointer-events", "none")
        .attr("clip-path", (d, i) => `url(#clip-${i})`)
        .append("xhtml:div")
          .attr("class", "tile-text-container") // Added class
          .style("display", "flex").style("flex-direction", "column")
          .style("justify-content", "center").style("align-items", "center")
          .style("width", "100%").style("height", "100%")
          .style("overflow", "hidden").style("text-align", "center")
          .style("font-family", "'Roboto', sans-serif").style("color", "#ffffff")
          .style("font-weight", "bold")
          .each(function(d, i) { // Use .each on the div selection
            const textContainer = d3.select(this);
            const w = d.x1 - d.x0;
            const h = d.y1 - d.y0;

            // Font size calculation
            const MAX_FONT_SIZE = 24;
            const MIN_VISIBLE_FONT_SIZE = 6;
            const calculatedFontSize = Math.min(w * 0.22, h * 0.40, MAX_FONT_SIZE);
            const finalFontSize = calculatedFontSize >= MIN_VISIBLE_FONT_SIZE ? calculatedFontSize : 0;
            const isVisible = finalFontSize > 0;

            if (i < 5) { console.log(`Tile ${i}: Symbol=${d.data.symbol}, W=${w.toFixed(1)}, H=${h.toFixed(1)}, CalcFS=${calculatedFontSize.toFixed(1)}, FinalFS=${finalFontSize}, Visible=${isVisible}`); }

            // Apply styles to DIV
            textContainer.style("opacity", isVisible ? 1 : 0)
                         .style("font-size", `${finalFontSize}px`);

            // Ticker Span (Select/Append)
            let tickerSpan = textContainer.select<HTMLSpanElement>("span.ticker");
            if (tickerSpan.empty()) tickerSpan = textContainer.append("span").attr("class", "ticker");
            tickerSpan.style("line-height", "1.1").text(d.data.symbol ?? 'ERR');

            // Change Span (Select/Append)
            let changeSpan = textContainer.select<HTMLSpanElement>("span.change");
            if (changeSpan.empty()) changeSpan = textContainer.append("span").attr("class", "change");
            changeSpan.style('font-size', `${finalFontSize * 0.8}px`).style("line-height", "1.1")
                      .style('display', isVisible && h > MIN_RECT_HEIGHT_FOR_CHANGE ? 'block' : 'none')
                      .text(formatPercentage(d.data.changesPercentage));
        });

    // Sector Labels (Centered)
    const sectors = root.descendants().filter(d => d.depth === 1);
    svg.selectAll('.sector-label')
        .data(sectors ?? [], d => (d as d3.HierarchyRectangularNode<TreeNodeData>).data.name)
        .join( enter => enter.append('text')
                .attr('class', 'sector-label').style('fill', '#ccc')
                .style('font-size', '12px').style('font-weight', '500')
                .attr('text-anchor', 'middle').attr('y', d => d.y0 + 15).attr('dx', 0),
            update => update, exit => exit.remove()
        )
        .attr('x', d => d.x0 + (d.x1 - d.x0) / 2) // Center X
        .attr('y', d => d.y0 + 15)
        .text(d => d.data.name + ' >');

  }, [stockData, dimensions, calculateColor, formatPercentage, calculateStrokeColor]); // Keep dimensions in dependency array to trigger re-render on resize

  // --- Render Logic ---
  return (
    // Outer div for sizing, padding, centering
    <div style={{
        padding: '10px',
        boxSizing: 'border-box',
        maxWidth: '1600px', // Keep previous width setting
        maxHeight: '650px', // Keep previous height setting
        height: 'calc(100vh - 40px)',
        margin: '20px auto'
    }}>
      {/* Inner div for border, background, flex layout */}
    <div
      ref={containerRef}
      style={{
            width: '100%', height: '100%',
            border: '0.5px solid #00cc00', // Restore 0.5px border
            borderRadius: '8px', backgroundColor: '#0a0a0a',
            position: 'relative', color: '#ffffff', fontFamily: 'Roboto, sans-serif',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', boxSizing: 'border-box' // Restore boxSizing
        }}
      >
        {/* Header Container */}
        <div id="heatmap-header" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '0 10px 0 0', borderBottom: '0.5px solid #00cc00', flexShrink: 0
          }}>
          {/* Index Tabs */}
          <div id="index-tabs">
            {indexTabs.map((tab) => ( // Use indexTabs array
                <button key={tab.id} onClick={() => setActiveIndex(tab.id)}
                        disabled={isLoading} className={`index-tab ${activeIndex === tab.id ? 'active' : ''}`}
                        style={{ marginRight: '2px', cursor: isLoading ? 'default' : 'pointer' }}>
                    {tab.name}
              </button>
          ))}
          </div>
          {/* Live Data Indicator */}
          <div className="live-indicator" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="live-dot" style={{ marginRight: '5px' }}></span>
            <span className="live-text">Live Data</span>
          </div>
      </div>

       {/* Description Area */}
        <div id="heatmap-description" style={{
                padding: '0 15px', marginTop: '8px', marginBottom: '5px', // Restored margins
                color: '#999999', fontSize: '14pt' // Restored font size
              }}>
             <p style={{ margin: 0 }}>{INDEX_DESCRIPTIONS[activeIndex as keyof typeof INDEX_DESCRIPTIONS]}</p>
      </div>

        {/* Status Messages */}
        {isLoading && ( <div style={{ /* Loading styles */ }}>Loading data for {activeIndex}...</div> )}
        {error && ( <div style={{ /* Error styles */ }}>Error: {error}</div> )}

        {/* SVG Container */}
        <svg ref={svgRef} id="treemap-chart-react"
            style={{ display: 'block', flexGrow: 1, minHeight: 0 }}>
            {/* D3 populates this */}
        </svg>

        {/* Footer Section */}
        <div id="heatmap-footer" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0 10px 8px 20px', // Restored padding for alignment
            marginTop: '5px', backgroundColor: '#0a0a0a', flexShrink: 0,
            borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px'
          }}>
            {/* Date Button Container */}
            <div id="date-search-placeholder">
                <button className="date-button">D</button>
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