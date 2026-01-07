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
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  size: 'small' | 'medium' | 'large';
  compactMode: boolean;
  refreshInterval: number;
  pinned: boolean;
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
    size: 'medium',
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
      console.error('[OverlayApp] Error fetching market data:', error);
    }
  }, [tickers]);

  // Initial data load
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const isAuth = await checkAuth();

      if (isAuth) {
        await Promise.all([
          fetchTickers(),
          fetchSettings(),
        ]);
      }

      setLoading(false);
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

  // Don't render if not authenticated
  if (!authenticated) {
    return null;
  }

  // Don't render if not pinned
  if (!settings.pinned) {
    return null;
  }

  return (
    <OverlayWidget
      tickers={tickers}
      quotes={quotes}
      isLoading={loading}
      settings={settings}
      isPro={isPro}
    />
  );
}
