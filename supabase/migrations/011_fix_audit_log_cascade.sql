-- ──────────────────────────────────────────────────────────────
-- Migration 011 — Fix admin_audit_log FK cascade behaviour
--
-- What: Changes admin_audit_log.admin_id from ON DELETE CASCADE to
--       ON DELETE SET NULL.
--
-- Why: CASCADE silently deletes every audit record when an admin
--      account is removed from auth.users. That destroys the audit
--      trail — the exact opposite of what an audit log is for.
--      SET NULL preserves every row; the admin_id becomes NULL,
--      while admin_email (a separate TEXT column) still identifies
--      the actor in human-readable form.
--
-- Risk: The column must be nullable for SET NULL to work. It was
--       created NOT NULL in migration 002, so we drop that constraint
--       first with ALTER COLUMN ... DROP NOT NULL. Existing rows are
--       unaffected because SET NULL only fires on future DELETEs.
-- ──────────────────────────────────────────────────────────────

-- Step 1: Make admin_id nullable so SET NULL can fire.
-- The column was created NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE.
ALTER TABLE admin_audit_log
  ALTER COLUMN admin_id DROP NOT NULL;

-- Step 2: Swap the FK constraint.
ALTER TABLE admin_audit_log
  DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey,
  ADD CONSTRAINT admin_audit_log_admin_id_fkey
    FOREIGN KEY (admin_id)
    REFERENCES auth.users (id)
    ON DELETE SET NULL;
