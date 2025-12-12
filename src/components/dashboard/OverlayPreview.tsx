import { Ticker } from '@/hooks/useTickers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

interface OverlayPreviewProps {
  tickers: Ticker[];
  quotes: Record<string, Quote>;
  isLoading?: boolean;
}

const assetTypeLabels: Record<string, string> = {
  stock: 'Stock',
  crypto: 'Crypto',
  etf: 'ETF',
};

export function OverlayPreview({ tickers, quotes, isLoading }: OverlayPreviewProps) {
  if (tickers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Add a ticker to see your overlay preview.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tickers.slice(0, 5).map((ticker) => {
        const quote = quotes[ticker.symbol];
        const hasData = quote !== undefined;
        const isPositive = quote ? quote.changePct > 0 : false;
        const isNegative = quote ? quote.changePct < 0 : false;
        
        return (
          <div
            key={ticker.id}
            className="ticker-widget flex items-center justify-between gap-3 animate-slide-in"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono font-semibold text-foreground text-sm truncate">
                {ticker.symbol}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium text-muted-foreground bg-muted/50">
                {assetTypeLabels[ticker.asset_type] || ticker.asset_type}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {isLoading && !hasData ? (
                <>
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-14" />
                </>
              ) : hasData ? (
                <>
                  <span className="font-mono text-sm text-foreground">
                    ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    <span>{isPositive ? '+' : ''}{quote.changePct.toFixed(2)}%</span>
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
