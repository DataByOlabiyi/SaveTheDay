-- The policy "Service role can manage audit log" was created without a TO clause,
-- which makes it apply to ALL roles (anon, authenticated, service_role).
-- A WITH CHECK (true) policy for ALL without USING means any authenticated user
-- could INSERT, UPDATE, or DELETE audit entries directly via the Supabase REST API.
-- Service role bypasses RLS entirely and needs no policy — dropping this is sufficient.

DROP POLICY IF EXISTS "Service role can manage audit log" ON admin_audit_log;

-- Belt-and-suspenders: ensure no new permissive policy can be added accidentally
-- by explicitly denying all access to non-service-role callers.
-- Admin routes use createAdminClient() (service role) which bypasses these policies.
CREATE POLICY "No direct access for non-service-role"
  ON admin_audit_log
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
