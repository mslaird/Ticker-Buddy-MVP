# Project Checkpoints

This file tracks stable points in the codebase that should not regress.

---

## Checkpoint: Overlay layout stable (compact ON/OFF, BTC not truncated)

**Date:** 2025-06-18

**What was fixed:**
- BTC price was showing ellipsis (`...`) in non-compact mode for Small/Medium/Large sizes
- Removed `truncate` class from price column in non-compact mode
- Price now uses `whitespace-nowrap` instead of `truncate` when compact mode is OFF

**What must NOT regress:**
- Compact Mode ON: Must remain unchanged (uses `truncate` for overflow handling)
- Compact Mode OFF: BTC price must display in full without ellipsis for all sizes (Small/Medium/Large)
- 3-column CSS grid layout must remain intact for non-compact mode
- Symbol column must stay left-aligned
- Price column must stay right-aligned with full price visible
- Change % column must stay right-aligned with fixed width

**Relevant files:**
- `src/components/overlay/OverlayWidget.tsx` - Main overlay widget with ticker row layout
- `src/components/dashboard/OverlayPreview.tsx` - Dashboard preview component
- `src/components/overlay/README.md` - Layout rules and test matrix

**Test matrix:**
| Mode | Size | BTC Price | Expected |
|------|------|-----------|----------|
| Compact ON | Small | $88,328.00 | May truncate (OK) |
| Compact ON | Medium | $88,328.00 | May truncate (OK) |
| Compact ON | Large | $88,328.00 | May truncate (OK) |
| Compact OFF | Small | $88,328.00 | Full display (no ellipsis) |
| Compact OFF | Medium | $88,328.00 | Full display (no ellipsis) |
| Compact OFF | Large | $88,328.00 | Full display (no ellipsis) |

- [ ] Branch check: advanced-metrics verified on 2025-12-22 (no functional changes)

## Advanced Metrics branch: 52-week fields wired to provider yearHigh/yearLow (isolated hook, core quotes untouched)

### Developer Notes (2025-12-22)
- Created `src/hooks/useAdvancedMetrics.ts` - isolated hook for fetching 52-week high/low, volume, market cap
- Created `src/lib/fetchAdvancedMetrics.ts` - fetcher that reuses existing market-data edge function
- The edge function already returns `highRange`/`lowRange` which map to Yahoo's `fiftyTwoWeekHigh`/`fiftyTwoWeekLow`
- For crypto: these fields are ATH/ATL from CoinGecko
- For stocks/ETFs: these are true 52-week high/low from Yahoo Finance
- **Market Cap**: Added supplementary fetch using Yahoo quoteSummary API (summaryDetail/price modules) since chart API doesn't return marketCap
- Market cap is cached separately (1 minute TTL) to avoid repeated requests
- Core quote/price/% fetching remains UNTOUCHED (useMarketData.ts and market-data edge function logic preserved)
- Hook is called unconditionally with `enabled` flag to respect Rules of Hooks
