-- Add followersCount field to instagram_connections table
-- Run this SQL in your Supabase/PostgreSQL database

ALTER TABLE instagram_connections 
ADD COLUMN IF NOT EXISTS "followersCount" INTEGER;

-- Update existing records to have 0 as default (optional)
UPDATE instagram_connections 
SET "followersCount" = 0 
WHERE "followersCount" IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN instagram_connections."followersCount" IS 'Number of followers for the Instagram account';
