# Ticker Buddy Extension - Testing Guide

This guide will help you test the Chrome extension locally.

---

## Prerequisites

✅ **Completed:**
- [x] Extension built successfully
- [x] Dependencies installed
- [x] Environment variables configured

✅ **Required:**
- [ ] Chrome browser installed
- [ ] Ticker Buddy account (from main web app)
- [ ] At least 1 ticker added in Dashboard

---

## Loading the Extension in Chrome

### Step 1: Open Chrome Extensions Page

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. OR click the three dots menu → More Tools → Extensions

### Step 2: Enable Developer Mode

1. Look for "Developer mode" toggle in the top-right corner
2. Turn it ON (should turn blue)

### Step 3: Load Unpacked Extension

1. Click "Load unpacked" button (appears after enabling Developer mode)
2. Navigate to: `/Users/markstevenlaird/dev/Ticker-Buddy-MVP/extension/dist`
3. Click "Select"

### Step 4: Verify Installation

✅ You should see:
- **Name:** Ticker Buddy
- **Version:** 1.0.0
- **Description:** Your always-on market overlay, now on every website
- **ID:** A random extension ID (e.g., `abcdefghijklmnopqrstuvwxyz123456`)
- **Icon:** Purple gradient "TB" icon

---

## Testing Checklist

### Test 1: Extension Popup

1. Click the Ticker Buddy extension icon in Chrome toolbar
2. **Expected behavior:**
   - If NOT signed in:
     - Shows "You're not signed in" error
     - Shows "Sign In" button
   - If signed in:
     - Shows "Overlay Active" (green dot) or "Overlay Hidden"
     - Shows ticker count (e.g., "Tracking 3 tickers")
     - Shows email and plan (Pro or Free)
     - Shows "Open Dashboard" and "Overlay Settings" buttons

**✅ Pass / ❌ Fail:**

---

### Test 2: Authentication Flow

1. If not signed in, click "Sign In" button in popup
2. New tab opens to Ticker Buddy web app login page
3. Sign in with your credentials
4. Close the tab
5. Click extension icon again
6. **Expected:** Should now show authenticated state

**✅ Pass / ❌ Fail:**

---

### Test 3: Overlay Injection

1. Ensure you're signed in and have at least 1 ticker added
2. Go to Ticker Buddy web app → Overlay page
3. Ensure "Pinned" toggle is ON
4. Visit any website (e.g., https://google.com)
5. **Expected:**
   - Overlay appears in configured corner (default: bottom-right)
   - Shows "TICKER BUDDY" header
   - Shows your tickers with prices and % changes
   - Updates every 15 seconds (or configured interval)

**✅ Pass / ❌ Fail:**

---

### Test 4: Overlay on Multiple Websites

Visit these websites and verify overlay appears on ALL of them:

- [ ] https://gmail.com
- [ ] https://twitter.com
- [ ] https://reddit.com
- [ ] https://github.com
- [ ] https://youtube.com

**Expected:** Overlay should appear consistently in the same position on all sites

**✅ Pass / ❌ Fail:**

---

### Test 5: Settings Sync

1. Open Ticker Buddy web app → Overlay page
2. Change overlay settings:
   - Position: top-left
   - Size: large
   - Opacity: 50%
3. Refresh any website
4. **Expected:** Overlay reflects new settings immediately

**✅ Pass / ❌ Fail:**

---

### Test 6: Real-Time Data Updates

1. Find a ticker with actively changing price (crypto works best)
2. Watch the overlay for 30 seconds
3. **Expected:**
   - Price updates every ~15 seconds
   - % change updates accordingly
   - Green/red indicator shows gain/loss

**✅ Pass / ❌ Fail:**

---

### Test 7: No Tickers Scenario

1. Go to Dashboard and delete all tickers
2. Visit any website
3. **Expected:**
   - Overlay still appears
   - Shows "No tickers added" message

**✅ Pass / ❌ Fail:**

---

### Test 8: Toggle Overlay Visibility

1. Go to Overlay settings page
2. Turn "Pinned" toggle OFF
3. Visit any website
4. **Expected:** Overlay does NOT appear
5. Turn "Pinned" back ON
6. Refresh page
7. **Expected:** Overlay reappears

**✅ Pass / ❌ Fail:**

---

### Test 9: Click Ticker → Opens Settings

1. Visit any website with overlay visible
2. Click on a ticker in the overlay
3. **Expected:**
   - New tab opens to Ticker Buddy Overlay settings page
   - OR Dashboard page (depending on implementation)

**✅ Pass / ❌ Fail:**

---

### Test 10: Extension Icon Click → Dashboard

1. Click extension icon to open popup
2. Click "Open Dashboard" button
3. **Expected:** New tab opens to Dashboard

**✅ Pass / ❌ Fail:**

---

## Debugging Common Issues

### Issue: Overlay Not Showing

**Check:**
1. Is "Pinned" ON in Overlay settings?
2. Are you signed in? (Check popup)
3. Do you have tickers added? (Check Dashboard)
4. Check browser console (F12) for errors

**Debug Steps:**
```
1. Right-click on webpage → Inspect → Console
2. Look for "[Ticker Buddy]" messages
3. Should see:
   - "[Ticker Buddy] Content script loaded"
   - "[Ticker Buddy] Overlay injected successfully"
```

---

### Issue: Authentication Not Working

**Check:**
1. Are you signed in to the web app?
2. Extension shares cookies with web app
3. Try signing out and back in

**Debug Steps:**
```
1. Open extension popup
2. Right-click inside popup → Inspect
3. Go to Console tab
4. Look for auth errors
```

---

### Issue: Data Not Updating

**Check:**
1. Network tab shows API requests every 15s?
2. Are requests failing (429, 500 errors)?
3. Check Supabase credentials in .env file

**Debug Steps:**
```
1. F12 → Network tab
2. Filter: "market-data"
3. Watch for requests every ~15 seconds
4. Check response status (should be 200)
```

---

### Issue: Wrong Prices/Data

**Check:**
1. Compare with web app Dashboard
2. If both wrong, it's an API issue (not extension)
3. Check ticker symbols are correct

---

### Issue: Extension Error Badge

**If extension icon shows error badge:**

1. Go to `chrome://extensions/`
2. Find Ticker Buddy
3. Click "Errors" button
4. Read error messages
5. Common fixes:
   - Reload extension (circular arrow button)
   - Remove and re-add extension
   - Rebuild extension (`npm run build`)

---

## Performance Testing

### Memory Usage

1. Open Chrome Task Manager:
   - Menu → More Tools → Task Manager
   - OR press Shift + Esc
2. Find "Extension: Ticker Buddy"
3. **Expected:** <10 MB memory usage per tab

### CPU Usage

1. Same Task Manager as above
2. Watch CPU % while overlay is visible
3. **Expected:** <1% CPU when idle, brief spikes during updates

### Network Usage

1. F12 → Network tab
2. Watch requests over 1 minute
3. **Expected:**
   - ~4 requests per minute (every 15s)
   - Each request <5KB
   - Total: <20KB/min

---

## Test Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Extension Popup | ⬜ | |
| Authentication Flow | ⬜ | |
| Overlay Injection | ⬜ | |
| Multiple Websites | ⬜ | |
| Settings Sync | ⬜ | |
| Real-Time Updates | ⬜ | |
| No Tickers | ⬜ | |
| Toggle Visibility | ⬜ | |
| Click Ticker | ⬜ | |
| Dashboard Link | ⬜ | |

**Overall Status:** ⬜ Pass / ⬜ Fail

---

## Next Steps After Testing

### If All Tests Pass ✅

1. **Document any bugs found** (even minor ones)
2. **Test on different websites** (especially complex SPAs)
3. **Test with Pro account** (if applicable)
4. **Stress test** with 5 tickers and fast refresh interval

### If Tests Fail ❌

1. **Document the failure** (screenshot, console errors)
2. **Check extension console** for errors
3. **Check background service worker** console:
   - `chrome://extensions/`
   - Click "service worker" link under Ticker Buddy
   - Check console for background script errors
4. **Report issues** with full details

---

## Advanced Debugging

### Inspect Background Service Worker

```
1. chrome://extensions/
2. Find "Ticker Buddy"
3. Click "service worker" (blue link)
4. Console opens → see background.js logs
5. Check for Supabase auth errors, API failures
```

### Inspect Content Script

```
1. Visit any website
2. F12 → Console
3. Filter: "[Ticker Buddy]"
4. See injection and update logs
```

### Check Network Requests

```
1. F12 → Network tab
2. Filter: "supabase.co" or "market-data"
3. Click on requests to see:
   - Request headers (auth token)
   - Response data (quotes)
   - Response time
```

---

## Known Limitations (MVP)

1. **No Shadow DOM** - Overlay styles might conflict with some websites
2. **No offline mode** - Requires active internet connection
3. **No tab coordination** - Multiple tabs each make separate API requests
4. **No rate limit UI** - Rate limits tracked in background but not shown
5. **Fixed polling** - No adaptive polling based on user activity

These will be addressed in future updates.

---

## Clean Up After Testing

### Remove Test Data

```
1. Go to Dashboard
2. Delete test tickers
3. OR keep for ongoing testing
```

### Disable Extension (Without Uninstalling)

```
1. chrome://extensions/
2. Find Ticker Buddy
3. Toggle OFF (remains installed but inactive)
```

### Completely Uninstall

```
1. chrome://extensions/
2. Find Ticker Buddy
3. Click "Remove"
4. Confirm deletion
```

---

**Happy Testing! 🚀**

Report any issues or questions to the development team.
