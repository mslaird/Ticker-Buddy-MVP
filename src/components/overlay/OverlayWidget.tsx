import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AssetDetailDrawer } from './AssetDetailDrawer';
import type { Quote } from '@/hooks/useMarketData';

interface Ticker {
  id: string;
  symbol: string;
  asset_type: string;
  display_name: string | null;
}

interface OverlaySettings {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  size: 'small' | 'medium' | 'large';
  compactMode: boolean;
  refreshInterval: number;
  pinned: boolean;
}

interface OverlayWidgetProps {
  tickers: Ticker[];
  quotes: Record<string, Quote>;
  isLoading: boolean;
  settings: OverlaySettings;
  isPro?: boolean;
}

const positionClasses: Record<OverlaySettings['position'], string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

const sizeClasses: Record<OverlaySettings['size'], { 
  container: string; 
  text: string; 
  textCompact: string; 
  rowPadding: string; 
  rowPaddingCompact: string;
  containerPadding: string;
  containerPaddingCompact: string;
  rowGap: string;
  rowGapCompact: string;
  metaMargin: string;
  gridCols: string;
}> = {
  small: { 
    container: 'w-56', 
    text: 'text-xs', 
    textCompact: 'text-[10px]', 
    rowPadding: 'px-2 py-1.5', 
    rowPaddingCompact: 'px-2 py-0.5',
    containerPadding: 'p-3',
    containerPaddingCompact: 'p-2',
    rowGap: 'gap-1.5',
    rowGapCompact: 'gap-0.5',
    metaMargin: 'mt-1.5',
    gridCols: '52px 1fr 80px',
  },
  medium: { 
    container: 'w-64', 
    text: 'text-sm', 
    textCompact: 'text-xs', 
    rowPadding: 'px-2.5 py-2', 
    rowPaddingCompact: 'px-2.5 py-1',
    containerPadding: 'p-4',
    containerPaddingCompact: 'p-2.5',
    rowGap: 'gap-2',
    rowGapCompact: 'gap-1',
    metaMargin: 'mt-2',
    gridCols: '56px 1fr 88px',
  },
  large: { 
    container: 'w-80', 
    text: 'text-base', 
    textCompact: 'text-sm', 
    rowPadding: 'px-3 py-2.5', 
    rowPaddingCompact: 'px-3 py-1.5',
    containerPadding: 'p-5',
    containerPaddingCompact: 'p-3',
    rowGap: 'gap-2.5',
    rowGapCompact: 'gap-1.5',
    metaMargin: 'mt-2.5',
    gridCols: '60px 1fr 96px',
  },
};

export function OverlayWidget({ tickers, quotes, isLoading, settings, isPro = false }: OverlayWidgetProps) {
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  
  if (!settings.pinned) return null;

  const sizeConfig = sizeClasses[settings.size];
  const isCompact = settings.compactMode;
  const textSize = isCompact ? sizeConfig.textCompact : sizeConfig.text;
  const containerPadding = isCompact ? sizeConfig.containerPaddingCompact : sizeConfig.containerPadding;
  const rowPadding = isCompact ? sizeConfig.rowPaddingCompact : sizeConfig.rowPadding;
  const rowGap = isCompact ? sizeConfig.rowGapCompact : sizeConfig.rowGap;

  const formatPrice = (price: number | null | undefined) => {
    if (price === undefined || price === null) return '—';
    return price >= 1000 ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : price.toFixed(2);
  };

  const formatPercent = (pct: number | null | undefined) => {
    if (pct === undefined || pct === null) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const getChangeColor = (quote: Quote | undefined) => {
    // Use change sign if available, else changePct
    const value = quote?.change ?? quote?.changePct;
    if (value === undefined || value === null || value === 0) return 'text-muted-foreground';
    return value > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeIcon = (quote: Quote | undefined) => {
    const value = quote?.change ?? quote?.changePct;
    if (value === undefined || value === null || value === 0) return <Minus className="h-3 w-3" />;
    return value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const isQuoteUnavailable = (quote: Quote | undefined) => {
    return quote?.quoteStatus === 'unavailable' || quote?.quoteStatus === 'source_unavailable' || quote?.price === null;
  };

  const isSourceUnavailable = (quote: Quote | undefined) => {
    return quote?.quoteStatus === 'source_unavailable';
  };

  return (
    <>
      <div
        className={`fixed ${positionClasses[settings.position]} ${sizeConfig.container} z-50 transition-all duration-300`}
        style={{ opacity: settings.opacity / 100 }}
      >
        <div className="glass-card rounded-xl shadow-glow border border-border/50 backdrop-blur-xl overflow-hidden">
          <div className={containerPadding}>
            <div className={`flex items-center gap-2 ${isCompact ? 'mb-1.5 pb-1.5' : 'mb-3 pb-2'} border-b border-border/50`}>
              <div className={`${isCompact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-primary animate-pulse`} />
              <span className={`${textSize} text-muted-foreground font-medium tracking-wide`}>
                TICKER BUDDY
              </span>
            </div>
            
            <div className={`flex flex-col ${rowGap}`}>
              {tickers.length === 0 ? (
                <p className={`${textSize} text-muted-foreground text-center py-2`}>
                  No tickers added
                </p>
              ) : (
                tickers.map((ticker) => {
                  const quote = quotes[ticker.symbol];
                  const hasData = quote && quote.price !== undefined && quote.price !== null;
                  const unavailable = isQuoteUnavailable(quote);
                  
                  // Metadata font size based on size
                  const metaSize = settings.size === 'small' ? 'text-[9px]' : settings.size === 'medium' ? 'text-[10px]' : 'text-[11px]';
                  
                    return (
                      <button
                        key={ticker.id}
                        onClick={() => setSelectedTicker(ticker)}
                        className={`w-full flex flex-col ${rowPadding} rounded-lg bg-background/40 hover:bg-background/60 transition-colors cursor-pointer`}
                      >
                        {/* 3-column grid: ticker (fixed) | price (flex) | % (fixed) */}
                        <div 
                          className="grid items-center w-full gap-0" 
                          style={{ gridTemplateColumns: sizeConfig.gridCols }}
                        >
                          {/* Column 1: Ticker symbol - fixed width */}
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span 
                                  className={`${textSize} font-mono font-semibold text-foreground leading-tight truncate`}
                                  style={{ fontVariantNumeric: 'tabular-nums' }}
                                >
                                  {ticker.symbol}
                                </span>
                              </TooltipTrigger>
                              {ticker.symbol.length > 6 && (
                                <TooltipContent side="top" className="text-xs">
                                  {ticker.symbol}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Column 2: Price - flexible, right-aligned */}
                          <div className="flex items-center justify-end">
                            {isLoading && !hasData && !unavailable ? (
                              <Skeleton className={isCompact ? 'h-3 w-12' : 'h-4 w-14'} />
                            ) : unavailable ? (
                              <span className={`${textSize} font-mono text-muted-foreground`} style={{ fontVariantNumeric: 'tabular-nums' }}>—</span>
                            ) : (
                              <span className={`${textSize} font-mono text-foreground`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                ${formatPrice(quote?.price)}
                              </span>
                            )}
                          </div>
                          
                          {/* Column 3: Percentage - fixed width, right-aligned */}
                          <div className="flex items-center justify-end pl-2">
                            {!isLoading || hasData ? (
                              !unavailable && hasData ? (
                                <span 
                                  className={`${textSize} font-mono flex items-center gap-0.5 ${getChangeColor(quote)}`}
                                  style={{ fontVariantNumeric: 'tabular-nums' }}
                                >
                                  {getChangeIcon(quote)}
                                  {formatPercent(quote?.changePct)}
                                </span>
                              ) : null
                            ) : null}
                          </div>
                        </div>
                        
                        {/* Metadata line: own row below, right-aligned, only when not compact */}
                        {!isCompact && (
                          <div className={`flex items-center justify-end gap-1 w-full ${sizeConfig.metaMargin}`}>
                            {unavailable ? (
                              <span className={`${metaSize} text-amber-500/80`}>
                                {isSourceUnavailable(quote) ? 'Source down' : 'Quote unavailable'}
                              </span>
                            ) : hasData ? (
                              <>
                                <span className={`${metaSize} text-muted-foreground/70`}>
                                  {quote?.isDelayed === false ? 'Live' : 'Delayed ~15 min'}
                                </span>
                                <TooltipProvider delayDuration={0}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span 
                                        className="text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Info className={settings.size === 'small' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[180px] text-[10px]">
                                      {ticker.asset_type === 'crypto' 
                                        ? 'Live crypto quote.' 
                                        : 'Delayed quote. % change from Yahoo Finance data.'}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <AssetDetailDrawer
        ticker={selectedTicker}
        quote={selectedTicker ? quotes[selectedTicker.symbol] : undefined}
        isOpen={!!selectedTicker}
        onClose={() => setSelectedTicker(null)}
        isPro={isPro}
      />
    </>
  );
}
