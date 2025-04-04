import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3'; // We'll likely need D3

// Define TypeScript interfaces for our data
interface StockQuote {
  symbol: string;
  name?: string;
  marketCap: number;
  changesPercentage: number;
  sector: string;
  industry?: string; // Revert back to optional
  // Add other relevant properties if needed
}

// Type for the data structure *after* transformData
// Sector nodes have name and children; Leaf nodes have name and StockQuote data
interface TreeNodeData extends Partial<StockQuote> {
  name: string;
  children?: TreeNodeData[];
  // Include StockQuote properties directly for leaf nodes
  symbol?: string;
  value?: number;
}

// Define props if the component needs any input from its parent
interface StockHeatmapProps {
  // Example: initialIndex?: 'sp500' | 'dow' | 'ndx' | 'rut';
}

// Type alias for leaf nodes in the hierarchy (contains StockQuote data)
type LeafNode = d3.HierarchyRectangularNode<TreeNodeData & StockQuote>;

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
        // Revert range back to the previous version
        .range(["#D31245", "#B01E3C", "#8B2534", "#3A3A3A", "#2E7A3E", "#279B48", "#17C653"])
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

  // Helper for styling percentage text in tooltips/popups
  const getPercentageStyle = (percentage: number): { color: string; textShadow: string; fontWeight: string } => {
    if (percentage > 0) {
        return { 
            color: '#39FF14', // Neon Lime Green
            textShadow: 'none',
            fontWeight: 'bold' 
        };
    } else if (percentage < 0) {
        return {
            color: '#FF0000', // Pure Bright Red
            textShadow: 'none', 
            fontWeight: 'bold'
        };
    } else {
        return {
            color: '#cccccc', // Light grey
            textShadow: 'none', 
            fontWeight: 'bold'
        };
    }
  };

  // transformData function - Revert to Sector -> Stock grouping
  const transformData = (flatData: StockQuote[]): d3.HierarchyNode<TreeNodeData> | null => {
    if (!flatData || flatData.length === 0) {
        console.error("transformData received empty or invalid data.");
        return null;
    }

    const groupedData = d3.group(flatData, d => d.sector || "Unknown Sector");
    
    const rootHierarchy: TreeNodeData = {
        name: "root",
        children: Array.from(groupedData, ([sectorName, stocks]) => ({
            name: sectorName,
            // Leaf nodes are the individual stocks
            children: stocks.map(stock => ({ 
                name: stock.symbol, // <-- Leaf node name MUST be symbol for hierarchy
                ...stock // <-- Spread the rest of the StockQuote data (including company name)
            }))
        }))
    };

    const hierarchy = d3.hierarchy<TreeNodeData>(rootHierarchy)
        .sum((d) => d.marketCap ?? 0) 
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    
    console.log(">>> transformData completed (Sector->Stock). Root node:", hierarchy); 
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

  // Fetch data when activeIndex changes - Revert to only use sector
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
  }, [activeIndex, API_KEY]); // Removed dependencies for brevity, ensure they are correct

  // --- Handler Functions for Sector Hover (Defined BEFORE useEffect) --- 
  const sectorMouseoverHandler = useCallback((event: MouseEvent, d: d3.HierarchyRectangularNode<TreeNodeData>) => {
      if (!svgRef.current) {
          return;
      }
      const svg = d3.select(svgRef.current);
      const sectorPopup = d3.select<HTMLDivElement, unknown>("#sector-popup");
      
      // Add Highlight Rect (Styled as a border now)
      svg.append("rect")
         .attr("class", "sector-highlight-overlay") 
         .attr("x", d.x0)
         .attr("y", d.y0)
         .attr("width", d.x1 - d.x0)
         .attr("height", d.y1 - d.y0)
         .attr("fill", "none") // <-- Make fill transparent
         .attr("stroke", "#ffffff") // <-- Set stroke color to white
         .attr("stroke-width", 2) // <-- Set stroke width
         .style("pointer-events", "none");

      // Prepare Popup Content
      const stocks = d.leaves() as LeafNode[]; 
      let listHtml = `<h3 style="margin: 0 0 5px 0; padding-bottom: 3px; border-bottom: 1px solid #555;">${d.data.name}</h3><ul style="margin: 0; padding-left: 15px; list-style: none; max-height: 150px; overflow-y: auto;">`;
      stocks.sort((a, b) => (b.data.marketCap ?? 0) - (a.data.marketCap ?? 0))
            .slice(0, 10) // Limit to top 10 by market cap for brevity
            .forEach(stock => {
                const percentage = stock.data.changesPercentage ?? 0;
                const styleProps = getPercentageStyle(percentage); // Use existing style function
                const companyName = stock.data.name ? ` (${stock.data.name})` : ''; // Get company name if available
                listHtml += `<li style="margin-bottom: 3px; font-size: 0.9em;"><strong>${stock.data.symbol}${companyName}</strong>: <span style="color:${styleProps.color}; font-weight:${styleProps.fontWeight}; text-shadow:${styleProps.textShadow};">${formatPercentage(percentage)}</span></li>`;
            });
      if (stocks.length > 10) {
          listHtml += `<li style="margin-top: 5px; font-style: italic; font-size: 0.8em;">...and ${stocks.length - 10} more</li>`;
      }
      listHtml += "</ul>";

      // Show and Position Popup
      if (!sectorPopup.empty()) {
          sectorPopup.transition().duration(100).style("opacity", 0.95);
          sectorPopup.html(listHtml) 
                     .style("left", `${event.pageX + 20}px`)
                     .style("top", `${event.pageY - 15}px`);
      }
  }, [formatPercentage, getPercentageStyle]); // Dependencies: formatting and styling functions

  const sectorMouseoutHandler = useCallback(() => {
      if (!svgRef.current) {
           return; // Need svgRef here too
      }
      // Remove Highlight Rect
      d3.select(svgRef.current).select(".sector-highlight-overlay").remove();
      // Hide Popup
      d3.select<HTMLDivElement, unknown>("#sector-popup").transition().duration(200).style("opacity", 0);
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
            .style("font-size", "11px")
            .style("pointer-events", "none") // Must not block events
            .style("max-height", "300px") // Prevent excessive height
            .style("overflow-y", "auto") // Allow scrolling if list is long
            .style("z-index", "998"); // Slightly below tile tooltip if overlaps occur
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

    const treemapLayout = d3.treemap<TreeNodeData>()
        .size([svgWidth, svgHeight])
        .paddingTop(20)
        .paddingRight(2)
        .paddingBottom(2)
        .paddingLeft(2)
        .paddingInner(2)
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
        .attr("x", 1.5).attr("y", 1.5)
        .attr("width", d => Math.max(0, (d.x1 - d.x0) - 3))
        .attr("height", d => Math.max(0, (d.y1 - d.y0) - 3))
        .attr("fill", d => calculateColor(d.data.changesPercentage ?? 0))
        .attr("stroke", "none")
        .on("mouseover", function(event, d: LeafNode) {
            d3.select(this.parentNode as Element).select(".tile-border-rect")
              .attr("fill", "#ffffff"); 
            const percentage = d.data.changesPercentage ?? 0;
            const formattedPercentage = formatPercentage(percentage);
            const marketCapFormatted = d3.format(".3s")(d.data.marketCap ?? 0);
            const companyName = d.data.name ? ` (${d.data.name})` : ''; // Get company name if available
            const tooltipHtml = `<strong>${d.data.symbol}${companyName}</strong><br/><span>${formattedPercentage}</span><br/>Mkt Cap: ${marketCapFormatted}`;
            
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

    // --- Final Step: Render Sector Labels ON TOP --- 
    const sectors = root.descendants().filter(d => d.depth === 1);
    svg.selectAll('.sector-label')
        .data(sectors ?? [], d => (d as d3.HierarchyRectangularNode<TreeNodeData>).data.name)
        .join(
            enter => enter.append('text')
                .attr('class', 'sector-label')
                .style('fill', '#eee')
                .style('font-size', '12px').style('font-weight', '500')
                .attr('text-anchor', 'start')
                .attr('y', d => d.y0 + 15).attr('dx', 10)
                .style('pointer-events', 'all')
                .style('cursor', 'pointer')
                .on("mouseover", (event, d) => sectorMouseoverHandler(event, d))
                .on("mouseout", () => sectorMouseoutHandler()),
            update => update
                .style('fill', '#eee')
                .style('pointer-events', 'all')
                .style('cursor', 'pointer')
                .on("mouseover", (event, d) => sectorMouseoverHandler(event, d))
                .on("mouseout", () => sectorMouseoutHandler()),
            exit => exit.remove()
        )
        .attr('x', d => d.x0)
        .attr('y', d => d.y0 + 15)
        .attr('dx', 10)
        .text(d => d.data.name + ' >')
        .each(function(_d: d3.HierarchyRectangularNode<TreeNodeData>) { 
            const textElement = d3.select(this as SVGTextElement);
            const availableWidth = (_d.x1 - _d.x0) - 15;
            let textLength = (this as SVGTextElement).getComputedTextLength();
            let text = _d.data.name + ' >';
            if (textLength > availableWidth && availableWidth > 0) {
                let truncatedName = _d.data.name;
                const suffix = '... >';
                while (textLength > availableWidth && truncatedName.length > 0) {
                    truncatedName = truncatedName.slice(0, -1);
                    text = truncatedName + suffix;
                    textElement.text(text);
                    textLength = (this as SVGTextElement).getComputedTextLength();
                }
                if (truncatedName.length === 0 && textLength > availableWidth) {
                    textElement.text('');
                } else {
                     textElement.text(text);
                }
            } else if (availableWidth <= 0) {
                 textElement.text('');
            }
        });

  }, [stockData, dimensions, calculateColor, formatPercentage, calculateStrokeColor, getPercentageStyle, sectorMouseoverHandler, sectorMouseoutHandler]); // ADDED handlers back to dependencies

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
            height: '100%', // Fill outer div
            border: '0.5px solid #00cc00',
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
          
          {/* MOVED Description Area - now inline with header */}
          <div id="heatmap-description" style={{
                  margin: '0 20px', // Add some horizontal margin for spacing
                  color: '#999999',
                  fontSize: '10pt', 
                  textAlign: 'center', // Center text within its available space
                  flexGrow: 1 // Allow it to take up available middle space
                }}>
               <p style={{ margin: 0 }}>{INDEX_DESCRIPTIONS[activeIndex as keyof typeof INDEX_DESCRIPTIONS]}</p>
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