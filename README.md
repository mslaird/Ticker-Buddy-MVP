# Ticker Buddy

A multi-asset market intelligence platform for retail traders: live quotes across stocks, ETFs, and
crypto, and a signature **ticker overlay** that floats your watchlist over any website via a Chrome
extension.

**Working MVP.** React + TypeScript on Supabase, a 1,122-line Deno edge function wrapping two
unreliable upstream data providers, a Manifest V3 browser extension, six Postgres migrations, and
Sentry in production. Roughly **7,500 lines** of application and backend code plus **4,000 lines** of
engineering documentation. Not shipped to users, not monetized, and the reasons are below.

---

## Start here, if you only read three files

| | |
|---|---|
| [`supabase/functions/market-data/index.ts`](supabase/functions/market-data/index.ts) | The real engineering. Endpoint failover, a tiered retry ladder, three TTL-differentiated caches with negative caching, input sanitization, a CORS allowlist, and rate-limit headers, all wrapped around two upstreams I do not control. |
| [`docs/PRD.md`](docs/PRD.md) | The product decision I would defend hardest: the app deliberately does **not** execute trades, connect to brokerages, store credentials, or compute P&L, specifically to stay outside SEC/FINRA broker-dealer regulation. Written as a hard constraint, not a roadmap note. |
| [`supabase/migrations/20260105230000_enforce_ticker_limits.sql`](supabase/migrations/20260105230000_enforce_ticker_limits.sql) | Plan limits moved out of the client and into a Postgres trigger. See the **Corrections** section for how I got this wrong the first time. |

## How this was built, and why the commit history looks the way it does

`git log` shows 134 commits, 126 of them authored by `gpt-engineer-app[bot]`. That is accurate, and
the timeline explains it:

- **2025-12-12 to 2025-12-22** — 126 bot commits. I used Lovable to try to accelerate an initial MVP.
  Median commit subject length is 22 characters and every other commit is titled "Changes."
- **2025-12-22** — I stopped. Lovable could not carry the detail or the scope the product needed.
- **2026-01-06 to 2026-01-12** — three commits, **~11,800 insertions**, written by directing coding
  agents against a spec I wrote:
  [`8b20fa4`](../../commit/8b20fa4) (+5,779: both P1 migrations, Sentry, ErrorBoundary, rate-limit
  telemetry, edge-function hardening, all the docs),
  [`08b170c`](../../commit/08b170c) (+5,177: the entire Chrome extension),
  [`6a3f2ae`](../../commit/6a3f2ae) (+858: cross-context session sync).

The backend, the migrations, the observability, and the extension are all in those three commits.
The bot commits are UI scaffolding from a tool I abandoned. Both facts are checkable.

## Engineering worth reading

**An unreliable dependency, wrapped.** Yahoo's chart API is undocumented and flaky, so quotes go
through two hosts × three attempts with a `[0, 500, 1000]ms` backoff ladder and explicit 429 handling
([`index.ts:454`](supabase/functions/market-data/index.ts#L454)). Crucially it distinguishes a
*network failure* from a *symbol that does not exist* and carries that distinction all the way to a
differentiated message in the UI.

**Caching with justified TTLs, including negative caching.** Quotes 15s, market cap 60s, Yahoo auth
crumb 300s. Failed symbol lookups are cached as `null` so a dead ticker cannot be hammered.

**Market cap required reverse-engineering Yahoo's auth.** The public chart endpoint does not return
it, so the function fetches cookies from `fc.yahoo.com`, exchanges them for a crumb, caches it, and
uses the authenticated quote endpoint. It works. It is also against Yahoo's terms and one silent
change from breaking, with no fallback provider — which is exactly why a licensed provider was in the
architecture and a free one was in the prototype.

**Graduated alerting rather than one threshold.** Quota telemetry escalates through three
destinations as headroom drops: dev console under 20%, a Sentry breadcrumb under 30%, a Sentry error
under 10% ([`useMarketData.ts`](src/hooks/useMarketData.ts)).

**A circuit breaker on the client.** Exponential backoff capped at 8×, polling halts after three
consecutive failures, and a 30-second toast cooldown so a failing upstream cannot spam the user.

**An eventual-consistency window, handled.** `handle_new_user()` creates the profile row via an
async trigger on `auth.users`, so signup polls for that row with increasing delays rather than
assuming it exists ([`AuthContext.tsx`](src/contexts/AuthContext.tsx)).

**Sentry configured for privacy and cost.** `maskAllText`, `blockAllMedia`, 10% session replay and
100% on error, 10% traces in production against 100% in dev, and a `beforeSend` that drops offline
and expected-auth noise.

## Corrections

Publishing this repo meant re-reading it. Two things were wrong, and both are fixed in the tree:

**The ticker limit was bypassable, and the docs claimed it was not.** `check_ticker_limit()` reads
`plan` from `public.profiles`, but that table's RLS UPDATE policy constrained only *which row* a user
could write, not *which columns*. One line from a browser console
(`update({ plan: 'pro' })`) self-promoted a user and raised their own limit.
[`20260831120000_fix_profiles_update_policy.sql`](supabase/migrations/20260831120000_fix_profiles_update_policy.sql)
revokes column-level UPDATE on `plan` and adds the missing `WITH CHECK`.

**Rate-limit and server-error handling was dead code.** `useMarketData` destructured `status` from a
Supabase `FunctionsResponse`, which has no such property, so `status === 429` never fired and the 5xx
branch was unreachable. The status now comes off `FunctionsHttpError.context`. `npm run build` is
bare `vite build` and strips types without checking them, which is why this survived; run
`npx tsc --noEmit -p tsconfig.app.json` separately.

## What is not built

- **No payments.** The pricing page is complete UI; the upgrade button raises a toast. Pro is a
  manual database flag.
- **No AI.** The whitepaper specifies an intelligence layer ("AIMI": NLP sentiment over Reddit and X,
  predictive volatility, watchlist-derived personalization). **None of it is implemented.** It is a
  design, and the data it needs was priced at roughly $12K/month.
- **No historical charts.** The quotes endpoint returns a single current price. The sparkline in the
  asset drawer is a deterministic placeholder and is labeled as such in the UI.
- **No tests, no CI.** A written regression contract in
  [`src/components/overlay/README.md`](src/components/overlay/README.md) is the compensating control
  for a layout regression it documents explicitly. It is not a substitute.
- **No alerts.** Advertised in Settings, disabled in the nav, not implemented at any tier.
- **The extension will not pass Chrome review as-is** — SVG icons where MV3 requires PNG, and
  hardcoded localhost URLs in the popup.

## Stack

React 18 · TypeScript · Vite · Tailwind · shadcn/ui · Supabase (Postgres, RLS, Auth, Edge Functions) ·
Deno · Chrome MV3 · Sentry · CoinGecko + Yahoo Finance

## The product layer above the code

The build sits under a fuller product definition: a **47-page, 13-section whitepaper**, a five-layer
architecture specced against licensed providers (Polygon.io, FMP, CME, Trueflation), a Figma design
system across dashboard iterations V3 through V4.2, and competitive positioning against Bloomberg,
Refinitiv, TradingView, Quartr, Robinhood, and Yahoo Finance.

Note the gap honestly: **the architecture names licensed providers; the shipped code calls CoinGecko
and Yahoo Finance.** That was deliberate — prove the UX on free feeds before committing to roughly
$12K/month in data licensing. It is also the reason the project paused.

## Why it stopped

The differentiator was the intelligence layer, and the intelligence layer needed licensed market data
at a cost that required raising capital. Shipping the product without it would have meant shipping
another quote dashboard. I chose to stop rather than half-ship the thing that made it worth building.
The trademark, filed in three classes (USPTO serial 99094976), was left to lapse with it.

Design files and the whitepaper are available on request.

---

*Built by [Mark Laird](https://markslaird.com) · [LinkedIn](https://www.linkedin.com/in/markslaird/)*
