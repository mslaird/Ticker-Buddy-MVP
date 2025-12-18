import { useState } from 'react';
import { Ticker } from '@/hooks/useTickers';
import { Button } from '@/components/ui/button';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { Quote } from '@/hooks/useMarketData';

interface TickerCardProps {
  ticker: Ticker;
  quote?: Quote;
  isLoading?: boolean;
  lastUpdated?: Date | null;
  onEdit: (ticker: Ticker) => void;
  onDelete: (id: string) => void;
}

function getTimeAgo(date: Date | null | undefined): string {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export function TickerCard({ ticker, quote, isLoading, lastUpdated, onEdit, onDelete }: TickerCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const assetTypeStyles = {
    stock: 'bg-primary/10 text-primary',
    crypto: 'bg-amber-500/10 text-amber-500',
    etf: 'bg-emerald-500/10 text-emerald-500',
  };

  const hasData = quote !== undefined && quote.price !== null;
  const isUnavailable = quote?.quoteStatus === 'unavailable' || quote?.quoteStatus === 'source_unavailable' || quote?.price === null;
  const isSourceUnavailable = quote?.quoteStatus === 'source_unavailable';
  const isPositive = quote && quote.change !== null && !Number.isNaN(quote.change) ? quote.change > 0 : 
    (quote && quote.changePct !== null && !Number.isNaN(quote.changePct) ? quote.changePct > 0 : false);
  const isNegative = quote && quote.change !== null && !Number.isNaN(quote.change) ? quote.change < 0 : 
    (quote && quote.changePct !== null && !Number.isNaN(quote.changePct) ? quote.changePct < 0 : false);
  const isEquity = ticker.asset_type === 'stock' || ticker.asset_type === 'etf';
  const isDev = import.meta.env.DEV;

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
    <div
      className="glass-card p-4 flex items-center justify-between group transition-all hover:border-primary/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-foreground text-lg">
              {ticker.symbol}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${assetTypeStyles[ticker.asset_type]}`}>
              {ticker.asset_type}
            </span>
          </div>
          {ticker.display_name && (
            <span className="text-sm text-muted-foreground">{ticker.display_name}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          {isLoading && !hasData && !isUnavailable ? (
            <div className="space-y-1">
              <Skeleton className="h-5 w-20 ml-auto" />
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          ) : isUnavailable ? (
            <div className="text-right">
              <div className="font-mono text-muted-foreground">—</div>
              <div className="text-xs text-amber-500/80">
                {isSourceUnavailable ? 'Data source unavailable' : 'Quote unavailable'}
              </div>
            </div>
          ) : hasData ? (
            <>
              <div className="font-mono font-semibold text-foreground">
                ${formatPrice(quote?.price)}
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className={`text-sm font-mono ${
                  isPositive ? 'text-ticker-positive' : isNegative ? 'text-ticker-negative' : 'text-muted-foreground'
                }`}>
                  {formatChangePct(quote?.changePct)}
                </span>
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground">
                    {getTimeAgo(lastUpdated)}
                  </span>
                )}
              </div>
              {isDev && isEquity && quote && (
                <div className="text-[9px] text-muted-foreground/60 font-mono text-right">
                  state={quote.debugMarketState || '?'} open={quote.debugOpen ?? '?'} prev={quote.debugPrevClose ?? '?'} base={quote.debugBaseline ?? '?'}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground font-mono">—</div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem onClick={() => onEdit(ticker)} className="gap-2 cursor-pointer">
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(ticker.id)} 
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
