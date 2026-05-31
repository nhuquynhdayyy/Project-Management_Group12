-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);

-- Add comment
COMMENT ON COLUMN users.avatar_url IS 'URL of user avatar stored in Supabase storage';
