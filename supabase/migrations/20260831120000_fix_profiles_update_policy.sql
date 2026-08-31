-- Fix: authenticated users could self-promote to the 'pro' plan.
--
-- The original policy (20251212195833) was:
--
--   CREATE POLICY "Users can update their own profile"
--   ON public.profiles FOR UPDATE
--   USING (auth.uid() = user_id);
--
-- USING constrains WHICH ROW may be updated. It says nothing about WHICH
-- COLUMNS. `plan` is a plain updatable column, so any signed-in user could run
--
--   supabase.from('profiles').update({ plan: 'pro' }).eq('user_id', <their id>)
--
-- from the browser console and pass RLS, because the row still satisfies
-- auth.uid() = user_id.
--
-- This also defeated check_ticker_limit() (20260105230000), which reads `plan`
-- from this same table to decide the limit. The trigger was documented as
-- "database-level - cannot bypass"; it was bypassable in one hop.
--
-- Two independent controls below, so neither is a single point of failure.

-- Control 1: column-level privilege. Clients may never write `plan` at all.
-- Plan changes belong to the service role (billing webhook / admin), which
-- bypasses both RLS and column grants.
--
-- NOTE: `REVOKE UPDATE (plan)` alone is a no-op here. A column-level revoke only
-- removes a column-level grant, and Supabase's defaults issue a TABLE-level
-- `GRANT UPDATE ON public.profiles TO authenticated`, which implicitly covers
-- every column. Verified against the live database: after a column-only revoke,
-- has_column_privilege('authenticated','public.profiles','plan','UPDATE') still
-- returned true. The table-level grant has to be dropped and the allowed columns
-- re-granted explicitly.
--
-- `overlay_settings` is the only profiles column the client writes
-- (src/hooks/useOverlaySettings.ts). `display_name` is granted for the settings
-- UI. Everything else, `plan` above all, is service-role only.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (overlay_settings, display_name) ON public.profiles TO authenticated;

-- Control 2: add the missing WITH CHECK, and pin plan to its existing value.
-- Postgres defaults a missing WITH CHECK on UPDATE to the USING expression, so
-- user_id reassignment was already blocked; this makes the intent explicit and
-- guards the case where the column grant is ever restored.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND plan = (SELECT p.plan FROM public.profiles p WHERE p.user_id = auth.uid())
);

COMMENT ON POLICY "Users can update their own profile" ON public.profiles IS
  'Row scoped to the owner. `plan` is immutable from the client: see the REVOKE above and the WITH CHECK. Plan changes go through the service role.';
