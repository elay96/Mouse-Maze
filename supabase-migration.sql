-- Mouse Maze Database Migration Script
-- =====================================
-- Run this script in Supabase SQL Editor to update an existing database
-- to support the new NetLogo Spatial Foraging Adaptation features.
--
-- This migration adds:
-- 1. maze_completed field to sessions table
-- 2. heading and food_here fields to movements table
-- 3. Updates condition values from CLUSTER/NOISE to CONCENTRATED/DIFFUSE
--
-- IMPORTANT: Back up your data before running this migration!

-- =====================================================
-- STEP 1: Add new columns to existing tables
-- =====================================================

-- Add maze_completed to sessions (tracks if participant completed maze training)
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS maze_completed BOOLEAN DEFAULT FALSE;

-- Add heading to movements (agent direction in degrees, 0=right, 90=up)
ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS heading REAL DEFAULT 0;

-- Add food_here to movements (whether a resource was collected at this sample)
ALTER TABLE movements 
ADD COLUMN IF NOT EXISTS food_here BOOLEAN DEFAULT FALSE;

-- =====================================================
-- STEP 2: Update condition values (CLUSTER -> CONCENTRATED, NOISE -> DIFFUSE)
-- =====================================================

-- Update sessions table
UPDATE sessions 
SET condition = 'CONCENTRATED' 
WHERE condition = 'CLUSTER';

UPDATE sessions 
SET condition = 'DIFFUSE' 
WHERE condition = 'NOISE';

-- Update rounds table
UPDATE rounds 
SET condition = 'CONCENTRATED' 
WHERE condition = 'CLUSTER';

UPDATE rounds 
SET condition = 'DIFFUSE' 
WHERE condition = 'NOISE';

-- Update movements table
UPDATE movements 
SET condition = 'CONCENTRATED' 
WHERE condition = 'CLUSTER';

UPDATE movements 
SET condition = 'DIFFUSE' 
WHERE condition = 'NOISE';

-- =====================================================
-- STEP 3: Set NOT NULL constraints (optional, for data integrity)
-- =====================================================

-- Make heading NOT NULL (after setting defaults for existing rows)
-- Note: This is safe because we set DEFAULT 0 above
ALTER TABLE movements 
ALTER COLUMN heading SET NOT NULL;

-- Make food_here NOT NULL
ALTER TABLE movements 
ALTER COLUMN food_here SET NOT NULL;

-- =====================================================
-- STEP 4: Verify migration
-- =====================================================

-- Run these queries to verify the migration was successful:

-- Check sessions schema
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'sessions' 
-- ORDER BY ordinal_position;

-- Check movements schema
-- SELECT column_name, data_type, column_default, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'movements' 
-- ORDER BY ordinal_position;

-- Check condition values distribution
-- SELECT condition, COUNT(*) FROM sessions GROUP BY condition;
-- SELECT condition, COUNT(*) FROM rounds GROUP BY condition;
-- SELECT condition, COUNT(*) FROM movements GROUP BY condition;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================

-- If you need to rollback this migration, run these commands:
--
-- -- Revert condition names
-- UPDATE sessions SET condition = 'CLUSTER' WHERE condition = 'CONCENTRATED';
-- UPDATE sessions SET condition = 'NOISE' WHERE condition = 'DIFFUSE';
-- UPDATE rounds SET condition = 'CLUSTER' WHERE condition = 'CONCENTRATED';
-- UPDATE rounds SET condition = 'NOISE' WHERE condition = 'DIFFUSE';
-- UPDATE movements SET condition = 'CLUSTER' WHERE condition = 'CONCENTRATED';
-- UPDATE movements SET condition = 'NOISE' WHERE condition = 'DIFFUSE';
--
-- -- Drop new columns
-- ALTER TABLE sessions DROP COLUMN IF EXISTS maze_completed;
-- ALTER TABLE movements DROP COLUMN IF EXISTS heading;
-- ALTER TABLE movements DROP COLUMN IF EXISTS food_here;

