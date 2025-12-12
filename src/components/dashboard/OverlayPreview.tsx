import { Ticker } from '@/hooks/useTickers';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface OverlayPreviewProps {
  tickers: Ticker[];
}

const getPlaceholderData = (symbol: string) => {
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const price = (hash % 1000) + 50 + Math.random() * 100;
  const change = ((hash % 20) - 10) + Math.random() * 5;
  return {
    price: price.toFixed(2),
    changePercent: ((change / price) * 100).toFixed(2),
    isPositive: change > 0,
    isNegative: change < 0,
  };
};

export function OverlayPreview({ tickers }: OverlayPreviewProps) {
  if (tickers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Add tickers to see preview
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tickers.slice(0, 5).map((ticker) => {
        const data = getPlaceholderData(ticker.symbol);
        
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
              <span className="font-mono text-sm text-foreground">
                ${data.price}
              </span>
              <div className={`flex items-center gap-0.5 text-xs font-mono ${
                data.isPositive 
                  ? 'text-ticker-positive' 
                  : data.isNegative 
                    ? 'text-ticker-negative' 
                    : 'text-ticker-neutral'
              }`}>
                {data.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : data.isNegative ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <Minus className="h-3 w-3" />
                )}
                <span>{data.isPositive ? '+' : ''}{data.changePercent}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
