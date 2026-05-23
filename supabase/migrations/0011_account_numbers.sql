-- =============================================================
-- 0011_account_numbers.sql
-- Create reservation-aware account number system
-- =============================================================

-- 1a. Add account_number column to profiles table (if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_number integer UNIQUE;

-- 1b. Create reserved_account_numbers table
CREATE TABLE public.reserved_account_numbers (
    id              serial PRIMARY KEY,
    number          integer UNIQUE NOT NULL,
    reason          text,
    reserved_by     uuid REFERENCES public.profiles(id),
    created_at      timestamptz DEFAULT now()
);

-- Pre-insert reserved numbers
INSERT INTO public.reserved_account_numbers (number, reason) VALUES
  (0, 'founder'),
  (1155, 'special');

INSERT INTO public.reserved_account_numbers (number, reason)
  SELECT generate_series(1, 20), 'reserved';

-- 1c. Create auto-assignment function
CREATE OR REPLACE FUNCTION public.assign_account_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT num INTO next_num
  FROM generate_series(21, 999999) AS num
  WHERE num NOT IN (
    SELECT account_number FROM public.profiles WHERE account_number IS NOT NULL
    UNION
    SELECT number FROM public.reserved_account_numbers
  )
  ORDER BY num
  LIMIT 1;
  
  NEW.account_number := next_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1d. Create Trigger for profiles
CREATE TRIGGER auto_assign_account_number
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.account_number IS NULL)
  EXECUTE FUNCTION public.assign_account_number();

-- 1e. Update handle_new_user to remove old sequence logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_username citext;
BEGIN
  -- Generate a default username
  new_username := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  
  -- Insert without account_number (trigger will assign it)
  INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, new_username);

  -- Auto-create a "Top 4" collection
  INSERT INTO public.collections (user_id, name, slug, is_public, sort_order)
    VALUES (NEW.id, 'Top 4', 'top-4', true, 0);

  RETURN NEW;
END;
$$;

-- 1f. Create account_number_audit_log table
CREATE TABLE public.account_number_audit_log (
    id          serial PRIMARY KEY,
    changed_by  uuid REFERENCES public.profiles(id),
    target_user uuid REFERENCES public.profiles(id),
    old_number  integer,
    new_number  integer,
    created_at  timestamptz DEFAULT now()
);

-- 1g. RLS
ALTER TABLE public.reserved_account_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_number_audit_log ENABLE ROW LEVEL SECURITY;

-- Reserved numbers: only server/admin (service role bypasses RLS)
CREATE POLICY "Reserved numbers viewable by service role only" ON public.reserved_account_numbers FOR ALL USING (false);

-- Audit log: only server/admin
CREATE POLICY "Audit logs viewable by service role only" ON public.account_number_audit_log FOR ALL USING (false);

-- Rollback
/*
DROP TRIGGER auto_assign_account_number ON public.profiles;
DROP FUNCTION public.assign_account_number();
DROP TABLE public.account_number_audit_log;
DROP TABLE public.reserved_account_numbers;
-- restore handle_new_user old logic
*/
