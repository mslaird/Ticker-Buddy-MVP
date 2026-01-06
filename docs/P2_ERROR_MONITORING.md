# P2 Error Monitoring Implementation

**Date:** 2026-01-05
**Status:** ✅ Complete
**Build Status:** Pending verification

---

## Overview

Comprehensive error monitoring has been implemented using Sentry for the frontend and enhanced logging for edge functions. This provides full visibility into production errors, crashes, and API failures.

---

## What Was Implemented

### ✅ 1. Sentry Frontend Integration

**Files Created:**
- `src/lib/sentry.ts` — Sentry configuration and utilities
- `src/components/ErrorBoundary.tsx` — React error boundary with Sentry integration

**Files Modified:**
- `src/main.tsx` — Initialize Sentry before app starts
- `src/App.tsx` — Wrap app with ErrorBoundary
- `src/contexts/AuthContext.tsx` — Track user context in Sentry
- `src/hooks/useMarketData.ts` — Report market data errors

**NPM Packages Added:**
- `@sentry/react` — Sentry React SDK
- `@sentry/vite-plugin` — Source maps and release tracking

---

### ✅ 2. Error Tracking Coverage

**Frontend Errors Captured:**

1. **React Component Crashes** (via ErrorBoundary)
   - Unhandled exceptions in components
   - Render errors
   - Lifecycle method failures
   - Component stack traces

2. **Market Data Failures** (via useMarketData hook)
   - Edge function errors (500, rate limits, unknown)
   - Ticker count and error count context
   - Excludes network errors (user offline, etc.)

3. **Database Update Failures** (via useMarketData hook)
   - Silent ticker price update failures
   - Reported with ticker count context

4. **Authentication Context** (via AuthContext)
   - User ID and email attached to all errors
   - Cleared on logout for privacy

**Edge Function Logging:**

1. **Structured Error Logging** (market-data function)
   - Full error stack traces
   - Request origin and user agent
   - Timestamp for correlation
   - JSON formatted for log aggregation

2. **Yahoo API Failures**
   - Network errors logged as warnings
   - Helps identify provider outages

---

### ✅ 3. Privacy & Performance Configuration

**Privacy Settings:**
- Session replay masks all text content (`maskAllText: true`)
- Session replay blocks all media (`blockAllMedia: true`)
- User context cleared on logout
- Network errors not sent (user privacy)
- Auth errors filtered out (expected errors)

**Performance Settings:**
- Traces sample rate: 10% in production, 100% in dev
- Error sample rate: 100% (errors are cheap)
- Session replay: 10% normal sessions, 100% on error
- Replay captures 60 seconds before error

**Error Filtering:**
- ❌ Network request failed (user offline)
- ❌ Failed to fetch (CORS, network issues)
- ❌ Load failed (user-side issues)
- ❌ Invalid login credentials (expected auth error)
- ✅ All other errors sent to Sentry

---

## Setup Instructions

### Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Create a new organization
3. Create a new project:
   - Platform: **React**
   - Name: **Ticker Buddy**
   - Alert frequency: **On every new issue**

### Step 2: Get Your DSN

1. After project creation, copy your DSN
   - Format: `https://[key]@[org].ingest.sentry.io/[project]`
2. Keep this private (it's a public key but still sensitive)

### Step 3: Configure Environment Variables

Add to `.env.local` (local development):
```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://your-sentry-dsn-here
VITE_SENTRY_ENABLE_DEV=false  # Set to 'true' to test Sentry locally
VITE_APP_VERSION=1.0.0  # Increment with each release
```

Add to production environment (Vercel/Netlify):
```bash
VITE_SENTRY_DSN=https://your-sentry-dsn-here
VITE_APP_VERSION=1.0.0
```

**Security Note:** The DSN is intentionally public-facing (it's used in browser code). Rate limiting is enforced by Sentry.

### Step 4: Verify Installation

```bash
# Build the app to check for errors
npm run build

# Should see in build output:
# [Sentry] Initialized successfully (in production)
# [Sentry] Skipped initialization (in dev, unless VITE_SENTRY_ENABLE_DEV=true)
```

### Step 5: Test Error Capture (Optional)

Add this temporary button to test error capture:

```tsx
// In src/pages/Dashboard.tsx (temporarily)
<button onClick={() => { throw new Error('Test Sentry error'); }}>
  Test Error
</button>
```

Click the button → Error should appear in Sentry dashboard within 1 minute.

---

## Error Monitoring Dashboard

### Accessing Sentry

1. **Dashboard:** https://sentry.io/organizations/[your-org]/issues/
2. **Project:** Select "Ticker Buddy"
3. **Issues:** View all errors, sorted by frequency

### Key Metrics to Monitor

**Daily:**
- [ ] New issues (should be 0 in stable periods)
- [ ] Error rate trend (should be flat or decreasing)
- [ ] Most common errors (identify patterns)

**Weekly:**
- [ ] User impact (how many users affected)
- [ ] Error frequency by version
- [ ] Release health (crash-free sessions %)

**Monthly:**
- [ ] Long-term error trends
- [ ] Performance impact of errors
- [ ] User retention after errors

---

## Error Types and Responses

### Critical Errors (Immediate Action Required)

**React Component Crash**
- **Symptom:** User sees error boundary fallback UI
- **Sentry:** Tagged with component stack trace
- **Action:** Fix within 24 hours, deploy hotfix if widespread

**Edge Function 500 Error**
- **Symptom:** Market data stops updating
- **Sentry:** Captured from useMarketData hook
- **Action:** Check Supabase logs, verify Yahoo/CoinGecko APIs

**Database Update Failures**
- **Symptom:** Ticker prices not persisting
- **Sentry:** Tagged with ticker count
- **Action:** Check RLS policies, verify Supabase connection

### Warning Errors (Monitor, No Immediate Action)

**Rate Limit Exceeded**
- **Symptom:** Temporary pause in updates
- **Sentry:** Not sent (expected behavior)
- **Action:** Monitor frequency, increase limits if common

**Yahoo API Network Error**
- **Symptom:** Stock quotes unavailable
- **Edge Function:** Logged as warning
- **Action:** Wait for Yahoo to recover, consider fallback provider (P3.3)

**Profile Creation Retry**
- **Symptom:** Slight signup delay (~1-2 seconds)
- **Sentry:** Not sent (expected behavior, retries handle it)
- **Action:** Monitor retry count, investigate if >3 retries common

---

## Monitoring Checklist

### Daily (5 minutes)
- [ ] Check Sentry for new issues
- [ ] Review error rate graph
- [ ] Triage critical errors
- [ ] Verify no spike in edge function errors

### Weekly (15 minutes)
- [ ] Review top 10 errors by volume
- [ ] Check user impact metrics
- [ ] Verify release health %
- [ ] Update error documentation

### Monthly (30 minutes)
- [ ] Review error trends
- [ ] Analyze error patterns
- [ ] Plan fixes for recurring issues
- [ ] Update Sentry alert rules

---

## Advanced Features (Future Enhancements)

### Source Maps (Recommended)

Enable source maps for readable stack traces:

1. Update `vite.config.ts`:
```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  build: {
    sourcemap: true, // Enable source maps
  },
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'your-org',
      project: 'ticker-buddy',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

2. Add to `.env.local`:
```bash
SENTRY_AUTH_TOKEN=your-auth-token-here
```

3. Source maps uploaded automatically on `npm run build`

### Performance Monitoring

Already enabled at 10% sample rate. View in Sentry:
- **Performance → Transactions**
- See page load times
- Identify slow API calls
- Optimize critical paths

### User Feedback

Add user feedback widget:

```typescript
import { Feedback } from '@sentry/react';

// In App.tsx
<Feedback
  colorScheme="light"
  showBranding={false}
  triggerLabel="Report a Problem"
/>
```

---

## Troubleshooting

### "Sentry not initialized" in console

**Cause:** Missing `VITE_SENTRY_DSN` environment variable
**Fix:** Add DSN to `.env.local` or production environment

### Errors not appearing in Sentry

**Checklist:**
1. ✅ DSN is correct and not expired
2. ✅ Error is not filtered out (check `beforeSend` in sentry.ts)
3. ✅ App is in production mode (or `VITE_SENTRY_ENABLE_DEV=true`)
4. ✅ Network allows requests to sentry.io
5. ✅ Wait 1-2 minutes for Sentry ingestion

### Too many errors flooding Sentry

**Solutions:**
1. Add more filters to `beforeSend` function
2. Reduce error sample rate (currently 100%)
3. Use Sentry's rate limiting features
4. Fix the underlying issue causing errors

### Source maps not working

**Checklist:**
1. ✅ `build.sourcemap: true` in vite.config.ts
2. ✅ `@sentry/vite-plugin` installed and configured
3. ✅ `SENTRY_AUTH_TOKEN` environment variable set
4. ✅ Build command runs without errors

---

## Cost & Limits

### Sentry Free Plan
- **Events:** 5,000 errors/month
- **Replay Sessions:** 50/month
- **Performance Traces:** 10,000/month
- **Data Retention:** 30 days
- **Team Members:** Unlimited

**Estimated Usage (Ticker Buddy MVP):**
- Errors: ~100-500/month (assuming 0.1% error rate)
- Replays: ~10/month (errors only)
- Traces: ~1,000/month (10% sample rate)

**Result:** Free plan is sufficient for MVP stage.

### Upgrade Triggers
Consider paid plan ($26/month) if:
- Errors exceed 5,000/month (high traffic or bugs)
- Need longer data retention (90 days)
- Want higher replay sample rate
- Require priority support

---

## Files Changed Summary

### New Files
- ✅ `src/lib/sentry.ts` (289 lines)
- ✅ `src/components/ErrorBoundary.tsx` (186 lines)
- ✅ `docs/P2_ERROR_MONITORING.md` (this file)

### Modified Files
- ✅ `src/main.tsx` (2 lines added)
- ✅ `src/App.tsx` (2 lines added)
- ✅ `src/contexts/AuthContext.tsx` (12 lines added)
- ✅ `src/hooks/useMarketData.ts` (20 lines added)
- ✅ `supabase/functions/market-data/index.ts` (18 lines added)

### Dependencies Added
- ✅ `@sentry/react@^8.x`
- ✅ `@sentry/vite-plugin@^2.x`

---

## Next Steps

### Immediate (Before Deploy)
1. [ ] Create Sentry account and project
2. [ ] Add `VITE_SENTRY_DSN` to environment variables
3. [ ] Test error capture in staging
4. [ ] Verify errors appear in Sentry dashboard
5. [ ] Build and deploy to production

### After Deployment (24 hours)
1. [ ] Monitor Sentry for first errors
2. [ ] Verify user context is attached
3. [ ] Check error rate is acceptable (<0.1%)
4. [ ] Triage any critical issues

### Week 1
1. [ ] Set up Sentry email alerts
2. [ ] Configure Slack integration (optional)
3. [ ] Review top errors and plan fixes
4. [ ] Document common error patterns

### Future Enhancements
1. [ ] Enable source maps for readable stack traces
2. [ ] Add user feedback widget
3. [ ] Set up custom alerts for critical errors
4. [ ] Implement P2.2 (rate limit metrics)

---

## Support Resources

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Sentry Status:** https://status.sentry.io/
- **Integration Guide:** This document
- **Error Tracking Best Practices:** https://blog.sentry.io/

**Implementation completed:** 2026-01-05
**Deployed by:** Claude Code (Opus 4.5)
**Status:** ✅ Ready for deployment (pending Sentry DSN configuration)
