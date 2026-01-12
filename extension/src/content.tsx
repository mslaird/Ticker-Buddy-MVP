/**
 * Content Script for Ticker Buddy Extension
 *
 * Responsibilities:
 * - Inject React root into web pages
 * - Communicate with background service worker
 * - Manage overlay visibility and updates
 */

import { createRoot } from 'react-dom/client';
import { OverlayApp } from './OverlayApp';
import './content.css';

console.log('[Ticker Buddy] Content script loaded');

// Create container for the overlay
const CONTAINER_ID = 'ticker-buddy-extension-root';

function injectOverlay() {
  try {
    // Check if already injected
    if (document.getElementById(CONTAINER_ID)) {
      console.log('[Ticker Buddy] Already injected');
      return;
    }

    console.log('[Ticker Buddy] Creating container...');
    // Create root container
    const container = document.createElement('div');
    container.id = CONTAINER_ID;

    // Append to body
    document.body.appendChild(container);

    console.log('[Ticker Buddy] Rendering React app...');
    // Mount React app (styles are bundled with the JS)
    const root = createRoot(container);
    root.render(<OverlayApp />);

    console.log('[Ticker Buddy] Overlay injected successfully');
  } catch (error) {
    console.error('[Ticker Buddy] FATAL ERROR injecting overlay:', error);
    console.error('[Ticker Buddy] Error stack:', (error as Error).stack);
  }
}

// Inject when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectOverlay);
} else {
  injectOverlay();
}

// Listen for auth state changes from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'AUTH_STATE_CHANGED') {
    console.log('[Ticker Buddy] Auth state changed:', message.authenticated);
    // React components will re-fetch data automatically
    sendResponse({ received: true });
  }
});

// Listen for messages from the web app
window.addEventListener('message', async (event) => {
  // Only accept messages from same origin (localhost:8082 or TickerBuddy.app)
  if (event.origin !== window.location.origin) {
    return;
  }

  // Session sync
  if (event.data?.type === 'TICKER_BUDDY_SESSION_SYNC' && event.data?.session) {
    console.log('[Ticker Buddy] Received session from web app, syncing...');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SYNC_SESSION',
        session: event.data.session,
      });
      console.log('[Ticker Buddy] Session sync result:', response);
    } catch (error) {
      console.error('[Ticker Buddy] Error syncing session:', error);
    }
  }

  // Settings changed
  if (event.data?.type === 'TICKER_BUDDY_SETTINGS_CHANGED' && event.data?.settings) {
    console.log('[Ticker Buddy] Settings changed, notifying all tabs...');
    try {
      await chrome.runtime.sendMessage({
        type: 'BROADCAST_SETTINGS_CHANGED',
        settings: event.data.settings,
      });
    } catch (error) {
      console.error('[Ticker Buddy] Error broadcasting settings change:', error);
    }
  }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.remove();
  }
});
