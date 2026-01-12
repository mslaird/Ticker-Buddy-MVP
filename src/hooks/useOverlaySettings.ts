import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

export interface OverlaySettings {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  size: 'small' | 'medium' | 'large';
  compactMode: boolean;
  refreshInterval: number;
  pinned: boolean;
}

const DEFAULT_SETTINGS: OverlaySettings = {
  position: 'bottom-right',
  opacity: 100,
  size: 'small',
  compactMode: true,
  refreshInterval: 15,
  pinned: true,
};

export function useOverlaySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('overlay_settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching overlay settings:', error);
      } else if (data?.overlay_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.overlay_settings as Partial<OverlaySettings>) });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const updateSettings = useCallback(async (newSettings: OverlaySettings) => {
    setSettings(newSettings);

    // Notify extension immediately (for real-time UI updates)
    window.postMessage({
      type: 'TICKER_BUDDY_SETTINGS_CHANGED',
      settings: newSettings,
    }, window.location.origin);

    if (!user) return;

    // Debounce the save to avoid too many DB calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ overlay_settings: newSettings as unknown as Json })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving overlay settings:', error);
      }
    }, 500);
  }, [user]);

  return { settings, updateSettings, loading };
}
