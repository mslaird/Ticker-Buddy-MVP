# TODO - MVP Completion Milestones

**Last Updated:** 2026-01-05  
**Status:** Pre-production checklist

## Core Features

### ✅ Completed
- [x] Email/password authentication
- [x] Ticker management (add/edit/delete)
- [x] Real-time market data (crypto + stocks/ETFs)
- [x] Overlay widget with customization
- [x] Plan tier enforcement (free: 3, pro: 5)
- [x] Symbol resolution and validation
- [x] Advanced metrics (52-week high/low, market cap)

### 🔥 P0 - Critical for Launch
- [x] Environment variable documentation (`.env.example` - documented in SETUP.md)
- [x] Security hardening (CORS restriction, rate limiting)
- [x] Error handling improvements (retry function, better messages, toast notifications)
- [x] Complete CURRENT_STATE.md

### 🟠 P1 - Important for Production
- [ ] Test suite (unit tests for hooks)
- [ ] Integration tests (overlay layout test matrix)
- [ ] E2E tests (critical user flows)
- [x] Performance optimization (polling intervals, batching, memoization) - ✅ Completed
- [ ] Monitoring setup (error tracking, analytics)

## Authentication

### ✅ Completed
- [x] Supabase Auth integration
- [x] Email verification enabled
- [x] Session persistence (localStorage)
- [x] Protected routes with guards
- [x] Auto-profile creation on signup
- [x] RLS policies on all tables

### 🔥 P0 - Critical
- [x] Security audit (CORS, rate limiting) - ✅ Completed
- [ ] Error handling for auth failures
- [ ] Session timeout handling

### 🟠 P1 - Important
- [ ] Password reset flow (if not already implemented)
- [ ] Account deletion flow
- [ ] Email change flow

## Data Integration

### ✅ Completed
- [x] Server-side market data fetching (no CORS)
- [x] CoinGecko integration (crypto)
- [x] Yahoo Finance integration (stocks/ETFs)
- [x] In-memory caching (15s quotes, 60s market cap)
- [x] Retry logic with backoff
- [x] Market cap fetching (server-side)

### 🔥 P0 - Critical
- [x] Rate limiting on edge function - ✅ Completed
- [x] Better error handling for API failures - ✅ Completed (error types, toast notifications, retry function)
- [ ] Fallback strategies when data sources are down

### 🟠 P1 - Important
- [x] Request batching optimization - ✅ Completed (database updates batched)
- [x] Exponential backoff refinement - ✅ Completed (exponential backoff on errors)
- [ ] Cache invalidation strategy
- [ ] Database cleanup (unused columns: last_price, day_change, etc.)
- [x] Database indexes - ✅ Completed (performance indexes added)

## UI/UX

### ✅ Completed
- [x] Responsive design (Tailwind CSS)
- [x] Loading states and skeletons
- [x] Error states (unavailable quotes)
- [x] Overlay widget (4 corners, size, opacity, compact mode)
- [x] Toast notifications for user feedback

### 🔥 P0 - Critical
- [x] Retry UI for failed market data fetches - ✅ Completed (retry function exposed)
- [x] Better error messages (network vs unavailable vs invalid) - ✅ Completed (error type classification)
- [ ] Loading states for edge cases

### 🟠 P1 - Important
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit (WCAG compliance)
- [x] Performance optimization (React memoization) - ✅ Completed

## Testing

### ❌ Not Started
- [ ] Unit tests for hooks:
  - [ ] `useTickers` (CRUD operations)
  - [ ] `useMarketData` (polling, error handling)
  - [ ] `useProfile` (plan limits)
  - [ ] `useOverlaySettings` (persistence)
- [ ] Integration tests:
  - [ ] Overlay widget layout (test matrix from CHECKPOINTS.md)
  - [ ] Market data fetching flow
  - [ ] Auth flow (signup → login → protected route)
- [ ] E2E tests (Playwright/Cypress):
  - [ ] User signup → add ticker → view overlay
  - [ ] Plan limit enforcement
  - [ ] Overlay settings persistence

### 🟠 P1 - Important
- [ ] Test infrastructure setup (Vitest, React Testing Library)
- [ ] CI/CD integration for automated testing

## Deployment

### ❌ Not Started
- [ ] Environment variable setup:
  - [ ] `.env.example` file
  - [ ] Supabase project setup documentation
  - [ ] Deployment environment config
- [ ] CI/CD pipeline:
  - [ ] GitHub Actions / GitLab CI / etc.
  - [ ] Automated testing in pipeline
  - [ ] Build and deploy process
- [ ] Production environment:
  - [ ] Supabase project (production)
  - [ ] Domain setup
  - [ ] SSL certificates
  - [ ] CDN configuration (if needed)

### 🟠 P1 - Important
- [ ] Staging environment setup
- [ ] Database migration strategy
- [ ] Rollback procedures

## Documentation

### ✅ Completed
- [x] PRD (`docs/PRD.md`) - Comprehensive product requirements
- [x] CHECKPOINTS.md - Stable code checkpoints
- [x] Architecture Analysis (`docs/ARCHITECTURE_ANALYSIS.md`)
- [x] CURRENT_STATE.md (✅ DONE)

### 🔥 P0 - Critical
- [x] Fill CURRENT_STATE.md
- [x] Fill TODO.md
- [x] Create `.env.example` with required variables (documented in SETUP.md)
- [x] Supabase setup guide (SETUP.md)
- [ ] Deployment guide (partially in SETUP.md)

### 🟠 P1 - Important
- [ ] API documentation (edge function endpoints)
- [ ] Component documentation (overlay widget, etc.)
- [ ] Contributing guide
- [ ] Troubleshooting guide

## Security

### 🔥 P0 - Critical
- [x] Restrict CORS in edge function (specific origins, not `'*'`) - ✅ Completed
- [x] Add rate limiting to edge function endpoints - ✅ Completed
- [x] Input sanitization validation in edge function - ✅ Completed
- [ ] Security audit checklist

### 🟠 P1 - Important
- [ ] Dependency vulnerability scanning
- [ ] Secrets management (environment variables)
- [ ] HTTPS enforcement
- [ ] Content Security Policy (CSP) headers

## Monitoring & Observability

### ❌ Not Started
- [ ] Error tracking (Sentry, Rollbar, etc.)
- [ ] Analytics (basic usage tracking)
- [ ] Logging infrastructure
- [ ] Performance monitoring
- [ ] Uptime monitoring

### 🟠 P1 - Important
- [ ] Set up error tracking service
- [ ] Add analytics events (page views, feature usage)
- [ ] Log edge function errors with context
- [ ] Set up alerts for critical failures

## Post-MVP (Out of Scope for MVP)

### Future Enhancements
- [ ] Stripe billing integration
- [ ] Subscription management UI
- [ ] Mobile app (v2+)
- [ ] Alerts/notifications (SMS/email)
- [ ] Portfolio tracking (manual entry, per PRD)
- [ ] Charts/visualizations
- [ ] Export data functionality


