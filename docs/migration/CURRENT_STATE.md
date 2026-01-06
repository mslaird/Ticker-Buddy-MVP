# Current State

**Last Updated:** 2026-01-05  
**Status:** ~85% production-ready for MVP

## What works now

### Core Features
- ✅ Email/password authentication via Supabase (email verification enabled)
- ✅ User signup/login/logout with session persistence
- ✅ Ticker management (add/edit/delete) with user-scoped storage
- ✅ Real-time market data fetching:
  - Crypto: CoinGecko API (live prices)
  - Stocks/ETFs: Yahoo Finance (delayed ~15min)
- ✅ Overlay widget with customizable settings:
  - Position (4 corners)
  - Size (small/medium/large)
  - Opacity control
  - Compact/non-compact modes
  - Pin/unpin
  - Refresh interval (user-configurable)
- ✅ Plan tier enforcement:
  - Free: 3 tickers max
  - Pro: 5 tickers max (flag-based, no billing yet)
- ✅ Symbol resolution and validation
- ✅ Advanced metrics (52-week high/low, volume, market cap) for Pro users
- ✅ Responsive UI with loading states and error handling

### Technical Infrastructure
- ✅ Row-Level Security (RLS) on all database tables
- ✅ Server-side market data fetching (no CORS issues)
- ✅ In-memory caching (15s TTL for quotes, 60s for market cap)
- ✅ Retry logic with backoff for network failures
- ✅ Protected routes with authentication guards
- ✅ Auto-profile creation on user signup

## Landing page loads at localhost:8080

- ✅ Vite dev server configured on port 8080 (`vite.config.ts`)
- ✅ Landing page (`/`) accessible at `http://localhost:8080`
- ✅ All routes functional:
  - `/` → Index (landing page)
  - `/auth` → Auth (signup/login)
  - `/dashboard` → Dashboard (protected)
  - `/overlay` → Overlay (protected)
  - `/settings` → Settings (protected)
  - `/upgrade` → Upgrade (protected)
  - `*` → NotFound (404)

## Pages/routes:

### Public Routes
- **Index** (`src/pages/Index.tsx`): Landing page with feature preview
- **Auth** (`src/pages/Auth.tsx`): Signup/login form with email verification

### Protected Routes (require authentication)
- **Dashboard** (`src/pages/Dashboard.tsx`): 
  - Ticker list with real-time quotes
  - Overlay preview
  - Add/edit/delete tickers
  - Plan limit enforcement
- **Overlay** (`src/pages/Overlay.tsx`):
  - Overlay controls (position, size, opacity, etc.)
  - Live overlay widget preview
- **Settings** (`src/pages/Settings.tsx`): User settings (basic)
- **Upgrade** (`src/pages/Upgrade.tsx`): Pro plan upgrade page (no billing integration)

## What's missing

### Critical for Production
- ❌ Environment variable documentation (`.env.example`)
- ❌ Security hardening:
  - CORS allows all origins (`'*'`) in edge function
  - No rate limiting on API endpoints
- ❌ Error tracking/monitoring (Sentry, etc.)
- ❌ Test suite (unit/integration/E2E)
- ❌ Deployment pipeline (CI/CD)

### Important for MVP
- ⚠️ Retry UI for failed market data fetches
- ⚠️ Better error messages (network vs unavailable vs invalid)
- ⚠️ Performance monitoring
- ⚠️ Analytics (basic usage tracking)

### Post-MVP
- ❌ Stripe billing integration (Pro plan is flag-based only)
- ❌ Subscription management UI
- ❌ Mobile app (v2+ per PRD)
- ❌ Alerts/notifications (SMS/email)

## What's mocked

### Market Data
- **Mock Mode**: Available when `MARKET_DATA_PROVIDER=mock` (edge function)
  - Seeded random prices based on symbol hash
  - Stable mock data for development/testing
  - Not used in production (defaults to `production` mode)

### Pro Plan
- **Pro Status**: Flag-based only (`profiles.plan = 'pro'`)
  - No Stripe integration
  - No payment processing
  - Manually set in database for testing
  - Upgrade page exists but doesn't process payments

## Known bugs

### None Documented
- No known bugs in current codebase
- Overlay layout was fixed (BTC truncation issue - see CHECKPOINTS.md)
- CSS import order was fixed (Vite build error)

### Potential Issues (Not Confirmed)
- ⚠️ `tickers.last_price`, `day_change`, `day_change_pct` columns may be unused
- ⚠️ No visible error handling for edge function failures beyond console logs
- ⚠️ Rate limiting from CoinGecko/Yahoo not fully tested under load

## APIs / data sources

### Supabase Edge Function
- **Endpoint**: `supabase.functions.invoke('market-data')`
- **Location**: `supabase/functions/market-data/index.ts`
- **Actions**:
  1. `resolve` - Auto-detect asset type (crypto/stock/ETF)
  2. `validate` - Validate symbol exists
  3. `quotes` - Fetch market data for symbols array

### External APIs
- **CoinGecko** (Crypto):
  - Endpoint: `https://api.coingecko.com/api/v3/coins/markets`
  - Data: Live prices, 24h change, market cap, ATH/ATL
  - Cache: 15s TTL
  - Rate Limits: ~15s cache prevents abuse

- **Yahoo Finance** (Stocks/ETFs):
  - Endpoints:
    - Chart API: `query1.finance.yahoo.com/v8/finance/chart/`
    - Quote API: `query2.finance.yahoo.com/v7/finance/quote/`
    - Search API: `query1.finance.yahoo.com/v1/finance/search`
  - Data: Delayed quotes (~15min), 52-week high/low, market cap
  - Cache: 15s TTL (quotes), 60s TTL (market cap), 5min TTL (crumb auth)
  - Authentication: Yahoo crumb/cookie system for authenticated requests

### Database
- **Supabase PostgreSQL** with RLS
- **Tables**:
  - `profiles`: User profiles, plan tier, overlay settings (JSONB)
  - `tickers`: User tickers with symbol, asset_type, display_name

## Auth status

### ✅ Fully Functional
- **Provider**: Supabase Auth
- **Method**: Email/password only (no social login per PRD)
- **Email Verification**: Enabled
- **Session Management**: localStorage persistence
- **Auto-Profile Creation**: Trigger creates profile on signup
- **Protected Routes**: All dashboard/overlay/settings routes require auth

### Implementation
- **Context**: `src/contexts/AuthContext.tsx`
- **Hook**: `useAuth()` provides `user`, `session`, `loading`, `signUp`, `signIn`, `signOut`
- **Guard**: `src/components/ProtectedRoute.tsx` redirects to `/auth` if not authenticated

### Security
- ✅ RLS policies enforce user-scoped data access
- ✅ No secrets exposed client-side (only anon key)
- ⚠️ CORS allows all origins (needs restriction)

## Pro gating status

### Current Implementation
- **Plan Tiers**: `free` (default) and `pro` (flag-based)
- **Ticker Limits**:
  - Free: 3 tickers max
  - Pro: 5 tickers max
- **Enforcement**: `src/hooks/useProfile.ts::getTickerLimit()`
- **UI Gating**: 
  - Dashboard shows upgrade CTA when limit reached
  - AddTickerModal prevents adding beyond limit
  - Settings page shows plan status

### Pro Features
- ✅ Up to 5 tickers (vs 3 for free)
- ✅ Advanced metrics visible (52-week high/low, market cap, volume)
- ✅ Enhanced overlay settings (faster refresh interval)

### Missing
- ❌ Stripe billing integration
- ❌ Payment processing
- ❌ Subscription management
- ❌ Webhook handling for payment events
- ❌ Pro plan upgrade flow (UI exists but doesn't process payments)

### How to Test Pro
1. Sign up as regular user (gets `free` plan)
2. Manually update database: `UPDATE profiles SET plan = 'pro' WHERE user_id = '<user_id>';`
3. Refresh app to see Pro features enabled


