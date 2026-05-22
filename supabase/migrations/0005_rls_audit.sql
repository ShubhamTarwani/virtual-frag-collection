-- 0005_rls_audit.sql
-- Enforce strict RLS policies per security audit.

-- 1. perfumes table
ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private';

DROP POLICY IF EXISTS "perfumes_select" ON perfumes;
CREATE POLICY "perfumes_select" ON perfumes FOR SELECT USING (auth.uid() = user_id OR visibility = 'public');

DROP POLICY IF EXISTS "perfumes_insert" ON perfumes;
CREATE POLICY "perfumes_insert" ON perfumes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "perfumes_update" ON perfumes;
CREATE POLICY "perfumes_update" ON perfumes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "perfumes_delete" ON perfumes;
CREATE POLICY "perfumes_delete" ON perfumes FOR DELETE USING (auth.uid() = user_id);


-- 2. wear_logs table
ALTER TABLE wear_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wear_logs_select" ON wear_logs;
CREATE POLICY "wear_logs_select" ON wear_logs FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wear_logs_insert" ON wear_logs;
CREATE POLICY "wear_logs_insert" ON wear_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wear_logs_update" ON wear_logs;
CREATE POLICY "wear_logs_update" ON wear_logs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "wear_logs_delete" ON wear_logs;
CREATE POLICY "wear_logs_delete" ON wear_logs FOR DELETE USING (auth.uid() = user_id);


-- 3. profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (auth.uid() = id);


-- 4. weather_cache table
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
-- Revoke access from anon and authenticated users (Service Role only)
DROP POLICY IF EXISTS "weather_cache_all" ON weather_cache;
CREATE POLICY "weather_cache_service_role" ON weather_cache FOR ALL TO service_role USING (true);


-- 5. rate_limits table
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- Revoke access from anon and authenticated users (Service Role only)
DROP POLICY IF EXISTS "rate_limits_all" ON rate_limits;
CREATE POLICY "rate_limits_service_role" ON rate_limits FOR ALL TO service_role USING (true);


-- 6. Storage bucket policy for 'perfume-images'
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'perfume-images' AND auth.uid()::text = (storage.foldername(name))[2]);

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'perfume-images');
