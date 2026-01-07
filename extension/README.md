# Ticker Buddy Chrome Extension

**Your always-on market overlay, now on every website.**

This Chrome extension brings the Ticker Buddy overlay to every website you visit, allowing you to monitor your tickers while browsing Gmail, Twitter, Reddit, or any other site.

---

## Features

- ✅ **Universal Overlay** — Shows your tickers on EVERY website
- ✅ **Synced Settings** — Uses your Ticker Buddy account settings
- ✅ **Real-Time Updates** — Polls market data every 15 seconds (configurable)
- ✅ **Privacy-First** — Uses Shadow DOM to avoid interfering with websites
- ✅ **Lightweight** — Minimal performance impact
- ✅ **Auto-Auth** — Shares authentication with web app (no separate login)

---

## Installation (Development)

### Prerequisites

- Node.js 18+ installed
- Chrome browser
- Ticker Buddy account (from main web app)

### Setup Steps

1. **Navigate to extension directory:**
   ```bash
   cd extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your Supabase credentials from the main project
   ```

4. **Build the extension:**
   ```bash
   npm run build
   ```

5. **Load extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `extension/dist` folder
   - Extension should now appear in your toolbar

6. **Sign in:**
   - Click the Ticker Buddy extension icon
   - Click "Sign In" to open the web app
   - Sign in to your Ticker Buddy account
   - Extension will automatically sync your tickers and settings

---

## Development

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build
```

### Project Structure

```
extension/
├── manifest.json              # Extension configuration
├── src/
│   ├── background.ts          # Service worker (API calls, auth)
│   ├── content.ts             # Injects overlay into pages
│   ├── OverlayApp.tsx         # Main React app
│   ├── popup.html             # Extension popup UI
│   ├── popup.ts               # Popup logic
│   ├── content.css            # Tailwind styles
│   └── components/
│       └── OverlayWidget.tsx  # Overlay component (simplified)
├── public/
│   ├── icon-16.png            # Extension icon (16x16)
│   ├── icon-48.png            # Extension icon (48x48)
│   └── icon-128.png           # Extension icon (128x128)
└── dist/                      # Built extension (load this in Chrome)
```

### How It Works

1. **Background Service Worker** (`background.ts`)
   - Manages Supabase authentication
   - Fetches tickers from database
   - Fetches market data from edge function
   - Coordinates with content scripts

2. **Content Script** (`content.ts`)
   - Injects React app into every webpage
   - Uses Shadow DOM to prevent style conflicts
   - Listens for auth state changes

3. **React App** (`OverlayApp.tsx`)
   - Renders OverlayWidget component
   - Communicates with background via Chrome messaging API
   - Polls for market data at configured interval

4. **Popup** (`popup.html`)
   - Quick status view (authenticated, ticker count)
   - Links to web app settings
   - Minimal UI for extension toolbar

---

## Usage

### After Installation

1. **Add Tickers** — Open the web app and add tickers to your dashboard
2. **Configure Overlay** — Go to web app → Overlay page to set position, size, etc.
3. **Browse Normally** — Overlay will appear on all websites automatically

### Settings

All settings are managed through the web app:
- **Position** — top-left, top-right, bottom-left, bottom-right
- **Size** — small, medium, large
- **Compact Mode** — toggle dense layout
- **Opacity** — 0-100%
- **Refresh Interval** — 15-300 seconds
- **Pinned** — show/hide overlay

Changes sync automatically to the extension.

### Extension Popup

Click the extension icon to:
- View authentication status
- See ticker count
- Open Dashboard (manage tickers)
- Open Overlay settings

---

## Troubleshooting

### Overlay Not Showing

**Check:**
1. ✅ Are you signed in? (Click extension icon)
2. ✅ Do you have tickers added? (Open Dashboard)
3. ✅ Is overlay pinned? (Overlay settings page)
4. ✅ Check browser console for errors (F12 → Console)

**Solution:**
- Extension popup → "Open Dashboard" → Add tickers
- Extension popup → "Overlay Settings" → Ensure "Pinned" is ON

### Auth Issues

**Symptom:** Extension says "Not signed in"

**Solution:**
1. Open web app in a new tab
2. Sign in normally
3. Click extension icon again
4. Should now show "Overlay Active"

**Why:** Extension shares cookies/session with web app. If you sign out of the web app, you sign out of the extension.

### Data Not Updating

**Check:**
- Browser console for API errors
- Supabase credentials in `.env` file
- Network tab (F12 → Network) for failed requests

**Solution:**
- Ensure `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Rebuild extension: `npm run build`
- Reload extension in `chrome://extensions/`

### Performance Issues

**Symptom:** Websites loading slowly

**Check:**
- Refresh interval (lower = more requests)
- Number of tickers (5+ may impact performance)

**Solution:**
- Increase refresh interval to 60+ seconds
- Reduce ticker count
- Use compact mode for smaller overlay

---

## Publishing to Chrome Web Store

### Prepare for Production

1. **Create Icons:**
   - Replace placeholder icons in `public/` with professional designs
   - Follow `public/ICONS_TODO.md` guidelines
   - Use Ticker Buddy brand colors (purple/blue gradient)

2. **Update Manifest:**
   - Set correct extension name and description
   - Update `version` number
   - Add proper permissions justification

3. **Test Thoroughly:**
   - Test on various websites (Gmail, Twitter, YouTube, etc.)
   - Test auth flow (sign in/out)
   - Test with 0, 1, 3, 5 tickers
   - Test all overlay settings (position, size, opacity)
   - Test on slow connections

4. **Build Production:**
   ```bash
   npm run build
   ```

5. **Create ZIP:**
   ```bash
   cd dist
   zip -r ../ticker-buddy-extension.zip *
   ```

### Chrome Web Store Submission

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay one-time $5 developer registration fee
3. Click "New Item"
4. Upload `ticker-buddy-extension.zip`
5. Fill in store listing:
   - **Name:** Ticker Buddy
   - **Summary:** Your always-on market overlay, now on every website
   - **Description:** (See below)
   - **Screenshots:** Overlay on popular websites (Gmail, Twitter, etc.)
   - **Category:** Productivity
   - **Language:** English
6. Privacy policy URL: (Link to Ticker Buddy privacy policy)
7. Submit for review (typically 1-3 days)

### Store Listing Description

```
Ticker Buddy brings your favorite stock and crypto tickers to every website you visit.

✨ FEATURES
• Real-time ticker overlay on ALL websites
• Syncs with your Ticker Buddy account
• Customizable position, size, and appearance
• Live market data (stocks & crypto)
• Privacy-first: No tracking, no ads

🚀 HOW IT WORKS
1. Install extension
2. Sign in to Ticker Buddy
3. Add tickers on the web app
4. Overlay appears on every website automatically

📊 PERFECT FOR
• Day traders monitoring positions
• Crypto enthusiasts tracking portfolios
• Casual investors staying informed
• Anyone who wants market data always visible

🔒 PRIVACY
• No data collection
• No third-party tracking
• Uses Shadow DOM to avoid site conflicts
• Open source (link to GitHub)

💎 FREE & PRO PLANS
• Free: 3 tickers
• Pro: 5 tickers + enhanced data

Questions? support@tickerbuddy.app
```

---

## Roadmap

### Week 1 (Current)
- [x] Chrome extension MVP
- [x] Authentication via Supabase
- [x] Overlay injection with Shadow DOM
- [x] Settings sync from web app
- [x] Popup UI

### Week 2
- [ ] Firefox extension port
- [ ] Edge extension port (Chromium-based, should be easy)
- [ ] Safari extension (requires Swift wrapper)

### Week 3
- [ ] Desktop app (Tauri) — works outside browser
- [ ] System tray integration
- [ ] Auto-start on login
- [ ] Always-on-top mode

### Future Enhancements
- [ ] Tab coordination (prevent multi-tab quota exhaustion)
- [ ] Offline mode (cache last known prices)
- [ ] Keyboard shortcuts (toggle overlay visibility)
- [ ] Multiple overlay positions simultaneously
- [ ] Theme customization (light mode, custom colors)
- [ ] Export ticker data (CSV, JSON)

---

## Architecture Notes

### Why Shadow DOM?

Shadow DOM encapsulates the overlay's styles and prevents conflicts with host website styles. This means:
- Ticker Buddy's Tailwind classes don't interfere with the website
- Website's CSS doesn't break the overlay
- JavaScript scoping prevents variable collisions

### Why Chrome Messages API?

Content scripts cannot directly access browser storage or make cross-origin requests. The background service worker acts as a proxy:

```
Content Script → [Chrome Message] → Background Worker → Supabase
                ← [Chrome Message] ←
```

This architecture:
- Keeps auth tokens secure (only background has access)
- Reduces content script bundle size
- Enables future features (notifications, alarms)

### Performance Considerations

- **Bundle Size:** ~150KB (React + Supabase SDK)
- **Memory:** ~5MB per tab (React app overhead)
- **Network:** 1 request per refresh interval (default 15s)
- **CPU:** Minimal (React re-renders only on data changes)

To optimize:
- Consider using Preact instead of React (~30KB savings)
- Implement tab coordination to share data across tabs
- Use service worker cache for offline mode

---

## Support

- **Bug Reports:** GitHub Issues
- **Feature Requests:** GitHub Discussions
- **Email:** support@tickerbuddy.app
- **Discord:** (Coming soon)

---

## License

MIT License - See main project LICENSE file

---

## Credits

**Built with:**
- React 18
- TypeScript
- Tailwind CSS
- Supabase
- Vite
- Chrome Extensions Manifest V3

**Created by:** Ticker Buddy Team
**Version:** 1.0.0
**Last Updated:** 2026-01-06
