-- Fix Database Schema for RBAC Implementation
-- Run this script to clean up existing data and prepare for RBAC

-- Option 1: Delete all existing users (RECOMMENDED for development)
-- This is the cleanest approach if you don't have important user data
TRUNCATE TABLE users CASCADE;

-- Option 2: Update existing users with a default password (if you want to keep users)
-- Uncomment the lines below if you want to keep existing users
-- UPDATE users SET password = '$2b$10$YourHashedPasswordHere' WHERE password IS NULL;

-- Verify the fix
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as users_with_null_password FROM users WHERE password IS NULL;

-- After running this script, restart the NestJS application
-- The seeder will automatically create the roles table and seed default roles
