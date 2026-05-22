-- Add cloudinary_public_id column if it doesn't exist
ALTER TABLE perfumes 
ADD COLUMN IF NOT EXISTS cloudinary_public_id text;

-- Rename or add image_url column if needed
ALTER TABLE perfumes
ADD COLUMN IF NOT EXISTS image_url text;

-- Comment for clarity
COMMENT ON COLUMN perfumes.cloudinary_public_id IS 
'Cloudinary public_id for transformation URLs';
COMMENT ON COLUMN perfumes.image_url IS 
'Full Cloudinary secure_url as fallback';
