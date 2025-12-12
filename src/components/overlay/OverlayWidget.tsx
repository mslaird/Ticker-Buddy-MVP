import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
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
}

const positionClasses: Record<OverlaySettings['position'], string> = {
  'top-left': 'top-4 left-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
};

const sizeClasses: Record<OverlaySettings['size'], { container: string; text: string; padding: string }> = {
  small: { container: 'w-48', text: 'text-xs', padding: 'p-2' },
  medium: { container: 'w-64', text: 'text-sm', padding: 'p-3' },
  large: { container: 'w-80', text: 'text-base', padding: 'p-4' },
};

export function OverlayWidget({ tickers, quotes, isLoading, settings }: OverlayWidgetProps) {
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  
  if (!settings.pinned) return null;

  const sizeConfig = sizeClasses[settings.size];

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return '—';
    return price >= 1000 ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
      : price.toFixed(2);
  };

  const formatPercent = (pct: number | undefined) => {
    if (pct === undefined) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const formatChange = (change: number | undefined) => {
    if (change === undefined) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const getChangeColor = (value: number | undefined) => {
    if (value === undefined || value === 0) return 'text-muted-foreground';
    return value > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeIcon = (value: number | undefined) => {
    if (value === undefined || value === 0) return <Minus className="h-3 w-3" />;
    return value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  return (
    <>
      <div
        className={`fixed ${positionClasses[settings.position]} ${sizeConfig.container} z-50 transition-all duration-300`}
        style={{ opacity: settings.opacity / 100 }}
      >
        <div className="glass-card rounded-xl shadow-glow border border-border/50 backdrop-blur-xl overflow-hidden">
          <div className={`${sizeConfig.padding}`}>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className={`${sizeConfig.text} text-muted-foreground font-medium tracking-wide`}>
                TICKER BUDDY
              </span>
            </div>
            
            <div className="space-y-1.5">
              {tickers.length === 0 ? (
                <p className={`${sizeConfig.text} text-muted-foreground text-center py-2`}>
                  No tickers added
                </p>
              ) : (
                tickers.map((ticker) => {
                  const quote = quotes[ticker.symbol];
                  const hasData = quote && quote.price !== undefined;
                  
                  return (
                    <button
                      key={ticker.id}
                      onClick={() => setSelectedTicker(ticker)}
                      className={`w-full flex items-center justify-between ${sizeConfig.padding} rounded-lg bg-background/40 hover:bg-background/60 transition-colors cursor-pointer`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`${sizeConfig.text} font-mono font-semibold text-foreground`}>
                          {ticker.symbol}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isLoading && !hasData ? (
                          <Skeleton className="h-4 w-16" />
                        ) : (
                          <>
                            <span className={`${sizeConfig.text} font-mono text-foreground`}>
                              ${formatPrice(quote?.price)}
                            </span>
                            <span className={`${sizeConfig.text} font-mono flex items-center gap-1 ${getChangeColor(quote?.changePct)}`}>
                              {getChangeIcon(quote?.changePct)}
                              {formatPercent(quote?.changePct)}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedTicker} onOpenChange={() => setSelectedTicker(null)}>
        <DialogContent className="sm:max-w-md glass-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-xl">{selectedTicker?.symbol}</span>
              {selectedTicker?.display_name && (
                <span className="text-sm text-muted-foreground font-normal">
                  {selectedTicker.display_name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicker && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-background/40">
                  <p className="text-xs text-muted-foreground mb-1">Price</p>
                  <p className="text-2xl font-mono font-semibold">
                    ${formatPrice(quotes[selectedTicker.symbol]?.price)}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg bg-background/40">
                  <p className="text-xs text-muted-foreground mb-1">Change</p>
                  <div className={`flex items-center gap-2 ${getChangeColor(quotes[selectedTicker.symbol]?.changePct)}`}>
                    {getChangeIcon(quotes[selectedTicker.symbol]?.changePct)}
                    <span className="text-xl font-mono font-semibold">
                      {formatChange(quotes[selectedTicker.symbol]?.change)}
                    </span>
                    <span className="text-sm font-mono">
                      ({formatPercent(quotes[selectedTicker.symbol]?.changePct)})
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-center">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
