-- Drop and Recreate Schema for RBAC Implementation
-- This script drops all existing tables to allow TypeORM to recreate them cleanly
-- Run this script before starting the NestJS application

-- ============================================
-- STEP 1: Drop all tables in correct order
-- ============================================

-- Drop junction tables first (they have foreign keys)
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS maintenance_tasks CASCADE;
DROP TABLE IF EXISTS trees CASCADE;

-- Drop main tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS tree_species CASCADE;
DROP TABLE IF EXISTS administrative_areas CASCADE;

-- ============================================
-- STEP 2: Verify all tables are dropped
-- ============================================

-- List remaining tables (should be empty or only PostGIS tables)
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ============================================
-- NOTES
-- ============================================

-- After running this script:
-- 1. Start the NestJS application: npm run start:dev
-- 2. TypeORM will automatically create all tables with correct schema
-- 3. SeederService will automatically populate:
--    - 3 roles: Admin, Manager, Staff
--    - 5 tree species
--    - 5 administrative areas
--    - Test users with roles (if configured)
-- 4. Verify in logs: [SeederService] Seeding complete — tree_species: 5, administrative_areas: 5, roles: 3

-- ============================================
-- EXPECTED SCHEMA AFTER RECREATION
-- ============================================

-- roles table:
--   id (PK), role_name (UNIQUE), description

-- users table:
--   id (PK), username (UNIQUE), email, password, full_name, 
--   assigned_area_id, is_active, last_login_at, created_at, updated_at

-- user_roles table (junction):
--   user_id (PK, FK -> users.id)
--   role_id (PK, FK -> roles.id)

-- tree_species table:
--   id (PK), common_name (UNIQUE), scientific_name, description

-- administrative_areas table:
--   id (PK), area_name (UNIQUE), parent_id

-- trees table:
--   id (PK), tree_code, qr_code, species_id (FK), area_id (FK),
--   location (PostGIS Point), planting_year, height_m, trunk_diameter_cm,
--   health_status, last_maintained_at

-- maintenance_tasks table:
--   id (PK), tree_id (FK), assigned_to (FK -> users.id),
--   task_type, status, scheduled_date, completed_at, evidence_image_url
