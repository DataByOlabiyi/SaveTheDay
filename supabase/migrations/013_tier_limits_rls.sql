-- ──────────────────────────────────────────────────────────────
-- Migration 013 — Enable RLS on tier_limits
--
-- What: Enables Row Level Security on the tier_limits table and
--       adds a single SELECT policy for authenticated users.
--
-- Why: Migration 008 created tier_limits and issued a bare
--      GRANT SELECT TO anon, authenticated. Without RLS enabled,
--      anyone with the anon key can read the table — that is
--      acceptable for this reference data, but it is inconsistent
--      with the project rule that every table must have RLS from
--      day one. More importantly, without RLS the table is also
--      implicitly writable by the service role without any policy
--      guard, which is fine, but enabling RLS makes the
--      permission model explicit and auditable.
--
-- Policy model:
--   anon  — no SELECT policy; tier_limits is not needed by
--            unauthenticated visitors. The existing GRANT on anon
--            from migration 008 is revoked below.
--   authenticated — SELECT only; couples and planners need to
--                   read tier limits to display plan details.
--   service role  — bypasses RLS entirely; no policy needed.
--   INSERT / UPDATE / DELETE — no policies; only service role
--                              (bypasses RLS) can modify this table.
--
-- Risk: FORCE ROW LEVEL SECURITY blocks even the table owner from
--       bypassing policies when connected as a non-superuser role.
--       The service role is exempt (it bypasses RLS by design).
-- ──────────────────────────────────────────────────────────────

ALTER TABLE tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE tier_limits FORCE ROW LEVEL SECURITY;

-- Revoke the anon GRANT added in migration 008; tier pricing data
-- should only be visible to logged-in users.
REVOKE SELECT ON tier_limits FROM anon;

-- Authenticated users may read all tier definitions.
DROP POLICY IF EXISTS "Authenticated users can read tier limits" ON tier_limits;

CREATE POLICY "Authenticated users can read tier limits"
  ON tier_limits
  FOR SELECT
  TO authenticated
  USING (true);

-- No INSERT / UPDATE / DELETE policies — service role manages this table.
