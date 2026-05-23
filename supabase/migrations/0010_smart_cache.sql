-- Migration: 0010_smart_cache.sql
-- Description: Caching layer for Gemini API calls, queue for bulk ops, and rate limits.

-- 1. Layer 1 Cache: Fragrance Info (Shared)
CREATE TABLE IF NOT EXISTS fragrance_info_cache (
    canonical_slug text PRIMARY KEY,
    brand text NOT NULL,
    name text NOT NULL,
    data jsonb NOT NULL,
    source text DEFAULT 'gemini',
    confidence smallint DEFAULT 80,
    hit_count integer DEFAULT 0,
    last_hit_at timestamptz,
    fetched_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '90 days'),
    locked_until timestamptz,
    created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at timestamptz DEFAULT now()
);

-- 2. Layer 2 Cache: Wardrobe Recommendations (Per-User)
CREATE TABLE IF NOT EXISTS wardrobe_recommendations_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    context_hash text NOT NULL,
    result jsonb NOT NULL,
    bottle_ids uuid[] NOT NULL,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '6 hours'),
    UNIQUE(user_id, context_hash)
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_cache_user 
    ON wardrobe_recommendations_cache(user_id, expires_at);

-- 3. Analytics & Cost Tracking
CREATE TABLE IF NOT EXISTS gemini_api_log (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
    flow text NOT NULL,
    cache_hit boolean NOT NULL,
    model text,
    input_tokens integer,
    output_tokens integer,
    latency_ms integer,
    error text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gemini_log_created ON gemini_api_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gemini_log_user_flow ON gemini_api_log(user_id, flow);

-- 4. Async Queue
CREATE TABLE IF NOT EXISTS gemini_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    job_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending',
    attempts smallint DEFAULT 0,
    result jsonb,
    error text,
    enqueued_at timestamptz DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_queue_status_enqueued ON gemini_queue(status, enqueued_at);
CREATE INDEX IF NOT EXISTS idx_queue_user_status ON gemini_queue(user_id, status);

-- 5. Rate Limits (Bucket-based sliding window)
CREATE TABLE IF NOT EXISTS rate_limit_buckets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    bucket text NOT NULL,
    count integer DEFAULT 1,
    window_start timestamptz DEFAULT now(),
    UNIQUE(user_id, bucket)
);

-- 6. Cleanup Function & RPCs
CREATE OR REPLACE FUNCTION increment_fragrance_cache_hit(slug_val text) RETURNS void AS $$
BEGIN
    UPDATE fragrance_info_cache 
    SET hit_count = hit_count + 1, last_hit_at = now()
    WHERE canonical_slug = slug_val;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION claim_gemini_jobs(batch_size integer)
RETURNS TABLE (
    id uuid,
    payload jsonb,
    attempts smallint
) AS $$
BEGIN
    RETURN QUERY
    UPDATE gemini_queue
    SET status = 'processing', started_at = now(), attempts = gemini_queue.attempts + 1
    WHERE gemini_queue.id IN (
        SELECT q.id
        FROM gemini_queue q
        WHERE q.status = 'pending'
        ORDER BY q.enqueued_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT batch_size
    )
    RETURNING gemini_queue.id, gemini_queue.payload, gemini_queue.attempts;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_expired_caches() RETURNS void AS $$
BEGIN
    DELETE FROM wardrobe_recommendations_cache WHERE expires_at < now();
    DELETE FROM gemini_queue WHERE status IN ('done','error') AND completed_at < now() - interval '7 days';
    DELETE FROM gemini_api_log WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- 7. Cache Invalidation Triggers for Wardrobe
CREATE OR REPLACE FUNCTION invalidate_user_wardrobe_cache() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        DELETE FROM wardrobe_recommendations_cache WHERE user_id = OLD.user_id;
    ELSE
        DELETE FROM wardrobe_recommendations_cache WHERE user_id = NEW.user_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invalidate_wardrobe_cache_on_fragrance_change ON perfumes;
CREATE TRIGGER invalidate_wardrobe_cache_on_fragrance_change
    AFTER INSERT OR DELETE ON perfumes
    FOR EACH ROW EXECUTE FUNCTION invalidate_user_wardrobe_cache();

DROP TRIGGER IF EXISTS invalidate_wardrobe_cache_on_wear_log ON wear_logs;
CREATE TRIGGER invalidate_wardrobe_cache_on_wear_log
    AFTER INSERT ON wear_logs
    FOR EACH ROW EXECUTE FUNCTION invalidate_user_wardrobe_cache();

-- 8. Row Level Security (RLS)
ALTER TABLE fragrance_info_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE wardrobe_recommendations_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_api_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- fragrance_info_cache: SELECT public, INSERT/UPDATE service_role only
CREATE POLICY "Public can read fragrance info cache" 
    ON fragrance_info_cache FOR SELECT USING (true);

-- wardrobe_recommendations_cache: SELECT/INSERT own rows
CREATE POLICY "Users can read own wardrobe cache" 
    ON wardrobe_recommendations_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wardrobe cache" 
    ON wardrobe_recommendations_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wardrobe cache"
    ON wardrobe_recommendations_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wardrobe cache"
    ON wardrobe_recommendations_cache FOR DELETE USING (auth.uid() = user_id);

-- Others: Service Role Only (No client access)
-- (By enabling RLS and not creating policies, we default to deny all for public/anon/authenticated)
-- Service role bypasses RLS automatically.

-- ============================================================================
-- ROLLBACK INSTRUCTIONS:
-- ============================================================================
/*
DROP TRIGGER IF EXISTS invalidate_wardrobe_cache_on_wear_log ON wear_logs;
DROP TRIGGER IF EXISTS invalidate_wardrobe_cache_on_fragrance_change ON perfumes;
DROP FUNCTION IF EXISTS invalidate_user_wardrobe_cache();
DROP FUNCTION IF EXISTS cleanup_expired_caches();

DROP TABLE IF EXISTS rate_limit_buckets CASCADE;
DROP TABLE IF EXISTS gemini_queue CASCADE;
DROP TABLE IF EXISTS gemini_api_log CASCADE;
DROP TABLE IF EXISTS wardrobe_recommendations_cache CASCADE;
DROP TABLE IF EXISTS fragrance_info_cache CASCADE;
*/
