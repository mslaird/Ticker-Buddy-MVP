Ticker Buddy — Product Requirements Document (PRD)

Product Name: Ticker Buddy
Version: MVP → v1.0
Last Updated: 2026-01-05
Owner: Mark Laird
Status: Implementation-ready

⸻

1. Product Overview

1.1 What Ticker Buddy Is

Ticker Buddy is a read-only, always-on market monitoring application that allows users to:
	•	Track selected tickers (stocks, ETFs, crypto)
	•	View real-time price data and key metrics
	•	Display a floating, customizable overlay widget that stays visible while working
	•	Receive lightweight market awareness without portfolio execution or custody

Ticker Buddy is not a trading platform, not a broker, and not a portfolio custodian.

⸻

1.2 What Ticker Buddy Is Not (Hard Constraints)

Ticker Buddy explicitly does NOT:
	•	Execute trades
	•	Connect to brokerage accounts
	•	Access or store brokerage credentials
	•	Calculate P&L from actual holdings
	•	Represent user balances or positions
	•	Provide investment advice or recommendations

These constraints are intentional to:
	•	Avoid SEC / FINRA / broker-dealer regulation
	•	Keep compliance burden minimal
	•	Enable fast iteration and distribution

⸻

2. Target User

2.1 Primary User
	•	Retail investors
	•	Traders who want passive visibility
	•	Builders / professionals who want market awareness while working
	•	Crypto + equity crossover users

2.2 User Motivation
	•	“I want to see my tickers without opening a trading app”
	•	“I want awareness, not execution”
	•	“I want minimal distraction with maximum signal”

⸻

3. Core Value Proposition

“Your markets, always visible.”

Ticker Buddy is optimized for:
	•	Low cognitive load
	•	Persistent awareness
	•	Zero friction

⸻

4. MVP Feature Scope (Strict)

4.1 Authentication & Accounts

Required
	•	Email/password authentication via Supabase Auth
	•	Email verification enabled
	•	One user = one account
	•	One profile row per user (auto-created on signup)

Explicitly excluded
	•	Social login (v2+)
	•	Anonymous accounts (disabled)
	•	SSO

⸻

4.2 Subscription Tiers

Free Tier
	•	Up to 3 tickers
	•	Overlay enabled
	•	Default refresh interval
	•	Limited customization
	•	Upgrade CTA visible

Pro Tier (paid, logic-only for MVP)
	•	Up to 5 tickers
	•	Enhanced overlay settings
	•	Faster refresh interval
	•	Advanced metrics visibility
	•	Stripe integration out of scope for MVP billing
	•	Pro status is currently flag-based (profiles.plan = 'pro')

⸻

4.3 Ticker Management

Supported asset types
	•	Stocks
	•	ETFs
	•	Crypto

Ticker operations
	•	Add ticker
	•	Remove ticker
	•	Persist per-user
	•	Enforced per-plan limits

Data model
	•	tickers table (user-scoped, RLS enforced)
	•	No external account linkage

⸻

4.4 Market Data

Architecture
	•	All market data is fetched server-side via Supabase Edge Functions
	•	Client never calls third-party data providers directly

Supported providers
	•	Crypto: CoinGecko
	•	Stocks/ETFs: Yahoo Finance (read-only)

Caching
	•	In-memory cache
	•	15-second TTL (configurable)
	•	Prevents rate-limit abuse

Returned data (read-only)
	•	Price
	•	Daily change
	•	% change
	•	Market cap
	•	Volume (if available)
	•	52-week high/low (advanced)

⸻

4.5 Overlay Widget (Core Feature)

Behavior
	•	Floating UI component
	•	Always visible
	•	Click-through optional
	•	Updates automatically

Customization
	•	Position (corners)
	•	Size
	•	Opacity
	•	Compact mode
	•	Pin/unpin

Persistence
	•	Stored as overlay_settings JSONB in profiles
	•	Loaded on login

⸻

4.6 Dashboard

Sections
	•	My Tickers
	•	Overlay Preview
	•	Upgrade CTA
	•	Settings access

No charts in MVP
	•	Numbers only
	•	Minimal UI for speed

⸻

5. Data Model (Authoritative)

5.1 Tables

profiles
	•	id (uuid, PK)
	•	user_id (uuid, auth.users FK)
	•	plan (free | pro)
	•	overlay_settings (jsonb)
	•	created_at
	•	updated_at

tickers
	•	id
	•	user_id
	•	symbol
	•	asset_type
	•	created_at

Row-Level Security
	•	Users can only access their own rows
	•	No cross-user access under any circumstances

⸻

6. Security Requirements (Non-Negotiable)

6.1 Backend
	•	RLS enabled on all tables
	•	Edge functions validate:
	•	Auth session
	•	User ownership
	•	Input sanitization
	•	No secrets exposed client-side
	•	Only anon public key in frontend

⸻

6.2 Frontend
	•	No hardcoded secrets
	•	Environment variables via import.meta.env
	•	No third-party API calls directly from client

⸻

7. Regulatory Positioning (Critical)

Ticker Buddy is classified as:
	•	Market data visualization tool
	•	Read-only informational software

Ticker Buddy must never:
	•	Store trade history
	•	Represent positions
	•	Display balances
	•	Integrate brokerage APIs
	•	Compute realized/unrealized P&L

If portfolio tracking is ever introduced, it must be:
	•	Manual entry only
	•	Non-authoritative
	•	Clearly labeled as “tracking only”
	•	Version-gated and compliance-reviewed

⸻

8. Out of Scope (Explicit)

The following are intentionally excluded:
	•	Brokerage integrations (Plaid, Alpaca, Robinhood, etc.)
	•	Trade execution
	•	Portfolio syncing
	•	Tax reporting
	•	Financial advice
	•	Alerts via SMS/email (v2+)
	•	Mobile app (v2+)

Claude Code must not implement or suggest these features.

⸻

9. Success Criteria

MVP Success
	•	User can:
	•	Sign up
	•	Add tickers
	•	See live prices
	•	Use overlay
	•	Zero security warnings
	•	No auth leaks
	•	Stable performance

v1 Success
	•	Retention driven by overlay usage
	•	Clear upgrade conversion funnel
	•	No compliance risk flags

⸻

10. Engineering Constraints for Claude Code

Claude Code must:
	•	Follow this PRD exactly
	•	Ask before expanding scope
	•	Never assume trading or portfolio intent
	•	Preserve existing working functionality
	•	Avoid architectural rewrites unless explicitly requested

⸻

11. Canonical Source of Truth

This PRD supersedes:
	•	UI mockups
	•	Inline comments
	•	Verbal descriptions
	•	Tool assumptions

If something is unclear, do not guess — ask.