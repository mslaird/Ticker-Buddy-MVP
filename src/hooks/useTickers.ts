import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Ticker {
  id: string;
  user_id: string;
  symbol: string;
  asset_type: 'stock' | 'crypto' | 'etf';
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useTickers() {
  const { user } = useAuth();
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickers = useCallback(async () => {
    if (!user) {
      setTickers([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('tickers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tickers:', error);
      toast.error('Failed to load tickers');
    } else {
      setTickers(data as Ticker[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTickers();
  }, [fetchTickers]);

  const addTicker = async (symbol: string, assetType: 'stock' | 'crypto' | 'etf', displayName?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('tickers')
      .insert({
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        asset_type: assetType,
        display_name: displayName || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        toast.error('This ticker already exists');
      } else {
        toast.error('Failed to add ticker');
      }
      return { error };
    }

    setTickers(prev => [...prev, data as Ticker]);
    toast.success(`Added ${symbol.toUpperCase()}`);
    return { error: null };
  };

  const updateTicker = async (id: string, updates: Partial<Pick<Ticker, 'symbol' | 'asset_type' | 'display_name'>>) => {
    const { error } = await supabase
      .from('tickers')
      .update({
        ...updates,
        symbol: updates.symbol?.toUpperCase(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update ticker');
      return { error };
    }

    await fetchTickers();
    toast.success('Ticker updated');
    return { error: null };
  };

  const deleteTicker = async (id: string) => {
    const ticker = tickers.find(t => t.id === id);
    const { error } = await supabase
      .from('tickers')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete ticker');
      return { error };
    }

    setTickers(prev => prev.filter(t => t.id !== id));
    toast.success(`Removed ${ticker?.symbol || 'ticker'}`);
    return { error: null };
  };

  return { tickers, loading, addTicker, updateTicker, deleteTicker, refetch: fetchTickers };
}
