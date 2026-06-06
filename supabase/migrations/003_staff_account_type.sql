-- Migration 003: Add 'staff' account type for internal team members
-- Run this in Supabase SQL editor before deploying the code changes.

-- Step 1: Drop the existing inline check constraint (name varies by Postgres version)
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'user_profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%account_type%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE user_profiles DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

-- Step 2: Add updated constraint including 'staff'
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_account_type_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_account_type_check
  CHECK (account_type IN ('couple', 'planner', 'staff'));

-- Step 3: Update your own super_admin account
-- Replace the email below with your own if different.
UPDATE user_profiles
SET account_type = 'staff'
WHERE id IN (
  SELECT id FROM user_profiles
  WHERE id IN (
    SELECT id FROM user_profiles WHERE role IN ('admin', 'super_admin')
  )
);
