# Ticker Buddy MVP - Architecture Analysis
**Date:** 2026-01-05  
**Analyst:** Claude Code (Senior Engineer)  
**Status:** Pre-modification baseline

---

## 1. System-Level Architecture Map

### Frontend → Hooks → Supabase → Edge Functions

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ROUTING & AUTH LAYER                        │
│  • BrowserRouter (React Router v6)                               │
│  • AuthContext (Supabase Auth wrapper)                          │
│  • ProtectedRoute (Route guard)                                  │
│                                                                  │
│  Routes:                                                         │
│    / → Index (landing)                                          │
│    /auth → Auth (signup/login)                                  │
│    /dashboard → Dashboard (protected)                           │
│    /overlay → Overlay (protected)                                 │
│    /settings → Settings (protected)                             │
│    /upgrade → Upgrade (protected)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        HOOKS LAYER                              │
│  Custom React Hooks (Data Management)                            │
│                                                                  │
│  • useAuth() → AuthContext                                      │
│    └─> Supabase Auth (signUp, signIn, signOut)                  │
│                                                                  │
│  • useTickers() → Ticker CRUD                                   │
│    └─> Supabase: tickers table (RLS)                            │
│                                                                  │
│  • useMarketData() → Real-time quotes                           │
│    └─> Supabase Edge Function: market-data                      │
│        └─> CoinGecko (crypto) / Yahoo Finance (stocks/ETFs)    │
│                                                                  │
│  • useOverlaySettings() → Overlay preferences                   │
│    └─> Supabase: profiles.overlay_settings (JSONB)              │
│                                                                  │
│  • useProfile() → User profile & plan tier                       │
│    └─> Supabase: profiles table (RLS)                           │
│                                                                  │
│  • useAdvancedMetrics() → 52-week high/low, volume, market cap │
│    └─> fetchAdvancedMetrics() → market-data edge function       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE CLIENT LAYER                        │
│  @supabase/supabase-js (v2.87.1)                                │
│                                                                  │
│  • Client: src/integrations/supabase/client.ts                  │
│    - VITE_SUPABASE_URL                                          │
│    - VITE_SUPABASE_PUBLISHABLE_KEY                              │
│    - localStorage auth persistence                               │
│                                                                  │
│  • Database Types: src/integrations/supabase/types.ts           │
│    - Auto-generated from Supabase schema                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND LAYER                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  DATABASE (PostgreSQL + RLS)                              │  │
│  │                                                            │  │
│  │  Tables:                                                  │  │
│  │    • profiles                                             │  │
│  │      - id, user_id, plan (free|pro), overlay_settings    │  │
│  │      - RLS: user-scoped access                           │  │
│  │                                                            │  │
│  │    • tickers                                              │  │
│  │      - id, user_id, symbol, asset_type, display_name      │  │
│  │      - last_price, day_change, day_change_pct (unused?)  │  │
│  │      - RLS: user-scoped access                           │  │
│  │                                                            │  │
│  │  Triggers:                                                │  │
│  │    • handle_new_user() → auto-create profile             │  │
│  │    • update_updated_at_column() → timestamp updates      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  EDGE FUNCTIONS (Deno)                                    │  │
│  │                                                            │  │
│  │  • market-data (supabase/functions/market-data/index.ts) │  │
│  │                                                            │  │
│  │    Actions:                                                │  │
│  │      1. resolve → Auto-detect asset type                  │  │
│  │      2. validate → Validate symbol exists                │  │
│  │      3. quotes → Fetch market data                       │  │
│  │                                                            │  │
│  │    Data Sources:                                           │  │
│  │      • Crypto: CoinGecko API (live)                      │  │
│  │      • Stocks/ETFs: Yahoo Finance (delayed ~15min)       │  │
│  │      • Mock: Seeded random (dev mode)                     │  │
│  │                                                            │  │
│  │    Caching:                                                │  │
│  │      • In-memory cache (15s TTL for quotes)               │  │
│  │      • Market cap cache (60s TTL)                        │  │
│  │      • Yahoo crumb cache (5min TTL)                      │  │
│  │                                                            │  │
│  │    Features:                                               │  │
│  │      • Retry logic with backoff                           │  │
│  │      • Network error handling                             │  │
│  │      • Symbol resolution (crypto/stock/ETF detection)      │  │
│  │      • Market cap via Yahoo quoteSummary API              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AUTHENTICATION                                           │  │
│  │  • Supabase Auth (email/password)                        │  │
│  │  • Email verification enabled                            │  │
│  │  • Session management (localStorage)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL DATA SOURCES                        │
│                                                                  │
│  • CoinGecko API (crypto)                                       │
│    - Live prices, 24h change, market cap, ATH/ATL               │
│    - Rate limits: ~15s cache TTL                                │
│                                                                  │
│  • Yahoo Finance (stocks/ETFs)                                  │
│    - Delayed quotes (~15min), 52-week high/low                  │
│    - Market cap via quoteSummary API                            │
│    - Crumb authentication for authenticated endpoints            │
│    - Rate limits: ~15s cache TTL                                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Examples

**1. User adds ticker:**
```
Dashboard → AddTickerModal → useTickers.addTicker() 
  → Supabase Client → tickers table (RLS) 
  → useTickers state update → Dashboard re-render
```

**2. Market data refresh:**
```
useMarketData hook (polling every 15s) 
  → Supabase Edge Function: market-data 
  → CoinGecko/Yahoo Finance (with cache check)
  → Return quotes → useMarketData state update 
  → OverlayWidget/Dashboard re-render
  → Optional: Update tickers.last_price in DB
```

**3. Overlay settings change:**
```
OverlayControls → useOverlaySettings.updateSettings() 
  → Debounced (500ms) → Supabase Client 
  → profiles.overlay_settings (JSONB) 
  → OverlayWidget re-render with new settings
```

---

## 2. Production-Ready Summary

### ✅ Fully Production-Ready

**Authentication & Authorization:**
- ✅ Email/password auth via Supabase (email verification enabled)
- ✅ Row-Level Security (RLS) on all tables
- ✅ Protected routes with loading states
- ✅ Auto-profile creation on signup
- ✅ Session persistence (localStorage)

**Core Features:**
- ✅ Ticker management (add/edit/delete) with plan limits
- ✅ Real-time market data fetching (crypto + stocks/ETFs)
- ✅ Overlay widget with customizable settings
- ✅ Plan tier enforcement (free: 3 tickers, pro: 5 tickers)
- ✅ Symbol resolution and validation
- ✅ Error handling and user feedback (toasts)

**Data Infrastructure:**
- ✅ Server-side market data fetching (no CORS issues)
- ✅ In-memory caching (15s TTL) to prevent rate limits
- ✅ Retry logic with backoff for network failures
- ✅ Market cap fetching (server-side, CORS-safe)
- ✅ Advanced metrics (52-week high/low) isolated from core quotes

**UI/UX:**
- ✅ Responsive design (Tailwind CSS)
- ✅ Loading states and skeletons
- ✅ Error states (unavailable quotes, source down)
- ✅ Overlay widget positioning (4 corners)
- ✅ Compact/non-compact modes
- ✅ Size variants (small/medium/large)
- ✅ Opacity control

**Code Quality:**
- ✅ TypeScript throughout
- ✅ React hooks with proper dependencies
- ✅ Component separation (overlay, dashboard, auth)
- ✅ Checkpoints documented (CHECKPOINTS.md)
- ✅ PRD as source of truth

### ⚠️ Partially Ready / Needs Verification

**Testing:**
- ⚠️ No visible test suite (unit/integration/E2E)
- ⚠️ Manual testing required for overlay layout (see CHECKPOINTS.md)

**Error Handling:**
- ⚠️ Network errors handled but may need user-facing retry UI
- ⚠️ Rate limiting from providers not fully tested

**Performance:**
- ⚠️ Polling interval fixed at 15s (configurable per user but not optimized)
- ⚠️ No visible performance monitoring

**Documentation:**
- ⚠️ CURRENT_STATE.md is empty (needs completion)
- ⚠️ TODO.md is empty (needs completion)

### ❌ Not Production-Ready

**Billing/Subscriptions:**
- ❌ Pro plan is flag-based only (no Stripe integration)
- ❌ No payment processing
- ❌ No subscription management UI

**Deployment:**
- ❌ No visible CI/CD pipeline
- ❌ No environment variable documentation
- ❌ No deployment scripts

**Monitoring:**
- ❌ No error tracking (Sentry, etc.)
- ❌ No analytics
- ❌ No logging infrastructure

**Security:**
- ⚠️ CORS headers allow all origins (`'*'`) in edge function
- ⚠️ No rate limiting on edge function endpoints
- ⚠️ No input sanitization validation beyond basic checks

---

## 3. High-Risk Areas (DO NOT CHANGE CASUALLY)

### 🔴 CRITICAL - Do Not Modify Without Review

**1. Overlay Widget Layout (`src/components/overlay/OverlayWidget.tsx`)**
- **Risk:** Breaking BTC price display (CHECKPOINTS.md)
- **Why:** Complex 3-column grid with compact/non-compact modes
- **Constraint:** BTC must display fully in non-compact mode (no truncation)
- **Test Matrix Required:** All size × compact mode combinations
- **Related Files:**
  - `src/components/dashboard/OverlayPreview.tsx` (shares layout logic)
  - `src/components/overlay/README.md` (layout rules)

**2. Market Data Edge Function (`supabase/functions/market-data/index.ts`)**
- **Risk:** Breaking core quote fetching, introducing CORS issues
- **Why:** Single source of truth for all market data
- **Constraint:** Must remain server-side (no client-side Yahoo calls)
- **Critical Sections:**
  - `fetchYahooPrice()` - Core stock/ETF fetching
  - `fetchCoinGeckoPrice()` - Core crypto fetching
  - `fetchYahooMarketCap()` - Market cap (separate cache)
  - Cache TTL logic (15s quotes, 60s market cap, 5min crumb)
- **Checkpoint:** Advanced Metrics must remain isolated (useAdvancedMetrics.ts)

**3. Core Quote Fetching (`src/hooks/useMarketData.ts`)**
- **Risk:** Breaking real-time updates, polling logic
- **Why:** Heart of the application's data flow
- **Constraint:** Must not modify core quote/price/% fetching (CHECKPOINTS.md)
- **Critical Logic:**
  - Polling interval (respects `refreshInterval` from overlay settings)
  - Error count tracking (stops after 3 consecutive errors)
  - Database updates (last_price, day_change, day_change_pct) - may be unused

**4. Row-Level Security (RLS) Policies**
- **Risk:** Data leakage between users
- **Why:** Security-critical, non-negotiable per PRD
- **Location:** `supabase/migrations/*.sql`
- **Constraint:** Users can ONLY access their own rows
- **Tables:** `profiles`, `tickers`

**5. Authentication Flow (`src/contexts/AuthContext.tsx`)**
- **Risk:** Breaking auth state, session management
- **Why:** Foundation of all protected features
- **Critical:** Auth state listener setup order (listener FIRST, then getSession)

### 🟡 HIGH RISK - Modify with Caution

**6. Symbol Resolution (`supabase/functions/market-data/index.ts::resolveSymbol`)**
- **Risk:** Incorrect asset type detection, breaking ticker validation
- **Why:** Determines crypto vs stock vs ETF
- **Logic:** CryptoIdMap → KnownETFs → Yahoo quoteType → Fallback

**7. Plan Tier Enforcement (`src/hooks/useProfile.ts::getTickerLimit`)**
- **Risk:** Allowing users to exceed plan limits
- **Why:** Business logic for free (3) vs pro (5) tickers
- **Used in:** Dashboard, AddTickerModal

**8. Overlay Settings Persistence (`src/hooks/useOverlaySettings.ts`)**
- **Risk:** Losing user preferences, breaking overlay behavior
- **Why:** JSONB storage, debounced updates (500ms)
- **Constraint:** Must merge with DEFAULT_SETTINGS

**9. Database Schema (`supabase/migrations/*.sql`)**
- **Risk:** Breaking existing data, RLS policies
- **Why:** Production data structure
- **Constraint:** Migrations must be backward-compatible or include data migration

**10. CSS Import Order (`src/index.css`)**
- **Risk:** Vite build errors
- **Why:** Recently fixed, must maintain order
- **Constraint:** @import → @tailwind → @layer

---

## 4. Recommended Next Steps (Priority Order)

### 🔥 P0 - Critical for MVP Launch

**1. Complete Documentation**
- **Priority:** IMMEDIATE
- **Tasks:**
  - Fill `docs/migration/CURRENT_STATE.md` with actual state
  - Fill `docs/migration/TODO.md` with MVP completion checklist
  - Document environment variables (`.env.example`)
- **Why:** Required for handoff, onboarding, debugging
- **Effort:** 2-4 hours

**2. Environment Variable Setup**
- **Priority:** IMMEDIATE
- **Tasks:**
  - Create `.env.example` with required variables
  - Document Supabase setup process
  - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Why:** Cannot deploy without proper config
- **Effort:** 1-2 hours

**3. Security Hardening**
- **Priority:** HIGH (before production)
- **Tasks:**
  - Restrict CORS in edge function (allow specific origins, not `'*'`)
  - Add rate limiting to edge function endpoints
  - Validate input sanitization in edge function
- **Why:** Security vulnerability (CORS allows all origins)
- **Effort:** 4-6 hours

**4. Error Handling & User Feedback**
- **Priority:** HIGH
- **Tasks:**
  - Add retry UI for failed market data fetches
  - Improve error messages (network vs unavailable vs invalid symbol)
  - Add loading states for edge cases
- **Why:** Poor UX when data sources fail
- **Effort:** 4-6 hours

### 🟠 P1 - Important for Production

**5. Testing Infrastructure**
- **Priority:** HIGH
- **Tasks:**
  - Add unit tests for hooks (useTickers, useMarketData, useProfile)
  - Add integration tests for overlay widget layout (test matrix from CHECKPOINTS.md)
  - Add E2E tests for critical flows (signup → add ticker → view overlay)
- **Why:** Prevent regressions, especially in high-risk areas
- **Effort:** 8-12 hours

**6. Performance Optimization**
- **Priority:** MEDIUM
- **Tasks:**
  - Optimize polling intervals (user-configurable, but with limits)
  - Add request batching for multiple tickers
  - Implement exponential backoff for failed requests
- **Why:** Reduce API costs, improve reliability
- **Effort:** 6-8 hours

**7. Monitoring & Logging**
- **Priority:** MEDIUM
- **Tasks:**
  - Add error tracking (Sentry or similar)
  - Add basic analytics (page views, feature usage)
  - Log edge function errors with context
- **Why:** Cannot debug production issues without visibility
- **Effort:** 4-6 hours

**8. Database Cleanup**
- **Priority:** MEDIUM
- **Tasks:**
  - Verify if `tickers.last_price`, `day_change`, `day_change_pct` are used
  - Remove unused columns or document their purpose
  - Add database indexes if needed (user_id on tickers, profiles)
- **Why:** Reduce confusion, potential performance issues
- **Effort:** 2-4 hours

### 🟡 P2 - Post-MVP Enhancements

**9. Pro Plan Billing Integration**
- **Priority:** LOW (explicitly out of scope for MVP per PRD)
- **Tasks:**
  - Stripe integration for subscriptions
  - Subscription management UI
  - Webhook handling for payment events
- **Why:** Required for monetization, but PRD says "logic-only for MVP"
- **Effort:** 16-24 hours

**10. Deployment Pipeline**
- **Priority:** LOW
- **Tasks:**
  - CI/CD setup (GitHub Actions, Vercel, etc.)
  - Automated testing in pipeline
  - Environment-specific deployments (dev/staging/prod)
- **Why:** Manual deployment is error-prone
- **Effort:** 8-12 hours

**11. Mobile Responsiveness**
- **Priority:** LOW
- **Tasks:**
  - Test and fix mobile layouts
  - Overlay widget mobile behavior (may not be applicable)
  - Touch interactions
- **Why:** PRD mentions mobile app is v2+, but web should be responsive
- **Effort:** 4-8 hours

### 🔵 P3 - Future Considerations

**12. Advanced Features (Post-MVP)**
- Alerts/notifications (SMS/email)
- Portfolio tracking (manual entry, per PRD constraints)
- Charts/visualizations
- Export data
- Social features

---

## Summary

**Current State:** The codebase is **~85% production-ready** for MVP launch. Core functionality is solid, but documentation, security hardening, and testing are missing.

**Biggest Gaps:**
1. Documentation (CURRENT_STATE.md, TODO.md empty)
2. Security (CORS too permissive, no rate limiting)
3. Testing (no test suite)
4. Monitoring (no error tracking)

**Strengths:**
- Clean architecture (hooks → Supabase → edge functions)
- Proper RLS implementation
- Server-side data fetching (CORS-safe)
- Well-documented checkpoints
- PRD as source of truth

**Recommendation:** Complete P0 items before any production deployment. P1 items should be completed within first month post-launch.

