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

- ✅ Branch check: advanced-metrics verified on 2025-12-22 (no functional changes)
---

## Checkpoint: Advanced Metrics stable (Market Cap server-side, CORS-safe)

**Date:** 2025-12-22  
**What was fixed:**  
- Market Cap now fetched **server-side** via Supabase edge function (no client-side Yahoo calls)
- Market Cap now returns in `/market-data` response and renders in Advanced Metrics UI

**Must NOT regress:**  
- No client-side requests to `query2.finance.yahoo.com` (CORS risk)
- `/market-data` returns `marketCap` for stocks/ETFs when available
- UI shows Market Cap for AAPL/BMNR correctly

**Relevant files:**  
- `supabase/functions/market-data/*`  
- `src/components/.../AssetDetailDrawer.tsx`
