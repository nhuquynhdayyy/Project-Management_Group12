-- Add email verification fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);

-- Update existing users to be verified (backward compatibility)
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL OR is_verified = FALSE;

-- Add index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);

-- Add comment
COMMENT ON COLUMN users.is_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.verification_token IS 'Token used for email verification (UUID)';
