# Ticker Buddy MVP - Setup Guide

**Last Updated:** 2026-01-05

This guide will help you set up Ticker Buddy MVP for local development and production deployment.

---

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Git

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd Ticker-Buddy-MVP
npm install
```

### 2. Set Up Supabase Project

1. Create a new project at [https://app.supabase.com](https://app.supabase.com)
2. Note your project URL and anon key from **Settings → API**

### 3. Run Database Migrations

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

This will create:
- `profiles` table with RLS policies
- `tickers` table with RLS policies
- Triggers for auto-profile creation and timestamp updates

### 4. Deploy Edge Function

```bash
# Deploy the market-data edge function
supabase functions deploy market-data
```

### 5. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

**Where to find these:**
- Go to Supabase Dashboard → Your Project → Settings → API
- Copy "Project URL" → `VITE_SUPABASE_URL`
- Copy "anon public" key → `VITE_SUPABASE_PUBLISHABLE_KEY`

### 6. Configure Edge Function

Set environment variables in Supabase Dashboard:

1. Go to **Edge Functions → market-data → Settings**
2. Add environment variables:

**Required for Production:**
- `ALLOWED_ORIGINS`: Your production domain(s)
  - Example: `https://tickerbuddy.com,https://www.tickerbuddy.com`
  - Default: Allows localhost for development

**Optional:**
- `MARKET_DATA_PROVIDER`: `production` (default) or `mock`

Or via CLI:
```bash
# Set allowed origins for production
supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com

# Set market data provider (optional)
supabase secrets set MARKET_DATA_PROVIDER=production

# Configure rate limiting (optional, enabled by default)
supabase secrets set RATE_LIMIT_REQUESTS=100
supabase secrets set RATE_LIMIT_WINDOW_MS=60000
# To disable rate limiting (not recommended):
supabase secrets set RATE_LIMIT_ENABLED=false
```

**Options:**
- `MARKET_DATA_PROVIDER=production` (default): Uses real CoinGecko/Yahoo Finance APIs
- `MARKET_DATA_PROVIDER=mock`: Uses seeded random data for testing

### 7. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

---

## Environment Variables Reference

### Frontend (Vite)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_SUPABASE_URL` | ✅ Yes | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Yes | Supabase anon/public key | `eyJhbGciOiJIUzI1NiIs...` |

**Note:** Variables prefixed with `VITE_` are exposed to the browser. Access via `import.meta.env.VITE_SUPABASE_URL`.

### Edge Function (Deno)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MARKET_DATA_PROVIDER` | ❌ No | `production` | Data provider mode: `production` or `mock` |
| `ALLOWED_ORIGINS` | ❌ No | `localhost:8080,localhost:5173` | Comma-separated list of allowed CORS origins |
| `RATE_LIMIT_ENABLED` | ❌ No | `true` | Enable rate limiting (`true` or `false`) |
| `RATE_LIMIT_REQUESTS` | ❌ No | `100` | Max requests per time window |
| `RATE_LIMIT_WINDOW_MS` | ❌ No | `60000` | Time window in milliseconds (default: 1 minute) |
| `DENO_DEPLOYMENT_ID` | ❌ No | - | Auto-set by Deno Deploy (for detecting production) |

**Note:** Edge function variables are set in Supabase Dashboard or via CLI. Access via `Deno.env.get('VARIABLE_NAME')`.

**CORS Configuration:**
- By default, allows `localhost:8080` and `localhost:5173` for development
- For production, set `ALLOWED_ORIGINS` to your production domain(s)
- Example: `ALLOWED_ORIGINS=https://tickerbuddy.com,https://www.tickerbuddy.com`
- Set via CLI: `supabase secrets set ALLOWED_ORIGINS=https://yourdomain.com`

---

## Database Schema

### Tables

**profiles**
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users, unique)
- `email` (text)
- `display_name` (text, nullable)
- `plan` (text: 'free' | 'pro', default: 'free')
- `overlay_settings` (jsonb, default overlay config)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**tickers**
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `symbol` (text, e.g., 'AAPL', 'BTC')
- `asset_type` (text: 'stock' | 'crypto' | 'etf')
- `display_name` (text, nullable)
- `last_price` (numeric, nullable) - *May be unused*
- `day_change` (numeric, nullable) - *May be unused*
- `day_change_pct` (numeric, nullable) - *May be unused*
- `last_updated_at` (timestamp, nullable) - *May be unused*
- `created_at` (timestamp)
- `updated_at` (timestamp)
- Unique constraint: `(user_id, symbol)`

### Row-Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only SELECT/INSERT/UPDATE/DELETE their own rows
- No cross-user access under any circumstances

### Triggers

- `handle_new_user()`: Auto-creates profile when user signs up
- `update_updated_at_column()`: Auto-updates `updated_at` timestamp

---

## Testing Pro Plan Features

To test Pro plan features locally:

1. Sign up as a regular user (gets `free` plan by default)
2. Get your user ID from Supabase Dashboard → Authentication → Users
3. Update the profile in Supabase SQL Editor:

```sql
UPDATE profiles 
SET plan = 'pro' 
WHERE user_id = '<your-user-id>';
```

4. Refresh the app to see Pro features enabled (5 tickers, advanced metrics)

---

## Production Deployment

### 1. Build for Production

```bash
npm run build
```

This creates an optimized build in `dist/` directory.

### 2. Deploy Frontend

Deploy the `dist/` directory to your hosting provider:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **Cloudflare Pages**: Connect GitHub repo
- **Any static host**: Upload `dist/` folder

### 3. Configure Production Environment

Set environment variables in your hosting provider:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### 4. Verify Edge Function

Ensure `market-data` edge function is deployed and `MARKET_DATA_PROVIDER=production` is set.

---

## Troubleshooting

### "Failed to fetch market data"

- Check edge function is deployed: `supabase functions list`
- Verify `MARKET_DATA_PROVIDER` is set to `production`
- Check Supabase project is active (not paused)
- Review edge function logs: `supabase functions logs market-data`

### "Authentication failed"

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct
- Check Supabase project is active
- Ensure email verification is enabled in Supabase Dashboard

### "Cannot add more tickers"

- Check plan limit (free: 3, pro: 5)
- Verify `profiles.plan` in database
- Check `useProfile.getTickerLimit()` logic

### Overlay widget not appearing

- Check `overlay_settings.pinned` is `true` in database
- Verify overlay page is open (`/overlay`)
- Check browser console for errors
- Ensure `settings.pinned` is true in `useOverlaySettings`

---

## Next Steps

After setup, see:
- `docs/PRD.md` - Product requirements
- `docs/ARCHITECTURE_ANALYSIS.md` - System architecture
- `docs/migration/CURRENT_STATE.md` - Current state
- `docs/migration/TODO.md` - MVP completion checklist
- `CHECKPOINTS.md` - Stable code checkpoints

---

## Support

For issues or questions:
1. Check `docs/migration/CURRENT_STATE.md` for known issues
2. Review `CHECKPOINTS.md` for stable code areas
3. Consult `docs/ARCHITECTURE_ANALYSIS.md` for system understanding

