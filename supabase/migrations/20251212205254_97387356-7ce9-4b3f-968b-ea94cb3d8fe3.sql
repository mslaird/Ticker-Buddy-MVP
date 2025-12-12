-- Add overlay_settings JSONB column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS overlay_settings JSONB DEFAULT '{"position": "bottom-right", "opacity": 100, "size": "medium", "compactMode": true, "refreshInterval": 15, "pinned": true}'::jsonb;