-- =============================================================
-- 0002_social_graph.sql — Follows, likes, activity feed
-- =============================================================

-- 1. Add last_seen_notifications to profiles
-- -------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN last_seen_notifications timestamptz DEFAULT now();

-- 2. Follows table
-- -------------------------------------------------------------
CREATE TABLE public.follows (
  follower_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);

-- 3. Likes table
-- -------------------------------------------------------------
CREATE TABLE public.likes (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fragrance_id uuid NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, fragrance_id)
);

CREATE INDEX idx_likes_fragrance ON public.likes(fragrance_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);

-- 4. Activity events table
-- -------------------------------------------------------------
CREATE TABLE public.activity_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verb        text NOT NULL,
  object_type text,
  object_id   uuid,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_actor_created
  ON public.activity_events(actor_id, created_at DESC);

CREATE INDEX idx_activity_created
  ON public.activity_events(created_at DESC);

-- 5. Triggers to auto-insert activity events
-- -------------------------------------------------------------

-- 5a. Fragrance added → verb='added'
CREATE OR REPLACE FUNCTION public.on_fragrance_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, metadata)
  VALUES (
    NEW.user_id,
    'added',
    'fragrance',
    NEW.id,
    jsonb_build_object('name', COALESCE(NEW.name, ''), 'brand', COALESCE(NEW.brand, ''), 'image_url', COALESCE(NEW.image_url, ''))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_perfume_inserted
  AFTER INSERT ON public.perfumes
  FOR EACH ROW EXECUTE FUNCTION public.on_fragrance_added();

-- 5b. Like inserted → verb='liked'
CREATE OR REPLACE FUNCTION public.on_like_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  frag_name text;
  frag_brand text;
  frag_image text;
BEGIN
  SELECT name, brand, image_url INTO frag_name, frag_brand, frag_image
    FROM public.perfumes WHERE id = NEW.fragrance_id;

  INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, metadata)
  VALUES (
    NEW.user_id,
    'liked',
    'fragrance',
    NEW.fragrance_id,
    jsonb_build_object('name', COALESCE(frag_name, ''), 'brand', COALESCE(frag_brand, ''), 'image_url', COALESCE(frag_image, ''))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_like_inserted
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.on_like_added();

-- 5c. Follow inserted → verb='followed'
CREATE OR REPLACE FUNCTION public.on_follow_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_username text;
  target_avatar text;
BEGIN
  SELECT username, avatar_url INTO target_username, target_avatar
    FROM public.profiles WHERE id = NEW.following_id;

  INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, metadata)
  VALUES (
    NEW.follower_id,
    'followed',
    'profile',
    NEW.following_id,
    jsonb_build_object('username', COALESCE(target_username, ''), 'avatar_url', COALESCE(target_avatar, ''))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_follow_inserted
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.on_follow_added();

-- 5d. Collection created → verb='created_collection'
CREATE OR REPLACE FUNCTION public.on_collection_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, metadata)
  VALUES (
    NEW.user_id,
    'created_collection',
    'collection',
    NEW.id,
    jsonb_build_object('name', COALESCE(NEW.name, ''), 'slug', COALESCE(NEW.slug, ''))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_collection_inserted
  AFTER INSERT ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.on_collection_created();

-- 6. Row-Level Security
-- =============================================================

-- 6a. Follows RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- 6b. Likes RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see likes"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);

-- 6c. Activity events RLS (read-only for users, triggers write)
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read activity events"
  ON public.activity_events FOR SELECT
  USING (true);

-- Insert is handled by SECURITY DEFINER triggers, no direct insert policy needed

-- =============================================================
-- Done.
-- =============================================================
