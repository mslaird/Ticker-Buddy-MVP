# Overlay Components

This folder contains the overlay widget components used for displaying ticker data.

## Layout Rules

### Non-Compact Mode (Compact OFF)
- Uses a 3-column CSS grid layout
- **Column 1 (Symbol):** Fixed width, left-aligned
- **Column 2 (Price):** Flexible width, right-aligned, `whitespace-nowrap` (NO truncation)
- **Column 3 (Change %):** Fixed width, right-aligned

### Compact Mode (Compact ON)
- Uses tighter spacing and smaller typography
- Price column uses `truncate` for overflow handling (acceptable)
- More condensed grid column widths

## Test Matrix

Before modifying row layout, test all combinations:

| Compact Mode | Size   | BTC Price Expected Behavior |
|--------------|--------|----------------------------|
| ON           | Small  | May truncate (acceptable)  |
| ON           | Medium | May truncate (acceptable)  |
| ON           | Large  | May truncate (acceptable)  |
| OFF          | Small  | Full display, no ellipsis  |
| OFF          | Medium | Full display, no ellipsis  |
| OFF          | Large  | Full display, no ellipsis  |

## Key Files

- `OverlayWidget.tsx` - Main overlay widget with ticker row layout
- `OverlayControls.tsx` - Overlay control panel
- `AssetDetailDrawer.tsx` - Asset detail drawer component

## Important Notes

1. **Do NOT add `truncate` to price column in non-compact mode** - BTC prices must display fully
2. **Compact mode uses different grid columns** - defined in `GRID_COLS_COMPACT` vs `GRID_COLS_NON_COMPACT`
3. **Size variants (Small/Medium/Large)** affect typography and grid column widths
4. **The overlay card has `overflow-hidden`** - content must fit within bounds via proper grid sizing
