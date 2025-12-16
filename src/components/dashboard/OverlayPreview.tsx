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

  return (
    <div className="space-y-1.5">
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
            className="ticker-widget flex items-center justify-between gap-4 animate-slide-in"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-medium text-foreground text-sm truncate">
                {ticker.symbol}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {isLoading && !hasData && !isUnavailable ? (
                <>
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-14" />
                </>
              ) : isUnavailable ? (
                <span className="font-mono text-xs text-amber-500/80">
                  {isSourceUnavailable ? 'Source down' : 'Unavailable'}
                </span>
              ) : hasData ? (
                <>
                  <span className="font-mono text-sm text-foreground">
                    ${formatPrice(quote?.price)}
                  </span>
                  <div className={`flex items-center gap-0.5 text-xs font-mono ${
                    isPositive 
                      ? 'text-ticker-positive' 
                      : isNegative 
                        ? 'text-ticker-negative' 
                        : 'text-ticker-neutral'
                  }`}>
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : isNegative ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    <span>{formatChangePct(quote?.changePct)}</span>
                  </div>
                </>
              ) : (
                <span className="font-mono text-sm text-muted-foreground">—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
