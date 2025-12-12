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

interface TickerCardProps {
  ticker: Ticker;
  onEdit: (ticker: Ticker) => void;
  onDelete: (id: string) => void;
}

// Placeholder price data
const getPlaceholderData = (symbol: string) => {
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const price = (hash % 1000) + 50 + Math.random() * 100;
  const change = ((hash % 20) - 10) + Math.random() * 5;
  return {
    price: price.toFixed(2),
    change: change.toFixed(2),
    changePercent: ((change / price) * 100).toFixed(2),
    isPositive: change >= 0,
  };
};

export function TickerCard({ ticker, onEdit, onDelete }: TickerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const data = getPlaceholderData(ticker.symbol);

  const assetTypeStyles = {
    stock: 'bg-primary/10 text-primary',
    crypto: 'bg-amber-500/10 text-amber-500',
    etf: 'bg-emerald-500/10 text-emerald-500',
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
          <div className="font-mono font-semibold text-foreground">${data.price}</div>
          <div className={`text-sm font-mono ${data.isPositive ? 'text-ticker-positive' : 'text-ticker-negative'}`}>
            {data.isPositive ? '+' : ''}{data.change} ({data.isPositive ? '+' : ''}{data.changePercent}%)
          </div>
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
