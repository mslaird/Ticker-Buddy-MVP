/**
 * Extension Popup Script
 *
 * Provides quick access to settings and status info.
 */

interface AuthStatus {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

interface TickersResponse {
  tickers: any[];
  error?: string;
}

interface SettingsResponse {
  settings: any;
  isPro: boolean;
}

async function initialize() {
  const app = document.getElementById('app');
  if (!app) return;

  try {
    // Check authentication
    const authStatus: AuthStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });

    if (!authStatus.authenticated) {
      renderUnauthenticated(app);
      return;
    }

    // Fetch tickers and settings
    const [tickersRes, settingsRes]: [TickersResponse, SettingsResponse] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'GET_TICKERS' }),
      chrome.runtime.sendMessage({ type: 'GET_OVERLAY_SETTINGS' }),
    ]);

    renderAuthenticated(app, authStatus, tickersRes, settingsRes);
  } catch (error) {
    renderError(app, String(error));
  }
}

function renderUnauthenticated(app: HTMLElement) {
  app.innerHTML = `
    <div class="header">
      <div class="logo">TB</div>
      <h1>Ticker Buddy</h1>
    </div>

    <div class="error">
      ⚠️ You're not signed in
    </div>

    <div class="info">
      Sign in to Ticker Buddy to see your overlay on every website.
    </div>

    <div class="buttons">
      <button class="btn-primary" id="signInBtn">
        Sign In
      </button>
    </div>

    <div class="footer">
      Your always-on market overlay
    </div>
  `;

  document.getElementById('signInBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8082/auth' }); // Development URL - will update to TickerBuddy.app in production
  });
}

function renderAuthenticated(
  app: HTMLElement,
  authStatus: AuthStatus,
  tickersRes: TickersResponse,
  settingsRes: SettingsResponse
) {
  const tickerCount = tickersRes.tickers?.length || 0;
  const isPinned = settingsRes.settings?.pinned ?? true;

  app.innerHTML = `
    <div class="header">
      <div class="logo">TB</div>
      <h1>Ticker Buddy</h1>
    </div>

    <div class="status">
      <div class="status-indicator">
        <div class="status-dot"></div>
        <span>${isPinned ? 'Overlay Active' : 'Overlay Hidden'}</span>
      </div>
    </div>

    <div class="info">
      ${tickerCount === 0
        ? 'Add tickers in the web app to see them on every website.'
        : `Tracking ${tickerCount} ticker${tickerCount === 1 ? '' : 's'} on all websites.`}
    </div>

    <div class="buttons">
      <button class="btn-primary" id="toggleOverlayBtn">
        👁️ Toggle Overlay
      </button>
      <button class="btn-secondary" id="openDashboardBtn">
        🎯 Dashboard
      </button>
      <button class="btn-secondary" id="openSettingsBtn">
        ⚙️ Settings
      </button>
    </div>

    <div class="footer">
      ${authStatus.user?.email || 'Signed in'} ${settingsRes.isPro ? '• Pro' : ''}
    </div>
  `;

  document.getElementById('openDashboardBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8082/dashboard' }); // Development URL - will update to TickerBuddy.app in production
  });

  document.getElementById('openSettingsBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8082/overlay' }); // Development URL - will update to TickerBuddy.app in production
  });

  // Add toggle button
  document.getElementById('toggleOverlayBtn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'TOGGLE_OVERLAY_VISIBILITY' });
  });
}

function renderError(app: HTMLElement, error: string) {
  app.innerHTML = `
    <div class="header">
      <div class="logo">TB</div>
      <h1>Ticker Buddy</h1>
    </div>

    <div class="error">
      ❌ Error: ${error}
    </div>

    <div class="buttons">
      <button class="btn-primary" id="retryBtn">
        Retry
      </button>
    </div>
  `;

  document.getElementById('retryBtn')?.addEventListener('click', () => {
    initialize();
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);
