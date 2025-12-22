// ============================================================================
// STABLE BASELINE — DO NOT MODIFY WITHOUT REVIEW
// ============================================================================
// This component shares layout logic with OverlayWidget.tsx.
// See CHECKPOINTS.md and src/components/overlay/README.md for layout rules.
// ============================================================================

import { Ticker } from '@/hooks/useTickers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Quote } from '@/hooks/useMarketData';

interface OverlayPreviewProps {
  tickers: Ticker[];
  quotes: Record<string, Quote>;
  isLoading?: boolean;
}

export function OverlayPreview({ tickers, quotes, isLoading }: OverlayPreviewProps) {
  if (tickers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Add tickers to see preview
      </div>
    );
  }

  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined) return '—';
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChangePct = (pct: number | null | undefined) => {
    if (pct === null || pct === undefined) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  // 3-column grid for consistent alignment
  const GRID_COLS = 'minmax(56px, 72px) minmax(60px, 1fr) 88px';

  return (
    <div className="space-y-1.5 pr-3 overflow-hidden">
      {tickers.slice(0, 5).map((ticker) => {
        const quote = quotes[ticker.symbol];
        const hasData = quote !== undefined && quote.price !== null;
        const isUnavailable = quote?.quoteStatus === 'unavailable' || quote?.quoteStatus === 'source_unavailable' || quote?.price === null;
        const isSourceUnavailable = quote?.quoteStatus === 'source_unavailable';
        const isPositive = quote && quote.changePct !== null ? quote.changePct > 0 : false;
        const isNegative = quote && quote.changePct !== null ? quote.changePct < 0 : false;
        
        return (
          <div
            key={ticker.id}
            className="ticker-widget grid items-center animate-slide-in"
            style={{ gridTemplateColumns: GRID_COLS, gap: '10px' }}
          >
            {/* Column 1: Symbol - left-aligned */}
            <span className="font-mono font-medium text-foreground text-sm truncate text-left">
              {ticker.symbol}
            </span>
            
            {/* Column 2: Price - right-aligned with overflow handling */}
            <div className="flex items-center justify-end min-w-0">
              {isLoading && !hasData && !isUnavailable ? (
                <Skeleton className="h-4 w-12" />
              ) : isUnavailable ? (
                <span className="font-mono text-xs text-amber-500/80 truncate">
                  {isSourceUnavailable ? 'Source down' : 'Unavailable'}
                </span>
              ) : hasData ? (
                <span className="font-mono text-sm text-foreground truncate" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  ${formatPrice(quote?.price)}
                </span>
              ) : (
                <span className="font-mono text-sm text-muted-foreground">—</span>
              )}
            </div>
            
            {/* Column 3: % change - right-aligned */}
            <div className="flex items-center justify-end">
              {isLoading && !hasData && !isUnavailable ? (
                <Skeleton className="h-4 w-14" />
              ) : hasData && !isUnavailable ? (
                <div 
                  className={`flex items-center gap-0.5 text-xs font-mono ${
                    isPositive 
                      ? 'text-ticker-positive' 
                      : isNegative 
                        ? 'text-ticker-negative' 
                        : 'text-ticker-neutral'
                  }`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : isNegative ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  <span>{formatChangePct(quote?.changePct)}</span>
                </div>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
