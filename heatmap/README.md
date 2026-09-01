# Heat Map

A market-cap-weighted, sector-grouped treemap of US equity indices, built with D3 v7 and
React 19. Part of the [Ticker Buddy](../README.md) platform: the whitepaper specced this as a
dashboard feature. It was built standalone as a working prototype and is **not** wired into the
web app — it runs on its own dev server. Integrating it was future work when the project paused.

Five maps: **S&P 500**, **Dow 30**, **Nasdaq 100**, an **ETF map** grouped by
class and strategy, and a **World map** grouped Region → Country → Ticker.

## Why it looks the way it does

**Two-source join.** FMP's constituent endpoints return membership and GICS sector but no
prices. The quote endpoint returns prices but no sector. Neither alone can draw this, so the
two are joined on symbol through a `sectorMap`.

**GOOG is filtered out.** Both Alphabet share classes appear in the S&P constituent list, and
including both double-counts Alphabet's weight in the treemap. TradingView and Finviz both
dedupe the same way.

**The World map sizes by `sqrt(marketCap)`, not `marketCap`.** Linear weighting makes US
mega-caps swallow the canvas and renders every other country as an unreadable sliver.

**A $1B market-cap floor and a 10k volume floor** are query parameters, not preferences: below
those thresholds tiles are too small to label, and thinly traded names make percent-change
coloring meaningless.

**Labels truncate by measured width.** `getComputedTextLength()` in a loop, not character
counting, because glyph widths vary and character counts overflow on wide strings.

## The proxy, and why it exists

`server/` is an Express + TypeScript proxy with 50-symbol request batching, a 5-second inter-batch
delay, explicit 429 handling, a 1-hour in-memory cache, and input validation before any upstream
call is spent.

It was written in response to real rate limiting. The commit immediately before it is titled
*"WIP - encountering 429"*.

**It is not currently wired up.** The frontend still calls FMP directly with a `VITE_`-prefixed
key, which ships in the client bundle. Routing the frontend through the proxy is the main
outstanding task and would close the one real security gap in this prototype.

## Known gaps

This is an unfinished prototype, paused pending capital (see the root README). Specifically:

- The frontend bypasses the proxy; the API key is client-visible.
- The date picker renders but does not refetch — `selectedDate` is absent from the fetch effect's
  dependency array, so the server's historical endpoint is unreachable from the UI.
- No retry or backoff: a single 429 aborts a render.
- The in-memory cache does not survive a restart and will not scale horizontally.
- No tests.

## Running it

```bash
cp .env.example .env      # add your FMP key
npm install && npm run dev

cd server && npm install && npm start   # optional; not yet called by the frontend
```
