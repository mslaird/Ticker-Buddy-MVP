import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, Lock, Crown, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Quote } from '@/hooks/useMarketData';
import { useNavigate } from 'react-router-dom';

interface Ticker {
  id: string;
  symbol: string;
  asset_type: string;
  display_name: string | null;
}

interface AssetDetailDrawerProps {
  ticker: Ticker | null;
  quote: Quote | undefined;
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
}

// Generate mock intraday chart data based on current price
function generateMockChartData(basePrice: number, symbol: string): number[] {
  const points: number[] = [];
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let price = basePrice * 0.98; // Start slightly lower
  
  for (let i = 0; i < 24; i++) {
    const variance = (Math.sin(seed + i * 0.5) * 0.01 + Math.cos(seed * 2 + i * 0.3) * 0.005) * basePrice;
    price = price + variance + (basePrice - price) * 0.05;
    points.push(price);
  }
  
  // Ensure last point is close to current price
  points[points.length - 1] = basePrice;
  return points;
}

// Simple SVG line chart
function MiniChart({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 60;
  const width = 200;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const strokeColor = isPositive ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))';
  const gradientId = isPositive ? 'chartGradientGreen' : 'chartGradientRed';
  
  return (
    <svg width={width} height={height} className="w-full">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BlurredMetric({ label, value, isPro }: { label: string; value: string; isPro: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
        <span className={`text-sm font-mono ${!isPro ? 'blur-sm select-none' : ''}`}>
          {value}
        </span>
      </div>
    </div>
  );
}

export function AssetDetailDrawer({ ticker, quote, isOpen, onClose, isPro }: AssetDetailDrawerProps) {
  const navigate = useNavigate();
  
  if (!ticker) return null;

  const isUnavailable = quote?.quoteStatus === 'unavailable' || quote?.quoteStatus === 'source_unavailable' || quote?.price === null;
  const isSourceUnavailable = quote?.quoteStatus === 'source_unavailable';

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

  const formatChange = (change: number | null | undefined) => {
    if (change === undefined || change === null) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getChangeColor = (value: number | null | undefined) => {
    if (value === undefined || value === null || value === 0) return 'text-muted-foreground';
    return value > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeIcon = (value: number | null | undefined) => {
    if (value === undefined || value === null || value === 0) return <Minus className="h-4 w-4" />;
    return value > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const assetTypeLabel: Record<string, string> = {
    stock: 'Stock',
    crypto: 'Crypto',
    etf: 'ETF',
  };

  const assetTypeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
    stock: 'default',
    crypto: 'secondary',
    etf: 'outline',
  };

  const currentPrice = quote?.price ?? 100;
  const chartData = generateMockChartData(currentPrice, ticker.symbol);
  const isPositive = (quote?.changePct ?? 0) >= 0;

  // Use real data from quote for Pro metrics
  const high52w = quote?.highRange ? formatLargeNumber(quote.highRange) : '—';
  const low52w = quote?.lowRange ? formatLargeNumber(quote.lowRange) : '—';
  const volume = quote?.volume24h ? formatLargeNumber(quote.volume24h) : '—';
  const marketCap = quote?.marketCap ? `$${formatLargeNumber(quote.marketCap)}` : '—';

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[380px] sm:w-[420px] glass-card border-border/50 bg-background/95 backdrop-blur-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-3">
            <span className="font-mono text-2xl text-foreground">{ticker.symbol}</span>
            <Badge variant={assetTypeVariant[ticker.asset_type] || 'default'}>
              {assetTypeLabel[ticker.asset_type] || ticker.asset_type}
            </Badge>
          </SheetTitle>
          {ticker.display_name && (
            <p className="text-sm text-muted-foreground">{ticker.display_name}</p>
          )}
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Unavailable Warning */}
          {isUnavailable && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm">
              {isSourceUnavailable 
                ? 'Data source temporarily unavailable. Prices will update when the connection is restored.'
                : 'Quote data unavailable for this symbol. It may be an invalid ticker or temporarily unavailable.'}
            </div>
          )}

          {/* Current Price */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Current Price</p>
              {!isUnavailable && (
                <Badge 
                  variant={quote?.isDelayed === false ? 'default' : 'secondary'} 
                  className="text-[10px] px-1.5 py-0"
                >
                  {quote?.isDelayed === false ? 'Live' : 'Delayed ~15 min'}
                </Badge>
              )}
            </div>
            <p className="text-4xl font-mono font-bold text-foreground">
              ${formatPrice(quote?.price)}
            </p>
            <div className={`flex items-center gap-2 ${getChangeColor(quote?.changePct)}`}>
              {getChangeIcon(quote?.changePct)}
              <span className="text-lg font-mono font-semibold">
                {formatChange(quote?.change)}
              </span>
              <span className="text-sm font-mono">
                ({formatPercent(quote?.changePct)})
              </span>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Intraday (Preview)</p>
            <div className="p-4 rounded-xl bg-background/40 border border-border/30">
              {quote?.price ? (
                <MiniChart data={chartData} isPositive={isPositive} />
              ) : (
                <Skeleton className="h-[60px] w-full" />
              )}
            </div>
          </div>

          {/* Free Metrics */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-background/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Price</p>
                <p className="text-lg font-mono font-semibold text-foreground">
                  ${formatPrice(quote?.price)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/40 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Day %</p>
                <p className={`text-lg font-mono font-semibold ${getChangeColor(quote?.changePct)}`}>
                  {formatPercent(quote?.changePct)}
                </p>
              </div>
            </div>
          </div>

          {/* Pro Metrics Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Advanced Metrics (Pro)
              </p>
            </div>
            <div className="p-4 rounded-xl bg-background/40 border border-border/30 space-y-1">
              <BlurredMetric 
                label={ticker.asset_type === 'crypto' ? 'High (Range)' : '52-Week High'} 
                value={high52w !== '—' ? `$${high52w}` : '—'} 
                isPro={isPro} 
              />
              <div className="border-t border-border/30" />
              <BlurredMetric 
                label={ticker.asset_type === 'crypto' ? 'Low (Range)' : '52-Week Low'} 
                value={low52w !== '—' ? `$${low52w}` : '—'} 
                isPro={isPro} 
              />
              <div className="border-t border-border/30" />
              <BlurredMetric 
                label={ticker.asset_type === 'crypto' ? '24h Volume' : 'Volume'} 
                value={volume !== '—' ? (ticker.asset_type === 'crypto' ? `$${volume}` : volume) : '—'} 
                isPro={isPro} 
              />
              <div className="border-t border-border/30" />
              <BlurredMetric 
                label="Market Cap" 
                value={marketCap} 
                isPro={isPro} 
              />
            </div>
          </div>

          {/* Upgrade CTA for Free Users */}
          {!isPro && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">Unlock advanced metrics</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Get deeper insight with Pro — track up to 5 tickers and view key market stats.
              </p>
              <Button 
                variant="electric" 
                className="w-full"
                onClick={() => {
                  onClose();
                  navigate('/upgrade');
                }}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
