-- =============================================================
-- 0004_wardrobe.sql — Wardrobe AI feature
-- =============================================================

-- 1. Extend perfumes table with wardrobe-relevant columns
-- -------------------------------------------------------------
ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS family          text,         -- 'fresh'|'citrus'|'aquatic'|'oriental'|'gourmand'|'woody'|'floral'
  ADD COLUMN IF NOT EXISTS character       text,         -- 'sensual'|'clean'|'serious'|'dark'|'playful'|'fresh'
  ADD COLUMN IF NOT EXISTS projection      text,         -- 'intimate'|'moderate'|'beast'
  ADD COLUMN IF NOT EXISTS longevity       text,         -- 'poor'|'average'|'good'|'excellent'
  ADD COLUMN IF NOT EXISTS season_tags     text[],       -- ['summer','winter',...]
  ADD COLUMN IF NOT EXISTS occasion_tags   text[],       -- ['office','casual','date',...]
  ADD COLUMN IF NOT EXISTS top_notes       text[],
  ADD COLUMN IF NOT EXISTS heart_notes     text[],
  ADD COLUMN IF NOT EXISTS base_notes      text[],
  ADD COLUMN IF NOT EXISTS last_worn_at    timestamptz,
  ADD COLUMN IF NOT EXISTS user_rating     smallint CHECK (user_rating BETWEEN 1 AND 5);

-- 2. wear_logs table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wear_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bottle_id        uuid NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  worn_at          timestamptz NOT NULL DEFAULT now(),
  occasion         text,          -- 'office'|'casual'|'date'|'formal'|'outdoor'|'night'
  weather_temp     numeric(4,1),  -- Celsius
  weather_humidity smallint,      -- 0-100
  weather_condition text,         -- 'sunny'|'cloudy'|'rainy'|'windy'
  season           text,          -- 'summer'|'monsoon'|'post_monsoon'|'winter'
  time_of_day      text,          -- 'morning'|'afternoon'|'evening'|'night'
  mood             text,          -- 'energised'|'relaxed'|'confident'|'romantic'|'subtle'
  setting          text,          -- 'small_indoor'|'large_indoor'|'outdoor'|'commute'
  who_with         text,          -- 'solo'|'friends'|'colleagues'|'partner'|'family'
  rating_after     smallint CHECK (rating_after BETWEEN 1 AND 5),
  notes            text,
  source           text DEFAULT 'manual',  -- 'manual'|'wardrobe_ai'
  created_at       timestamptz DEFAULT now()
);

COMMENT ON TABLE public.wear_logs IS 'Records every time a user wears a fragrance — the analytics gold';

-- 3. Indexes on wear_logs
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wear_logs_user_worn
  ON public.wear_logs(user_id, worn_at DESC);

CREATE INDEX IF NOT EXISTS idx_wear_logs_user_bottle
  ON public.wear_logs(user_id, bottle_id);

CREATE INDEX IF NOT EXISTS idx_wear_logs_user_season
  ON public.wear_logs(user_id, season);

CREATE INDEX IF NOT EXISTS idx_wear_logs_user_occasion
  ON public.wear_logs(user_id, occasion);

-- 4. weather_cache table (server-side only, no RLS)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weather_cache (
  cache_key  text PRIMARY KEY,          -- 'lat,lon,YYYY-MM-DD-HH'
  data       jsonb NOT NULL,
  fetched_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.weather_cache IS 'Cached OWM weather responses — 1h TTL managed in app logic';

-- Revoke all access from anon and authenticated roles (server/service role only)
REVOKE ALL ON public.weather_cache FROM anon;
REVOKE ALL ON public.weather_cache FROM authenticated;

-- 5. rate_limits table (no Upstash — use Postgres)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action     text NOT NULL DEFAULT 'wardrobe_recommend',
  window_key text NOT NULL,             -- 'YYYY-MM-DD' for daily, 'YYYY-MM-DD-HH' for hourly
  count      int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, action, window_key)
);

REVOKE ALL ON public.rate_limits FROM anon;
REVOKE ALL ON public.rate_limits FROM authenticated;

-- 6. RLS on wear_logs — users can only see/touch own rows
-- -------------------------------------------------------------
ALTER TABLE public.wear_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own wear_logs"
  ON public.wear_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wear_logs"
  ON public.wear_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wear_logs"
  ON public.wear_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own wear_logs"
  ON public.wear_logs FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Trigger: sync last_worn_at on perfumes when a wear_log is inserted
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_last_worn_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.perfumes
    SET last_worn_at = NEW.worn_at
    WHERE id = NEW.bottle_id
      AND (last_worn_at IS NULL OR NEW.worn_at > last_worn_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_wear_log_inserted ON public.wear_logs;
CREATE TRIGGER on_wear_log_inserted
  AFTER INSERT ON public.wear_logs
  FOR EACH ROW EXECUTE FUNCTION public.sync_last_worn_at();

-- =============================================================
-- Done. Run `npx supabase db push` to apply.
-- =============================================================
