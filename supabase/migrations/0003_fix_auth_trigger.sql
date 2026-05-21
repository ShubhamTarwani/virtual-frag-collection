-- =============================================================
-- 0003_fix_auth_trigger.sql
-- Fixes "Database error saving new user" caused by missing 
-- gen_random_bytes in public schema.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username citext;
BEGIN
  -- Generate a default username using the native gen_random_uuid() 
  -- instead of gen_random_bytes() which might live in the extensions schema.
  new_username := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, new_username);

  -- Auto-create a "Top 4" collection
  INSERT INTO public.collections (user_id, name, slug, is_public, sort_order)
    VALUES (NEW.id, 'Top 4', 'top-4', true, 0);

  RETURN NEW;
END;
$$;
