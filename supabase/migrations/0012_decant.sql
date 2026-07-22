-- Migration: Add decant/tester fields to perfumes table
-- Existing rows default to is_decant: false — no data migration needed.

ALTER TABLE perfumes
  ADD COLUMN IF NOT EXISTS is_decant        boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS decant_volume_ml numeric(5,1),          -- e.g. 5.0, 10.5, 30.0
  ADD COLUMN IF NOT EXISTS decant_source    text,                  -- "Surrender to Chance", "r/fragrance swap" etc.
  ADD COLUMN IF NOT EXISTS decant_finished  boolean     NOT NULL DEFAULT false;

COMMENT ON COLUMN perfumes.is_decant        IS 'True when the entry is a decant or tester sample rather than a full bottle.';
COMMENT ON COLUMN perfumes.decant_volume_ml IS 'Volume of the decant in millilitres (e.g. 5.0, 10.5).';
COMMENT ON COLUMN perfumes.decant_source    IS 'Where the decant came from (e.g. Surrender to Chance, r/fragrance swap).';
COMMENT ON COLUMN perfumes.decant_finished  IS 'True when the decant has been fully used up.';
