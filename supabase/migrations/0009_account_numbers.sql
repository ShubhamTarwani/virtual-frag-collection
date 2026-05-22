-- =============================================================
-- 0009_account_numbers.sql
-- Add account_number to profiles and set up sequence for new users
-- =============================================================

-- Add account_number column, unique but nullable
ALTER TABLE public.profiles
ADD COLUMN account_number INTEGER UNIQUE;

-- Create sequence starting at 15
CREATE SEQUENCE public.account_number_seq START 15;

-- Update trigger to pull from sequence
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username citext;
  next_acc_num int;
BEGIN
  -- Generate a default username
  new_username := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  
  -- Get next sequence value for account number
  next_acc_num := nextval('public.account_number_seq');

  INSERT INTO public.profiles (id, username, account_number)
    VALUES (NEW.id, new_username, next_acc_num);

  -- Auto-create a "Top 4" collection
  INSERT INTO public.collections (user_id, name, slug, is_public, sort_order)
    VALUES (NEW.id, 'Top 4', 'top-4', true, 0);

  RETURN NEW;
END;
$$;
