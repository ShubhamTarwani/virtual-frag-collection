-- =============================================================
-- 0008_rate_limit_index.sql — Rate Limiting
-- =============================================================

-- 1. Recreate rate_limits table to match new schema
-- Drop existing table
DROP TABLE IF EXISTS public.rate_limits;

-- Create new table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,   -- user_id or IP address
  endpoint text NOT NULL,     -- which route is being limited
  window_start timestamptz NOT NULL,
  call_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE (identifier, endpoint)
);

COMMENT ON TABLE public.rate_limits IS 'Stores rate limit usage for API endpoints and user actions';

-- Revoke all access from anon and authenticated roles (server/service role only)
REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;

-- 2. Indexes on rate_limits
-- Speed up the rate limit lookups (called on every request)
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits(identifier, endpoint);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
ON public.rate_limits(window_start);

-- 3. Cleanup old rate limit rows automatically
-- Rows older than 2 days are useless
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits 
  WHERE window_start < now() - interval '2 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (Supabase pg_cron if available, 
-- else call manually or via cron job)
-- SELECT cron.schedule('cleanup-rate-limits', 
--   '0 3 * * *', 'SELECT cleanup_rate_limits()');

-- =============================================================
-- Done. Run `npx supabase db push` to apply.
-- =============================================================
