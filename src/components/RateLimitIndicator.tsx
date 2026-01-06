/**
 * Rate Limit Indicator Component
 *
 * Displays current rate limit status in development mode.
 * Shows quota remaining and warns when approaching limits.
 *
 * Only visible in development mode (NODE_ENV !== 'production')
 */

import { RateLimitInfo } from '@/hooks/useMarketData';
import { AlertTriangle, Activity, Clock } from 'lucide-react';

interface RateLimitIndicatorProps {
  rateLimit: RateLimitInfo | null;
  className?: string;
}

export function RateLimitIndicator({ rateLimit, className = '' }: RateLimitIndicatorProps) {
  // Only show in development mode
  if (!import.meta.env.DEV || !rateLimit) {
    return null;
  }

  const { remaining, limit, percentRemaining, reset } = rateLimit;

  // Calculate time until reset
  const resetDate = new Date(reset);
  const now = new Date();
  const minutesUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / 60000);

  // Determine status color
  const getStatusColor = () => {
    if (percentRemaining < 10) return 'text-destructive';
    if (percentRemaining < 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusBg = () => {
    if (percentRemaining < 10) return 'bg-destructive/10 border-destructive/20';
    if (percentRemaining < 30) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-green-500/10 border-green-500/20';
  };

  const statusColor = getStatusColor();
  const statusBg = getStatusBg();

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className={`glass-card p-3 border ${statusBg} max-w-xs`}>
        <div className="flex items-start gap-3">
          {percentRemaining < 30 ? (
            <AlertTriangle className={`h-5 w-5 ${statusColor} flex-shrink-0 mt-0.5`} />
          ) : (
            <Activity className={`h-5 w-5 ${statusColor} flex-shrink-0 mt-0.5`} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground">Rate Limit</span>
              <span className={`text-xs font-mono font-bold ${statusColor}`}>
                {percentRemaining}%
              </span>
            </div>

            <div className="space-y-1.5">
              {/* Progress bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    percentRemaining < 10
                      ? 'bg-destructive'
                      : percentRemaining < 30
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${percentRemaining}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">
                  {remaining}/{limit} remaining
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {minutesUntilReset}m
                </span>
              </div>

              {/* Warning message */}
              {percentRemaining < 20 && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {percentRemaining < 10
                    ? '⚠️ Critical: Rate limit almost exhausted'
                    : '⚠️ Warning: Rate limit running low'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Dev mode badge */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
            Dev Mode Only
          </p>
        </div>
      </div>
    </div>
  );
}
