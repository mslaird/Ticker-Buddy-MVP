/**
 * Background Service Worker for Ticker Buddy Extension
 *
 * Responsibilities:
 * - Manage Supabase authentication state
 * - Fetch market data from edge function
 * - Handle storage of user settings
 * - Coordinate with content scripts
 */

import { createClient } from '@supabase/supabase-js';
import { ChromeStorageAdapter } from './lib/chromeStorage';

// Supabase configuration (will be injected during build)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'your-publishable-key';

// Use chrome.storage for session persistence so it can be shared with the web app
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: new ChromeStorageAdapter(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_AUTH_STATUS') {
    handleGetAuthStatus().then(sendResponse);
    return true; // Will respond asynchronously
  }

  if (message.type === 'GET_TICKERS') {
    handleGetTickers().then(sendResponse);
    return true;
  }

  if (message.type === 'GET_OVERLAY_SETTINGS') {
    handleGetOverlaySettings().then(sendResponse);
    return true;
  }

  if (message.type === 'GET_MARKET_DATA') {
    handleGetMarketData(message.tickers).then(sendResponse);
    return true;
  }

  if (message.type === 'OPEN_SETTINGS') {
    chrome.tabs.create({ url: 'http://localhost:8082/overlay' }); // Development URL - will update to TickerBuddy.app in production
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SYNC_SESSION') {
    handleSyncSession(message.session).then(sendResponse);
    return true;
  }

  if (message.type === 'BROADCAST_SETTINGS_CHANGED') {
    handleBroadcastSettingsChanged().then(sendResponse);
    return true;
  }

  if (message.type === 'UPDATE_CUSTOM_POSITION') {
    handleUpdateCustomPosition(message.position).then(sendResponse);
    return true;
  }

  if (message.type === 'TOGGLE_OVERLAY_VISIBILITY') {
    handleToggleOverlayVisibility().then(sendResponse);
    return true;
  }
});

async function handleToggleOverlayVisibility() {
  try {
    console.log('[Background] Toggling overlay visibility in all tabs...');

    // Broadcast toggle to all content scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_OVERLAY',
          }).catch(() => {
            // Tab might not have content script loaded
          });
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('[Background] Error toggling overlay visibility:', error);
    return { success: false, error: String(error) };
  }
}

async function handleUpdateCustomPosition(position: { x: number; y: number }) {
  try {
    console.log('[Background] Updating custom position:', position);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get current settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('overlay_settings')
      .eq('user_id', session.user.id)
      .maybeSingle();

    const currentSettings = profile?.overlay_settings || {};

    // Update with custom position
    const newSettings = {
      ...currentSettings,
      position: 'custom',
      customPosition: position,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ overlay_settings: newSettings })
      .eq('user_id', session.user.id);

    if (error) {
      console.error('[Background] Error updating custom position:', error);
      return { success: false, error: error.message };
    }

    // Broadcast change to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_CHANGED',
          }).catch(() => {
            // Tab might not have content script loaded
          });
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('[Background] Error in handleUpdateCustomPosition:', error);
    return { success: false, error: String(error) };
  }
}

async function handleBroadcastSettingsChanged() {
  try {
    console.log('[Background] Broadcasting settings change to all tabs...');

    // Notify all content scripts about settings change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_CHANGED',
          }).catch(() => {
            // Tab might not have content script loaded
          });
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('[Background] Error broadcasting settings change:', error);
    return { success: false, error: String(error) };
  }
}

async function handleSyncSession(session: any) {
  try {
    console.log('[Background] Syncing session from web app...');

    // Store the session in chrome.storage using Supabase's expected format
    const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
    await chrome.storage.local.set({
      [storageKey]: JSON.stringify(session)
    });

    console.log('[Background] Session synced successfully');

    // Notify content scripts about auth change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'AUTH_STATE_CHANGED',
            authenticated: true,
          }).catch(() => {
            // Tab might not have content script loaded
          });
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('[Background] Error syncing session:', error);
    return { success: false, error: String(error) };
  }
}

async function handleGetAuthStatus() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[Background] Auth error:', error);
      return { authenticated: false, error: error.message };
    }

    if (!session) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
    };
  } catch (error) {
    console.error('[Background] Error checking auth:', error);
    return { authenticated: false, error: String(error) };
  }
}

async function handleGetTickers() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { tickers: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('tickers')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Background] Error fetching tickers:', error);
      return { tickers: [], error: error.message };
    }

    return { tickers: data || [] };
  } catch (error) {
    console.error('[Background] Error in handleGetTickers:', error);
    return { tickers: [], error: String(error) };
  }
}

async function handleGetOverlaySettings() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        settings: {
          position: 'bottom-right',
          opacity: 100,
          size: 'small',
          compactMode: true,
          refreshInterval: 15,
          pinned: true,
        },
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('overlay_settings, plan')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('[Background] Error fetching settings:', error);
    }

    const defaultSettings = {
      position: 'bottom-right' as const,
      opacity: 100,
      size: 'small' as const,
      compactMode: true,
      refreshInterval: 15,
      pinned: true,
    };

    return {
      settings: data?.overlay_settings ? { ...defaultSettings, ...data.overlay_settings } : defaultSettings,
      isPro: data?.plan === 'pro',
    };
  } catch (error) {
    console.error('[Background] Error in handleGetOverlaySettings:', error);
    return {
      settings: {
        position: 'bottom-right',
        opacity: 100,
        size: 'small',
        compactMode: true,
        refreshInterval: 15,
        pinned: true,
      },
      isPro: false,
    };
  }
}

async function handleGetMarketData(tickers: any[]) {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return { quotes: {}, error: 'Not authenticated' };
    }

    if (!tickers || tickers.length === 0) {
      return { quotes: {} };
    }

    // Call the edge function
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: {
        symbols: tickers.map(t => ({
          symbol: t.symbol,
          assetType: t.asset_type,
        })),
      },
    });

    if (error) {
      console.error('[Background] Error fetching market data:', error);
      return { quotes: {}, error: error.message };
    }

    // Transform array to object keyed by symbol
    const quotesMap: Record<string, any> = {};
    if (data?.quotes) {
      data.quotes.forEach((quote: any) => {
        if (quote.symbol) {
          quotesMap[quote.symbol] = quote;
        }
      });
    }

    return {
      quotes: quotesMap,
      rateLimit: data?.rateLimit,
    };
  } catch (error) {
    console.error('[Background] Error in handleGetMarketData:', error);
    return { quotes: {}, error: String(error) };
  }
}

// Initialize extension
console.log('[Ticker Buddy] Background service worker initialized');

// Monitor auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('[Background] Auth state changed:', event);

  // Notify content scripts about auth change
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'AUTH_STATE_CHANGED',
          authenticated: !!session,
        }).catch(() => {
          // Tab might not have content script loaded
        });
      }
    });
  });
});
