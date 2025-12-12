import { useState, useEffect } from 'react';
import { Ticker } from '@/hooks/useTickers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface AddTickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (symbol: string, assetType: 'stock' | 'crypto' | 'etf', displayName?: string) => Promise<{ error: Error | null }>;
  editingTicker?: Ticker | null;
  onUpdate?: (id: string, updates: Partial<Pick<Ticker, 'symbol' | 'asset_type' | 'display_name'>>) => Promise<{ error: Error | null }>;
}

export function AddTickerModal({ 
  open, 
  onOpenChange, 
  onSubmit, 
  editingTicker,
  onUpdate 
}: AddTickerModalProps) {
  const [symbol, setSymbol] = useState('');
  const [assetType, setAssetType] = useState<'stock' | 'crypto' | 'etf'>('stock');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!editingTicker;

  useEffect(() => {
    if (editingTicker) {
      setSymbol(editingTicker.symbol);
      setAssetType(editingTicker.asset_type);
      setDisplayName(editingTicker.display_name || '');
    } else {
      setSymbol('');
      setAssetType('stock');
      setDisplayName('');
    }
    setError('');
  }, [editingTicker, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!symbol.trim()) {
      setError('Symbol is required');
      return;
    }

    if (symbol.length > 10) {
      setError('Symbol must be 10 characters or less');
      return;
    }

    setLoading(true);

    try {
      if (isEditing && onUpdate) {
        const { error } = await onUpdate(editingTicker.id, {
          symbol: symbol.trim(),
          asset_type: assetType,
          display_name: displayName.trim() || null,
        });
        if (error) {
          setError('Failed to update ticker');
          setLoading(false);
          return;
        }
      } else {
        const { error } = await onSubmit(
          symbol.trim(),
          assetType,
          displayName.trim() || undefined
        );
        if (error) {
          setLoading(false);
          return;
        }
      }

      onOpenChange(false);
    } catch (err) {
      setError('An unexpected error occurred');
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {isEditing ? 'Edit Ticker' : 'Add Ticker'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="symbol" className="text-foreground">
              Symbol <span className="text-destructive">*</span>
            </Label>
            <Input
              id="symbol"
              placeholder="e.g., AAPL, BTC, SPY"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground font-mono"
              maxLength={10}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetType" className="text-foreground">Asset Type</Label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as 'stock' | 'crypto' | 'etf')}>
              <SelectTrigger className="bg-input border-border text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="etf">ETF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-foreground">
              Display Name <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="displayName"
              placeholder="e.g., Apple Inc."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              maxLength={50}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="electric"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Ticker'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
