/**
 * OverlayApp Component for Chrome Extension
 *
 * This is the React app that gets injected into web pages.
 * It communicates with the background service worker to fetch data.
 */

import { useState, useEffect, useCallback } from 'react';
import { OverlayWidget } from './components/OverlayWidget';

interface Ticker {
  id: string;
  symbol: string;
  asset_type: 'stock' | 'crypto' | 'etf';
  display_name: string | null;
}

interface OverlaySettings {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
  opacity: number;
  size: 'small' | 'medium' | 'large';
  compactMode: boolean;
  refreshInterval: number;
  pinned: boolean;
  customPosition?: { x: number; y: number };
  hidden?: boolean;
  autoHideOnScroll?: boolean;
}

interface Quote {
  symbol: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  isDelayed?: boolean;
  quoteStatus?: 'ok' | 'unavailable' | 'source_unavailable';
}

export function OverlayApp() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [settings, setSettings] = useState<OverlaySettings>({
    position: 'bottom-right',
    opacity: 100,
    size: 'small',
    compactMode: true,
    refreshInterval: 15,
    pinned: true,
  });
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Check authentication status
  const checkAuth = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      setAuthenticated(response.authenticated);
      return response.authenticated;
    } catch (error) {
      const errorMessage = String(error);
      if (errorMessage.includes('Extension context invalidated')) {
        console.warn('[OverlayApp] Extension was reloaded, cleaning up');
        const container = document.getElementById('ticker-buddy-extension-root');
        if (container) container.remove();
        return false;
      }
      console.error('[OverlayApp] Error checking auth:', error);
      return false;
    }
  }, []);

  // Fetch tickers from background
  const fetchTickers = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_TICKERS' });
      if (response.tickers) {
        setTickers(response.tickers);
      }
    } catch (error) {
      const errorMessage = String(error);
      if (errorMessage.includes('Extension context invalidated')) {
        console.warn('[OverlayApp] Extension was reloaded, cleaning up');
        const container = document.getElementById('ticker-buddy-extension-root');
        if (container) container.remove();
        return;
      }
      console.error('[OverlayApp] Error fetching tickers:', error);
    }
  }, []);

  // Fetch overlay settings from background
  const fetchSettings = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_OVERLAY_SETTINGS' });
      if (response.settings) {
        setSettings(response.settings);
      }
      if (response.isPro !== undefined) {
        setIsPro(response.isPro);
      }
    } catch (error) {
      const errorMessage = String(error);
      if (errorMessage.includes('Extension context invalidated')) {
        console.warn('[OverlayApp] Extension was reloaded, cleaning up');
        const container = document.getElementById('ticker-buddy-extension-root');
        if (container) container.remove();
        return;
      }
      console.error('[OverlayApp] Error fetching settings:', error);
    }
  }, []);

  // Fetch market data from background
  const fetchMarketData = useCallback(async () => {
    if (tickers.length === 0) {
      setQuotes({});
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_MARKET_DATA',
        tickers,
      });

      if (response.quotes) {
        setQuotes(response.quotes);
      }
    } catch (error) {
      const errorMessage = String(error);

      // Handle extension context invalidation
      if (errorMessage.includes('Extension context invalidated')) {
        console.warn('[OverlayApp] Extension was reloaded, stopping updates');
        // Remove the overlay to avoid further errors
        const container = document.getElementById('ticker-buddy-extension-root');
        if (container) {
          container.remove();
        }
        return;
      }

      console.error('[OverlayApp] Error fetching market data:', error);
    }
  }, [tickers]);

  // Initial data load
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[OverlayApp] Initializing...');
        setLoading(true);
        const isAuth = await checkAuth();
        console.log('[OverlayApp] Auth status:', isAuth);

        if (isAuth) {
          console.log('[OverlayApp] Fetching tickers and settings...');
          await Promise.all([
            fetchTickers(),
            fetchSettings(),
          ]);
          console.log('[OverlayApp] Data fetched successfully');
        }

        setLoading(false);
      } catch (error) {
        console.error('[OverlayApp] Error during initialization:', error);
        setLoading(false);
      }
    };

    initialize();
  }, [checkAuth, fetchTickers, fetchSettings]);

  // Poll for market data at refresh interval
  useEffect(() => {
    if (!authenticated || tickers.length === 0) {
      return;
    }

    // Initial fetch
    fetchMarketData();

    // Set up polling
    const interval = setInterval(fetchMarketData, settings.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [authenticated, tickers, settings.refreshInterval, fetchMarketData]);

  // Listen for settings changes from background
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'SETTINGS_CHANGED') {
        console.log('[OverlayApp] Settings changed, updating...');
        fetchSettings();
      }
      if (message.type === 'TICKERS_CHANGED') {
        console.log('[OverlayApp] Tickers changed, updating...');
        fetchTickers();
      }
      if (message.type === 'TOGGLE_OVERLAY') {
        console.log('[OverlayApp] Toggling overlay visibility');
        setSettings(prev => ({ ...prev, hidden: !prev.hidden }));
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [fetchSettings, fetchTickers]);

  // Don't render if not authenticated
  if (!authenticated) {
    console.log('[OverlayApp] Not rendering: not authenticated');
    return null;
  }

  // Don't render if not pinned
  if (!settings.pinned) {
    console.log('[OverlayApp] Not rendering: not pinned');
    return null;
  }

  // Don't render if hidden
  if (settings.hidden) {
    console.log('[OverlayApp] Not rendering: hidden');
    return null;
  }

  // Don't render on the overlay settings page itself (to avoid duplicate)
  if (window.location.href.includes('localhost:8082/overlay') || window.location.href.includes('tickerbuddy.app/overlay')) {
    console.log('[OverlayApp] Not rendering: on overlay settings page');
    return null;
  }

  console.log('[OverlayApp] Rendering widget with', tickers.length, 'tickers');
  return (
    <OverlayWidget
      tickers={tickers}
      quotes={quotes}
      isLoading={loading}
      settings={settings}
      isPro={isPro}
      onHide={() => setSettings(prev => ({ ...prev, hidden: true }))}
    />
  );
}
