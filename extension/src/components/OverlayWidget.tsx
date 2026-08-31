/**
 * OverlayWidget Component (Extension Version)
 *
 * Simplified version for Chrome extension.
 * Displays ticker overlay without AssetDetailDrawer (opens web app for details).
 */

import { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, ExternalLink, X, GripVertical } from 'lucide-react';

interface Ticker {
  id: string;
  symbol: string;
  asset_type: string;
  display_name: string | null;
}

interface Quote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  isDelayed?: boolean;
  quoteStatus?: 'ok' | 'unavailable' | 'source_unavailable';
}

interface OverlaySettings {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
  opacity: number;
  size: 'small' | 'medium' | 'large';
  compactMode: boolean;
  refreshInterval: number;
  pinned: boolean;
  customPosition?: { x: number; y: number };
  hidden?: boolean;
  autoHideOnScroll?: boolean;
}

interface OverlayWidgetProps {
  tickers: Ticker[];
  quotes: Record<string, Quote>;
  isLoading: boolean;
  settings: OverlaySettings;
  isPro?: boolean;
  onHide?: () => void;
}

const positionClasses: Record<Exclude<OverlaySettings['position'], 'custom'>, string> = {
  'top-left': 'top-6 left-6',
  'top-right': 'top-6 right-6',
  'bottom-left': 'bottom-6 left-6',
  'bottom-right': 'bottom-6 right-6',
};

const GRID_COLS_COMPACT = '52px minmax(48px, 1fr) 80px';
const GRID_COLS_NON_COMPACT: Record<OverlaySettings['size'], string> = {
  small: 'minmax(56px, 72px) minmax(60px, 1fr) 88px',
  medium: 'minmax(60px, 80px) minmax(64px, 1fr) 96px',
  large: 'minmax(64px, 88px) minmax(72px, 1fr) 108px',
};

const sizeClasses: Record<OverlaySettings['size'], {
  container: string;
  text: string;
  textCompact: string;
  rowPaddingY: string;
  rowPaddingYCompact: string;
  containerPadding: string;
  containerPaddingCompact: string;
  rowGap: string;
  rowGapCompact: string;
  metaMargin: string;
}> = {
  small: {
    container: 'w-64',
    text: 'text-xs',
    textCompact: 'text-[10px]',
    rowPaddingY: 'py-1.5',
    rowPaddingYCompact: 'py-0.5',
    containerPadding: 'p-3 pr-4',
    containerPaddingCompact: 'p-2',
    rowGap: 'gap-1.5',
    rowGapCompact: 'gap-0.5',
    metaMargin: 'mt-1',
  },
  medium: {
    container: 'w-72',
    text: 'text-sm',
    textCompact: 'text-xs',
    rowPaddingY: 'py-2',
    rowPaddingYCompact: 'py-1',
    containerPadding: 'p-4 pr-5',
    containerPaddingCompact: 'p-2.5',
    rowGap: 'gap-2',
    rowGapCompact: 'gap-1',
    metaMargin: 'mt-1.5',
  },
  large: {
    container: 'w-80',
    text: 'text-base',
    textCompact: 'text-sm',
    rowPaddingY: 'py-2.5',
    rowPaddingYCompact: 'py-1.5',
    containerPadding: 'p-5 pr-6',
    containerPaddingCompact: 'p-3',
    rowGap: 'gap-2.5',
    rowGapCompact: 'gap-1.5',
    metaMargin: 'mt-2',
  },
};

export function OverlayWidget({ tickers, quotes, isLoading, settings, onHide }: OverlayWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(settings.customPosition || { x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 });
  const currentPositionRef = useRef(settings.customPosition || { x: 0, y: 0 });
  const lastScrollY = useRef(0);
  const hideTimeoutRef = useRef<number | null>(null);

  // Sync position when settings change
  useEffect(() => {
    if (settings.customPosition) {
      currentPositionRef.current = settings.customPosition;
      setPosition(settings.customPosition);
    }
  }, [settings.customPosition]);

  // Auto-hide on scroll
  useEffect(() => {
    if (!settings.autoHideOnScroll) return;

    const handleScroll = () => {
      setIsVisible(false);

      // Show again after scrolling stops
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 1000);

      lastScrollY.current = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [settings.autoHideOnScroll]);

  // Drag and drop handlers with optimized performance
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!dragRef.current) return;

    setIsDragging(true);
    const rect = dragRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: rect.left,
      elementY: rect.top,
    };

    // Auto-switch to custom position mode on drag
    if (settings.position !== 'custom') {
      chrome.runtime.sendMessage({
        type: 'UPDATE_OVERLAY_SETTINGS',
        settings: { position: 'custom' },
      });
    }

    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!isDragging) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        if (!dragRef.current) return;

        const deltaX = e.clientX - dragStartRef.current.x;
        const deltaY = e.clientY - dragStartRef.current.y;

        const newX = dragStartRef.current.elementX + deltaX;
        const newY = dragStartRef.current.elementY + deltaY;

        // Update position ref and DOM directly (no re-render)
        currentPositionRef.current = { x: newX, y: newY };
        dragRef.current.style.left = `${newX}px`;
        dragRef.current.style.top = `${newY}px`;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rafId) cancelAnimationFrame(rafId);

      // Update state and save position
      const finalPosition = currentPositionRef.current;
      setPosition(finalPosition);

      chrome.runtime.sendMessage({
        type: 'UPDATE_CUSTOM_POSITION',
        position: finalPosition,
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isDragging]);

  if (!settings.pinned) {
    return null;
  }

  // Auto-hide on scroll
  if (settings.autoHideOnScroll && !isVisible) {
    return null;
  }

  const sizeConfig = sizeClasses[settings.size];
  const isCompact = settings.compactMode;
  const textSize = isCompact ? sizeConfig.textCompact : sizeConfig.text;
  const containerPadding = isCompact ? sizeConfig.containerPaddingCompact : sizeConfig.containerPadding;
  const rowPaddingY = isCompact ? sizeConfig.rowPaddingYCompact : sizeConfig.rowPaddingY;
  const rowGap = isCompact ? sizeConfig.rowGapCompact : sizeConfig.rowGap;

  const formatPrice = (price: number | null | undefined) => {
    if (price === undefined || price === null) return '—';
    return price >= 1000
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2);
  };

  const formatPercent = (pct: number | null | undefined) => {
    if (pct === undefined || pct === null) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const getChangeColor = (quote: Quote | undefined) => {
    const value = quote?.change ?? quote?.changePct;
    if (value === undefined || value === null || value === 0) return 'text-gray-400';
    return value > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getChangeIcon = (quote: Quote | undefined) => {
    const value = quote?.change ?? quote?.changePct;
    if (value === undefined || value === null || value === 0) return <Minus className="h-3 w-3" />;
    return value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const isQuoteUnavailable = (quote: Quote | undefined) => {
    return (
      quote?.quoteStatus === 'unavailable' ||
      quote?.quoteStatus === 'source_unavailable' ||
      quote?.price === null
    );
  };

  const isSourceUnavailable = (quote: Quote | undefined) => {
    return quote?.quoteStatus === 'source_unavailable';
  };

  const handleTickerClick = (ticker: Ticker) => {
    // TODO: For pro users, show detail drawer with advanced data
    // For now, do nothing - only top-right icon should navigate
    console.log('[OverlayWidget] Ticker clicked:', ticker.symbol);
    // Future: Open drawer with live updates, news, charts, etc.
  };

  // Determine positioning
  const isCustomPosition = settings.position === 'custom';
  const positionStyle = isCustomPosition
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : {};
  const positionClass = isCustomPosition
    ? ''
    : positionClasses[settings.position as Exclude<typeof settings.position, 'custom'>];

  return (
    <div
      ref={dragRef}
      className={`fixed ${positionClass} ${sizeConfig.container} transition-all duration-300 ${
        isDragging ? 'cursor-grabbing' : ''
      }`}
      style={{
        ...positionStyle,
        opacity: settings.opacity / 100,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        zIndex: 2147483647,
        pointerEvents: 'auto',
      }}
    >
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'rgba(17, 19, 24, 0.8)',
          borderColor: 'rgba(61, 66, 79, 0.5)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 4px 24px -4px rgba(0, 0, 0, 0.4), 0 0 40px rgba(66, 153, 225, 0.2)',
        }}
      >
        <div className={containerPadding}>
          {/* Header */}
          <div
            className={`flex items-center justify-between gap-2 ${isCompact ? 'mb-1.5 pb-1.5' : 'mb-3 pb-2'}`}
            style={{ borderBottom: '1px solid rgba(61, 66, 79, 0.5)' }}
          >
            <div className="flex items-center gap-1.5">
              {/* Drag Handle */}
              <button
                onMouseDown={handleMouseDown}
                className="opacity-30 hover:opacity-70 transition-opacity cursor-grab active:cursor-grabbing"
                title="Drag to reposition"
              >
                <GripVertical className="h-3 w-3" style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
              </button>
              <div
                className={`${isCompact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full bg-blue-500`}
                style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
              />
              <span className={`${textSize} font-medium tracking-wide`} style={{ color: 'rgb(147, 156, 177)' }}>
                TICKER BUDDY
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Settings Button */}
              <button
                onClick={() => chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' })}
                className="opacity-50 hover:opacity-100 transition-opacity"
                title="Open settings"
              >
                <ExternalLink className="h-3 w-3" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </button>
              {/* Hide Button */}
              <button
                onClick={onHide}
                className="opacity-50 hover:opacity-100 transition-opacity"
                title="Hide overlay (click extension icon to show)"
              >
                <X className="h-3 w-3" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
              </button>
            </div>
          </div>

          {/* Tickers */}
          <div className={`flex flex-col ${rowGap}`}>
            {tickers.length === 0 ? (
              <p className={`${textSize} text-center py-2`} style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                No tickers added
              </p>
            ) : (
              tickers.map((ticker) => {
                const quote = quotes[ticker.symbol];
                const hasData = quote && quote.price !== undefined && quote.price !== null;
                const unavailable = isQuoteUnavailable(quote);
                const metaSize =
                  settings.size === 'small' ? 'text-[9px]' : settings.size === 'medium' ? 'text-[10px]' : 'text-[11px]';

                return (
                  <button
                    key={ticker.id}
                    onClick={() => handleTickerClick(ticker)}
                    className={`w-full flex flex-col px-2 ${rowPaddingY} rounded-lg transition-colors cursor-pointer`}
                    style={{
                      backgroundColor: 'rgba(17, 19, 24, 0.4)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(17, 19, 24, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(17, 19, 24, 0.4)';
                    }}
                  >
                    {/* 3-column grid */}
                    <div
                      className="grid items-center w-full"
                      style={{
                        gridTemplateColumns: isCompact
                          ? GRID_COLS_COMPACT
                          : GRID_COLS_NON_COMPACT[settings.size],
                        gap: isCompact ? '6px' : '10px',
                      }}
                    >
                      {/* Ticker symbol */}
                      <span
                        className={`${textSize} font-mono font-semibold leading-tight truncate text-left`}
                        style={{ fontVariantNumeric: 'tabular-nums', color: 'white' }}
                      >
                        {ticker.symbol}
                      </span>

                      {/* Price */}
                      <div className={`flex items-center justify-end ${isCompact ? 'min-w-0' : ''}`}>
                        {isLoading && !hasData && !unavailable ? (
                          <div
                            className={isCompact ? 'h-3 w-12' : 'h-4 w-14'}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.1)',
                              borderRadius: '4px',
                              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                            }}
                          />
                        ) : unavailable ? (
                          <span
                            className={`${textSize} font-mono ${isCompact ? 'truncate' : 'whitespace-nowrap'}`}
                            style={{ fontVariantNumeric: 'tabular-nums', color: 'rgba(255, 255, 255, 0.4)' }}
                          >
                            —
                          </span>
                        ) : (
                          <span
                            className={`${textSize} font-mono ${isCompact ? 'truncate' : 'whitespace-nowrap'}`}
                            style={{ fontVariantNumeric: 'tabular-nums', color: 'white' }}
                          >
                            ${formatPrice(quote?.price)}
                          </span>
                        )}
                      </div>

                      {/* Change % */}
                      <div className="flex items-center justify-end">
                        {!isLoading || hasData ? (
                          !unavailable && hasData ? (
                            <span
                              className={`${textSize} font-mono flex items-center gap-0.5 ${getChangeColor(quote)}`}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {getChangeIcon(quote)}
                              {formatPercent(quote?.changePct)}
                            </span>
                          ) : (
                            <span className={`${textSize}`} style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                              —
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>

                    {/* Metadata */}
                    {!isCompact && (
                      <div className={`flex items-center justify-end gap-1 w-full ${sizeConfig.metaMargin}`}>
                        {unavailable ? (
                          <span className={`${metaSize}`} style={{ color: 'rgba(251, 191, 36, 0.8)' }}>
                            {isSourceUnavailable(quote) ? 'Source down' : 'Quote unavailable'}
                          </span>
                        ) : hasData ? (
                          <span className={`${metaSize}`} style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                            {quote?.isDelayed === false ? 'Live' : 'Delayed ~15 min'}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
