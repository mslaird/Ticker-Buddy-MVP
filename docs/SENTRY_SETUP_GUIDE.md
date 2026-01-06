# Sentry Setup Guide - Quick Start

**Time Required:** 10 minutes
**Difficulty:** Easy

---

## Step 1: Create Sentry Account (3 minutes)

1. Go to **https://sentry.io/signup/**
2. Sign up with email or GitHub
3. Create organization:
   - Name: **Your Company** or **Personal**
   - Click "Create Organization"

---

## Step 2: Create Project (2 minutes)

1. Click "**Create Project**"
2. Choose platform: **React**
3. Set project name: **ticker-buddy**
4. Set alert frequency: **On every new issue**
5. Click "**Create Project**"

6. **Copy your DSN** from the setup page:
   ```
   https://abc123@o123456.ingest.sentry.io/789456
   ```

---

## Step 3: Configure Environment (2 minutes)

### Local Development

1. Create `.env.local` file (if it doesn't exist):
   ```bash
   cp .env.example .env.local
   ```

2. Add your Sentry DSN:
   ```bash
   VITE_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/789456
   VITE_SENTRY_ENABLE_DEV=false
   VITE_APP_VERSION=1.0.0
   ```

### Production (Vercel/Netlify)

1. Go to your hosting platform settings
2. Add environment variables:
   ```
   VITE_SENTRY_DSN = https://abc123@o123456.ingest.sentry.io/789456
   VITE_APP_VERSION = 1.0.0
   ```

3. Redeploy your app

---

## Step 4: Verify Setup (3 minutes)

### Test in Development (Optional)

1. Enable Sentry in dev mode:
   ```bash
   # In .env.local
   VITE_SENTRY_ENABLE_DEV=true
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Check browser console:
   ```
   ✅ [Sentry] Initialized successfully
   ```

4. Test error capture:
   - Add temporary button: `<button onClick={() => { throw new Error('Test'); }}>Test</button>`
   - Click button
   - Check Sentry dashboard: https://sentry.io/organizations/[your-org]/issues/

5. **Important:** Remove test button and set `VITE_SENTRY_ENABLE_DEV=false`

### Test in Production

1. Deploy to production with Sentry DSN configured
2. Visit your production app
3. Open browser DevTools → Console
4. Look for: `[Sentry] Initialized successfully`
5. Wait 24 hours for real errors (or test with the button above)

---

## Step 5: Configure Alerts (Optional)

1. Go to **Settings → Alerts**
2. Create alert rule:
   - Name: "New Critical Errors"
   - Condition: "When an event is first seen"
   - Action: "Send notification to email"
3. Save

---

## Verification Checklist

- [ ] Sentry account created
- [ ] Project "ticker-buddy" exists
- [ ] DSN copied and saved securely
- [ ] `.env.local` configured (development)
- [ ] Production environment variables set
- [ ] App builds without errors: `npm run build`
- [ ] Console shows "[Sentry] Initialized successfully"
- [ ] Test error appears in Sentry dashboard (optional)

---

## Troubleshooting

### "DSN not configured" warning

**Problem:** Missing environment variable
**Solution:** Check `.env.local` has `VITE_SENTRY_DSN=...`

### Errors not appearing in Sentry

**Checklist:**
1. DSN is correct
2. App is in production mode (or `VITE_SENTRY_ENABLE_DEV=true`)
3. Wait 1-2 minutes for Sentry ingestion
4. Check network tab for requests to `sentry.io`

### "Sentry skipped initialization"

**Cause:** Running in development mode without `VITE_SENTRY_ENABLE_DEV=true`
**This is normal:** Sentry only runs in production by default to avoid noise

---

## Cost

**Free Plan Includes:**
- 5,000 errors/month
- 50 session replays/month
- 10,000 performance traces/month
- 30 days data retention
- Unlimited team members

**Your Expected Usage:**
- ~100-500 errors/month (0.1% error rate)
- ~10 replays/month
- ~1,000 traces/month

**Result:** ✅ Free plan is sufficient for MVP

---

## Next Steps

1. **Monitor Daily:** Check Sentry dashboard for new issues
2. **Triage Weekly:** Review top errors and plan fixes
3. **Enable Source Maps:** For readable stack traces (see P2_ERROR_MONITORING.md)
4. **Set Up Slack:** Get error notifications in Slack (optional)

---

## Support

- **Full Documentation:** `docs/P2_ERROR_MONITORING.md`
- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Sentry Status:** https://status.sentry.io/

**Setup Guide Version:** 1.0
**Last Updated:** 2026-01-05
