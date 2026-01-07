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
  // Check if already injected
  if (document.getElementById(CONTAINER_ID)) {
    console.log('[Ticker Buddy] Already injected');
    return;
  }

  // Create root container
  const container = document.createElement('div');
  container.id = CONTAINER_ID;

  // Append to body
  document.body.appendChild(container);

  // Mount React app (styles are bundled with the JS)
  const root = createRoot(container);
  root.render(<OverlayApp />);

  console.log('[Ticker Buddy] Overlay injected successfully');
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

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  const container = document.getElementById(CONTAINER_ID);
  if (container) {
    container.remove();
  }
});
