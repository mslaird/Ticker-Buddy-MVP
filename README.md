# Ticker Buddy

A multi-asset market intelligence platform for retail traders: live quotes across stocks, ETFs, and
crypto, and a signature **ticker overlay** that floats your watchlist over any website via a Chrome
extension.

**Working MVP.** A React + TypeScript web app on Supabase with a 1,122-line Deno edge function
wrapping two unreliable upstream data providers, and a Manifest V3 browser extension that injects
the ticker overlay into any site and shares the web app's auth session. Six Postgres migrations,
Sentry in production.

`heatmap/` is a **third, separate codebase** kept in this repo because the whitepaper specced it as
a dashboard: a D3 treemap with its own Express proxy, built against a paid market-data vendor eight
months before the web app existed. It shares no code, no auth, and no build with the app, and it is
not wired in.

Roughly **10,800 lines** of application and backend code excluding shadcn/ui boilerplate, plus
engineering docs. That splits as **8,495** for the web app, extension and backend, and **2,340** for
the separate `heatmap/` codebase described above. Not shipped to users, not monetized, and the reasons are below.

---

## Start here, if you only read four files

| | |
|---|---|
| [`supabase/functions/market-data/index.ts`](supabase/functions/market-data/index.ts) | The real engineering. Endpoint failover, a tiered retry ladder, three TTL-differentiated caches with negative caching, input sanitization, a CORS allowlist, and rate-limit headers, all wrapped around two upstreams I do not control. |
| [`docs/PRD.md`](docs/PRD.md) | The product decision I would defend hardest: the app deliberately does **not** execute trades, connect to brokerages, store credentials, or compute P&L, specifically to stay outside SEC/FINRA broker-dealer regulation. Written as a hard constraint, not a roadmap note. |
| [`supabase/migrations/20260105230000_enforce_ticker_limits.sql`](supabase/migrations/20260105230000_enforce_ticker_limits.sql) | Plan limits moved out of the client and into a Postgres trigger. See the **Corrections** section for how I got this wrong the first time. |
| [`heatmap/`](heatmap/) — **[demo video](https://www.loom.com/share/99e2d64e2b504590b053f5e3399aa6dd)** | The earliest work here (April 2025), and a separate codebase — not wired into the web app. A market-cap-weighted treemap across five indices, joined from two FMP endpoints, with an Express proxy written in response to real 429s. See [`heatmap/README.md`](heatmap/README.md). |

## How this was built, and why the commit history looks the way it does

`git log` shows over 150 commits, 126 of them authored by `gpt-engineer-app[bot]`. That is accurate, and
the timeline explains it:

- **2025-12-12 to 2025-12-22** — 126 bot commits. I used Lovable to try to accelerate an initial MVP.
  Median commit subject length is 21 characters and 61 of them are titled exactly "Changes."
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
differentiated message in the UI. Worth naming the limit: that split is only made when Yahoo answers
`200` with no price. A hard `404` falls through the retry loop and is reported as a network failure,
so an unknown ticker can still surface the wrong message.

**Caching with justified TTLs, including negative caching.** Quotes 15s, market cap 60s, Yahoo auth
crumb 300s. Failed symbol lookups are cached as `null` so a dead ticker cannot be hammered.

**Market cap required reverse-engineering Yahoo's auth.** The public chart endpoint does not return
it, so the function fetches cookies from `fc.yahoo.com`, exchanges them for a crumb, caches it, and
uses the authenticated quote endpoint. It works. It is also against Yahoo's terms and one silent
change from breaking, with no fallback provider — which is exactly why a licensed provider was in the
architecture and a free one was in the prototype.

**Tiered alerting rather than one threshold.** Quota telemetry routes to three destinations as
headroom drops: a Sentry breadcrumb under 30%, a dev-console warning under 20%, a Sentry error under
10% ([`useMarketData.ts`](src/hooks/useMarketData.ts)). They are independent thresholds, not a
ladder, so below 10% all three fire. Auditing this repo I found the Sentry error was written
`< 10 && > 0`, which meant the one state you most want paged on, quota fully exhausted, was the one
state that stayed silent. Fixed.

**A circuit breaker on the client.** Exponential backoff capped at 8×, polling halts after three
consecutive failures, and a 30-second toast cooldown so a failing upstream cannot spam the user.

**An eventual-consistency window, handled.** `handle_new_user()` creates the profile row from an
`AFTER INSERT` trigger on `auth.users`, so signup polls for that row with increasing delays rather
than assuming it exists. The trigger is synchronous within the inserting transaction; the polling is
there because the client's session and the row's visibility to it are not guaranteed to land
together ([`AuthContext.tsx`](src/contexts/AuthContext.tsx)).

**Sentry configured for privacy and cost.** `maskAllText`, `blockAllMedia`, 10% session replay and
100% on error, 10% traces in production against 100% in dev, and a `beforeSend` that drops offline
and expected-auth noise.

### The heat map, and the rate limit that shaped it

`heatmap/` renders S&P 500, Dow 30, Nasdaq 100, an ETF map, and a World map. Four decisions in it
are worth more than the code:

**The data needs two endpoints joined.** FMP's constituent endpoints return index membership and
GICS sector but no prices; the quote endpoint returns prices but no sector. Neither draws this map
alone, so they are joined on symbol.

**GOOG is filtered out.** Both Alphabet share classes appear in the S&P constituent list, and
keeping both double-counts Alphabet's weight. TradingView and Finviz dedupe the same way.

**The World map sizes by `sqrt(marketCap)`.** Linear weighting lets US mega-caps swallow the canvas
and reduces every other country to an unreadable sliver.

**The proxy exists because of a real 429.** Commit
[`8ea3ae9`](../../commit/8ea3ae9) ends *"(WIP - encountering 429)"*. What followed is an Express
service with 50-symbol batching, a 5-second inter-batch delay, explicit 429 handling, a 1-hour
cache, and input validation before any upstream call is spent. It is not yet wired to the frontend,
which is the honest gap named in [`heatmap/README.md`](heatmap/README.md).

A second, latent bug lives in that same handler and is worth naming rather than hiding: the EOD
response has no market cap, so it falls back to `sizingValue = eod.volume ?? eod.close` and sets
`changesPercentage: 0`. If the historical path were wired up it would size tiles by trading volume
and render every tile neutral gray. It has never run, because the date picker does not refetch.

## Corrections

Publishing this repo meant re-reading it. Two things were wrong, and both are fixed in the tree:

**The ticker limit was bypassable, and the docs claimed it was not.** `check_ticker_limit()` reads
`plan` from `public.profiles`, but that table's RLS UPDATE policy constrained only *which row* a user
could write, not *which columns*. One line from a browser console
(`update({ plan: 'pro' })`) self-promoted a user and raised their own limit.
[`20260831120000_fix_profiles_update_policy.sql`](supabase/migrations/20260831120000_fix_profiles_update_policy.sql)
drops the table-level UPDATE grant and re-grants only `overlay_settings` and `display_name`, then
adds the missing `WITH CHECK` pinning `plan` to its current value.

The first fix I wrote for this was wrong and is worth the paragraph. `REVOKE UPDATE (plan)` looks
like the obvious answer and is a no-op: a column-level revoke only removes a column-level grant, and
Supabase issues a **table-level** `GRANT UPDATE ON public.profiles TO authenticated` that implicitly
covers every column. I checked it against the live database rather than assuming the DDL took, and
`has_column_privilege('authenticated','public.profiles','plan','UPDATE')` still returned true after
the revoke reported success. The grant has to be dropped and the allowed columns re-granted
explicitly.

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

## What I would fix before this took real traffic

Auditing my own repo turned up three things in the edge function that are fine for a prototype on a
free tier and would not be fine in front of users. None is exploited, the project is paused, and I
would rather name them than have them found.

**The function is unauthenticated.** `supabase/config.toml` sets `verify_jwt = false` for
`market-data`, so anyone with the URL can call it. That was deliberate during development and is the
first thing I would reverse.

**The rate limiter is bypassable.** `getClientIdentifier()` keys buckets on
`` `auth:${ip}:${authHeader.substring(0, 20)}` ``. The first 20 characters of every Supabase JWT are
identical, so the auth component contributes no entropy between real users — and a caller sending
arbitrary `Authorization` values can mint unlimited distinct buckets. It is also an in-memory `Map`,
so the limit is per isolate rather than global. The fix is to verify the JWT and key on the `sub`
claim, with the counter in Postgres or Redis.

**The CORS allowlist keeps development origins in production, and never refuses.** The four
`localhost`/`127.0.0.1` origins are appended unconditionally, even when `ALLOWED_ORIGINS` is set, so
a deployed function still trusts a developer's machine. And a disallowed origin is not rejected: it
is answered with `allAllowedOrigins[0]`. I first wrote here that index 0 is `http://localhost:8080`;
re-reading it, that is only true when `ALLOWED_ORIGINS` is unset, because the env origins are
prepended. With it set, index 0 is the first production origin. The defect is the shape — returning
a permissive header to an origin you have just decided is not allowed — not the specific value.
Development origins should be gated on an environment flag, and a disallowed origin should get no
CORS header at all.

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

## Why it is paused

The order matters, so here it is straight. The heat map came **first** — April 2025, its own repo,
its own eight commits. That is where a real vendor got wired in and where an estimate became a
number: the licensed feeds the full platform needed ran to roughly $12K/month, against the
$69/month plan the prototype was on. The web app and extension were built later, December 2025
through January 2026, with that number already known.

What paused the project was the full picture rather than any single moment: the differentiator was
the intelligence layer, the intelligence layer needed licensed data at that price, and shipping
without it meant shipping another quote dashboard.

So the project is paused pending capital, not abandoned. What still stands: three registered
domains (tickerbuddy.co, usetickerbuddy.com, tickerbuddy.app), the 47-page product whitepaper, the
Figma design system, and a USPTO application that **cleared examination** — the examiner's search
returned *"No Conflicting Marks Found"* and it advanced to a Notice of Allowance — under serial
99094976. It never registered, and lapsed, only because a Statement of Use was due within six months
and the product was never sold. Serial 99094976 is checkable in USPTO TSDR.

Design files and the whitepaper are available on request.

---

*Built by [Mark Laird](https://markslaird.com) · [LinkedIn](https://www.linkedin.com/in/markslaird/)*
