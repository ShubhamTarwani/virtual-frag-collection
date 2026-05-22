-- Create master_fragrances table
CREATE TABLE IF NOT EXISTS master_fragrances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  house text NOT NULL,
  family text NOT NULL,
  character text,
  projection text,
  longevity text,
  season_tags text[],
  occasion_tags text[],
  top_notes text[],
  heart_notes text[],
  base_notes text[],
  description text,
  release_year integer,
  image_url text,
  cloudinary_public_id text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add suspended column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

-- RLS policies for master_fragrances
ALTER TABLE master_fragrances ENABLE ROW LEVEL SECURITY;

-- Allow read access for everyone
CREATE POLICY "Enable read access for all users" ON master_fragrances
  FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_master_fragrances_name_house ON master_fragrances(name, house);
CREATE INDEX IF NOT EXISTS idx_master_fragrances_verified ON master_fragrances(verified);
