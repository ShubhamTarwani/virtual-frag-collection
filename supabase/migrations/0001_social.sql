-- =============================================================
-- 0001_social.sql  — Multi-tenancy + public profiles migration
-- =============================================================

-- 1. Extensions
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. Profiles table
-- -------------------------------------------------------------
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    citext UNIQUE NOT NULL
              CONSTRAINT username_length CHECK (char_length(username) BETWEEN 3 AND 20)
              CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_]+$'),
  display_name text,
  bio         text CONSTRAINT bio_length CHECK (char_length(bio) <= 280),
  avatar_url  text,
  accent_color text DEFAULT '#8B4513',
  is_public   boolean DEFAULT true,
  role        text DEFAULT 'user' CONSTRAINT valid_role CHECK (role IN ('user', 'admin')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'User profiles — one per auth.users row';

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Alter perfumes table — add user_id FK
-- -------------------------------------------------------------
ALTER TABLE public.perfumes
  ADD COLUMN user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create profile for the existing admin user to satisfy foreign key
INSERT INTO public.profiles (id, username, role)
VALUES ('1ff55572-765d-4799-992d-7e094e5cd770', 'admin', 'admin')
ON CONFLICT (id) DO NOTHING;

-- ⚠️  BACKFILL: Replace the UUID below with YOUR auth.users.id
-- You can find it in Supabase Dashboard → Authentication → Users
UPDATE public.perfumes
  SET user_id = '1ff55572-765d-4799-992d-7e094e5cd770'
  WHERE user_id IS NULL;

ALTER TABLE public.perfumes
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_perfumes_user_id ON public.perfumes(user_id);

-- 4. Collections table
-- -------------------------------------------------------------
CREATE TABLE public.collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  description text,
  is_public   boolean DEFAULT true,
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  CONSTRAINT unique_user_slug UNIQUE (user_id, slug)
);

COMMENT ON TABLE public.collections IS 'Named collections of fragrances per user';

CREATE INDEX idx_collections_user_id ON public.collections(user_id);

-- Create default collections for the existing admin user
INSERT INTO public.collections (user_id, name, slug, is_public, sort_order)
VALUES ('1ff55572-765d-4799-992d-7e094e5cd770', 'Top 4', 'top-4', true, 0)
ON CONFLICT (user_id, slug) DO NOTHING;

-- 5. Collection items junction
-- -------------------------------------------------------------
CREATE TABLE public.collection_items (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  fragrance_id  uuid NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  position      int DEFAULT 0,
  PRIMARY KEY (collection_id, fragrance_id)
);

-- 6. Auto-create profile + default collection on signup
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username citext;
  new_profile_id uuid;
BEGIN
  -- Generate a default username: user_ + 8 hex chars
  new_username := 'user_' || left(encode(gen_random_bytes(4), 'hex'), 8);

  INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, new_username);

  -- Auto-create a "Top 4" collection
  INSERT INTO public.collections (user_id, name, slug, is_public, sort_order)
    VALUES (NEW.id, 'Top 4', 'top-4', true, 0);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Row-Level Security
-- =============================================================

-- 7a. Profiles RLS
-- -------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (is_public = true OR auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No direct INSERT policy — profiles are created by trigger only

-- 7b. Perfumes RLS
-- -------------------------------------------------------------
ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfumes visible if owner is public or viewer is owner"
  ON public.perfumes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = perfumes.user_id
        AND profiles.is_public = true
    )
  );

CREATE POLICY "Users can insert own perfumes"
  ON public.perfumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own perfumes"
  ON public.perfumes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own perfumes"
  ON public.perfumes FOR DELETE
  USING (auth.uid() = user_id);

-- 7c. Collections RLS
-- -------------------------------------------------------------
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections visible if owner is public or viewer is owner"
  ON public.collections FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = collections.user_id
        AND profiles.is_public = true
    )
  );

CREATE POLICY "Users can insert own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- 7d. Collection Items RLS
-- -------------------------------------------------------------
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collection items visible if collection is visible"
  ON public.collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND (
          auth.uid() = collections.user_id
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = collections.user_id
              AND profiles.is_public = true
          )
        )
    )
  );

CREATE POLICY "Users can insert items into own collections"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND auth.uid() = collections.user_id
    )
  );

CREATE POLICY "Users can update items in own collections"
  ON public.collection_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND auth.uid() = collections.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND auth.uid() = collections.user_id
    )
  );

CREATE POLICY "Users can delete items from own collections"
  ON public.collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE collections.id = collection_items.collection_id
        AND auth.uid() = collections.user_id
    )
  );

-- =============================================================
-- Done. Run `supabase db push` to apply.
-- =============================================================
