import { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, CheckCircle2, AlertCircle, HelpCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AddTickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (symbol: string, assetType: 'stock' | 'crypto' | 'etf', displayName?: string) => Promise<{ error: Error | null }>;
  editingTicker?: Ticker | null;
  onUpdate?: (id: string, updates: Partial<Pick<Ticker, 'symbol' | 'asset_type' | 'display_name'>>) => Promise<{ error: Error | null }>;
}

interface ResolveResult {
  canonicalSymbol: string;
  detectedType: 'stock' | 'etf' | 'crypto';
  displayName: string | null;
  confidence: 'high' | 'medium' | 'low';
  sourceUsed: string;
}

// Normalize symbol: trim, uppercase, keep valid chars (A-Z, 0-9, dot, dash)
function normalizeSymbol(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, '');
}

// Validate symbol format locally
function validateSymbolFormat(symbol: string, assetType: string): { valid: boolean; reason?: string } {
  const trimmed = symbol.trim().toUpperCase();
  
  if (!trimmed) {
    return { valid: false, reason: 'Symbol is required' };
  }
  
  // Crypto can have various formats (1-10 chars)
  if (assetType === 'crypto') {
    if (!/^[A-Z0-9]{1,10}$/.test(trimmed)) {
      return { valid: false, reason: 'Invalid crypto symbol' };
    }
    return { valid: true };
  }
  
  // Stocks/ETFs: 1-5 letters only
  if (!/^[A-Z]{1,5}$/.test(trimmed)) {
    return { valid: false, reason: 'Stock/ETF symbols must be 1-5 letters (A-Z)' };
  }
  
  return { valid: true };
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
  
  // Auto-detection state
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<ResolveResult | null>(null);
  const [showTypeOverride, setShowTypeOverride] = useState(false);
  
  // Manual override tracking
  const [assetTypeManuallySet, setAssetTypeManuallySet] = useState(false);
  const [displayNameManuallySet, setDisplayNameManuallySet] = useState(false);
  
  // Track if display name was auto-filled (for UI indicator)
  const [displayNameAutoFilled, setDisplayNameAutoFilled] = useState(false);
  
  // Track previous symbol to detect significant changes
  const previousSymbolRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEditing = !!editingTicker;

  // Reset state when modal opens/closes or editing ticker changes
  useEffect(() => {
    if (open) {
      if (editingTicker) {
        setSymbol(editingTicker.symbol);
        setAssetType(editingTicker.asset_type);
        setDisplayName(editingTicker.display_name || '');
        previousSymbolRef.current = editingTicker.symbol;
        // Start with overrides as false - will be set to true if user changes them
        setAssetTypeManuallySet(false);
        setDisplayNameManuallySet(false);
        setDisplayNameAutoFilled(false);
        setDetection(null);
        setShowTypeOverride(true);
      } else {
        setSymbol('');
        setAssetType('stock');
        setDisplayName('');
        previousSymbolRef.current = '';
        setAssetTypeManuallySet(false);
        setDisplayNameManuallySet(false);
        setDisplayNameAutoFilled(false);
        setDetection(null);
        setShowTypeOverride(false);
      }
      setError('');
      setDetecting(false);
    }
  }, [editingTicker, open]);

  // Debounced symbol resolution
  const resolveSymbol = useCallback(async (symbolToResolve: string) => {
    const normalized = normalizeSymbol(symbolToResolve);
    
    // Clear detection if symbol is empty
    if (normalized.length < 1) {
      setDetection(null);
      setDetecting(false);
      return;
    }
    
    setDetecting(true);
    
    try {
      const { data, error: resolveError } = await supabase.functions.invoke('market-data', {
        body: { action: 'resolve', symbol: normalized },
      });
      
      if (resolveError) {
        console.warn('[AddTickerModal] Symbol resolution failed:', resolveError);
        setDetection(null);
      } else if (data) {
        const result = data as ResolveResult;
        setDetection(result);
        
        // Auto-apply asset type if not manually set AND confidence is medium or high
        if (!assetTypeManuallySet && (result.confidence === 'high' || result.confidence === 'medium')) {
          setAssetType(result.detectedType);
        }
        
        // Auto-apply display name if not manually set
        if (!displayNameManuallySet) {
          // Always update display name when symbol changes - either to detected name or empty
          const newName = result.displayName || '';
          setDisplayName(newName);
          // Track that name was auto-filled (only if we got a name)
          setDisplayNameAutoFilled(!!newName);
          
          if (process.env.NODE_ENV === 'development' && result.displayName) {
            console.log(`[AddTickerModal] Auto-filled displayName: "${result.displayName}", source: ${result.sourceUsed}`);
          }
        }
        
        // Show override dropdown if low confidence
        if (result.confidence === 'low') {
          setShowTypeOverride(true);
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[AddTickerModal] Resolved:', result);
        }
      }
    } catch (err) {
      console.warn('[AddTickerModal] Symbol resolution error:', err);
      setDetection(null);
    } finally {
      setDetecting(false);
    }
  }, [assetTypeManuallySet, displayNameManuallySet]);

  // Handle symbol input change with debounce
  const handleSymbolChange = (value: string) => {
    const normalized = normalizeSymbol(value);
    
    // Check if symbol changed significantly (different symbol entirely)
    const previousNormalized = normalizeSymbol(previousSymbolRef.current);
    const symbolChangedSignificantly = previousNormalized !== normalized && previousNormalized.length > 0 && normalized.length > 0;
    
    // Reset manual override flags when symbol changes to a different symbol
    if (symbolChangedSignificantly) {
      setAssetTypeManuallySet(false);
      setDisplayNameManuallySet(false);
      setDisplayNameAutoFilled(false);
      // Clear display name immediately when switching symbols (will be set by detection)
      setDisplayName('');
    }
    
    setSymbol(normalized);
    previousSymbolRef.current = normalized;
    setError('');
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Clear detection while typing
    setDetection(null);
    
    // Debounce resolution (300ms for responsive feel)
    debounceRef.current = setTimeout(() => {
      resolveSymbol(normalized);
    }, 300);
  };

  // Handle manual asset type override
  const handleAssetTypeChange = (value: 'stock' | 'crypto' | 'etf') => {
    setAssetType(value);
    setAssetTypeManuallySet(true);
  };

  // Handle manual display name change
  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setDisplayNameManuallySet(true);
    setDisplayNameAutoFilled(false); // User edited, so no longer auto-filled
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedSymbol = normalizeSymbol(symbol);
    
    // Local format validation
    const formatCheck = validateSymbolFormat(trimmedSymbol, assetType);
    if (!formatCheck.valid) {
      setError(formatCheck.reason || 'Invalid symbol');
      return;
    }

    setLoading(true);
    
    // For stocks/ETFs, validate symbol exists via edge function
    if (assetType === 'stock' || assetType === 'etf') {
      try {
        const { data, error: validateError } = await supabase.functions.invoke('market-data', {
          body: { action: 'validate', symbol: trimmedSymbol, assetType },
        });
        
        if (validateError) {
          // If validation fails due to network, allow submission with warning
          console.warn('Symbol validation failed:', validateError);
          setError('Quote source temporarily unavailable — symbol will be verified on next refresh');
          // Allow to continue after brief delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          setError('');
        } else if (data && !data.valid) {
          setError(data.reason || 'Symbol not found');
          setLoading(false);
          return;
        } else if (data?.reason) {
          // Valid but with warning (e.g., couldn't verify)
          console.warn('Symbol validation warning:', data.reason);
        }
      } catch (err) {
        // Network error - show warning but allow submission
        console.warn('Symbol validation network error:', err);
        setError('Quote source temporarily unavailable — trying anyway...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        setError('');
      }
    }

    try {
      if (isEditing && onUpdate) {
        const { error } = await onUpdate(editingTicker.id, {
          symbol: trimmedSymbol,
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
          trimmedSymbol,
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

  // Detection status display
  const renderDetectionStatus = () => {
    if (detecting) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Detecting asset type...</span>
        </div>
      );
    }
    
    if (!detection || !symbol.trim()) {
      return null;
    }
    
    const typeLabels: Record<string, string> = {
      stock: 'Stock',
      etf: 'ETF',
      crypto: 'Crypto',
    };
    
    const confidenceConfig = {
      high: {
        icon: CheckCircle2,
        color: 'text-green-500',
        label: 'High confidence',
      },
      medium: {
        icon: HelpCircle,
        color: 'text-yellow-500',
        label: 'Medium confidence',
      },
      low: {
        icon: AlertCircle,
        color: 'text-orange-500',
        label: 'Low confidence — choose manually',
      },
    };
    
    const config = confidenceConfig[detection.confidence];
    const Icon = config.icon;
    
    return (
      <div className={`flex items-center gap-2 text-xs mt-1.5 ${config.color}`}>
        <Icon className="h-3 w-3" />
        <span>
          Detected: <span className="font-medium">{typeLabels[detection.detectedType]}</span>
          {' '}({config.label})
        </span>
      </div>
    );
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
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground font-mono"
              maxLength={10}
              required
            />
            {renderDetectionStatus()}
          </div>

          <Collapsible 
            open={showTypeOverride || isEditing} 
            onOpenChange={setShowTypeOverride}
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-0 h-auto py-1"
              >
                <ChevronDown className={`h-3 w-3 transition-transform ${showTypeOverride || isEditing ? 'rotate-180' : ''}`} />
                {showTypeOverride || isEditing ? 'Hide asset type' : 'Override asset type'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              <Label htmlFor="assetType" className="text-foreground">Asset Type</Label>
              <Select value={assetType} onValueChange={handleAssetTypeChange}>
                <SelectTrigger className="bg-input border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="displayName" className="text-foreground">
                Display Name <span className="text-muted-foreground text-sm">(optional)</span>
              </Label>
              {/* Auto-filled indicator */}
              {displayNameAutoFilled && displayName && (
                <span className="inline-flex items-center gap-1 text-xs text-green-500">
                  <Sparkles className="h-3 w-3" />
                  Auto-filled
                </span>
              )}
            </div>
            <Input
              id="displayName"
              placeholder="e.g., Apple Inc."
              value={displayName}
              onChange={(e) => handleDisplayNameChange(e.target.value)}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              maxLength={50}
            />
            {/* Show helper text when detection ran but no name was found */}
            {detection && !detecting && !displayName && !displayNameManuallySet && symbol.trim() && (
              <p className="text-xs text-muted-foreground mt-1">
                Name unavailable (optional). You can leave blank or type your own.
              </p>
            )}
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
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking...
                </>
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
