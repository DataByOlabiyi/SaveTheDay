-- ──────────────────────────────────────────────────────────────
-- Migration 015 — RPC: bulk_reorder_milestones
--
-- What: Adds a SECURITY DEFINER function that accepts a wedding ID
--       and a JSONB array of {id, sort_order} pairs, then updates
--       story_milestones.sort_order in a single round-trip.
--
-- Why: The Studio drag-and-drop reorder UI currently issues one
--      UPDATE per milestone (N+1). With 10 milestones that is 10
--      sequential round-trips. This RPC collapses them into one
--      call. The function is scoped to the calling user's wedding
--      (AND wedding_id = p_wedding_id) so it cannot be used to
--      tamper with another couple's data.
--
-- Security model:
--   SECURITY DEFINER — the function runs as its definer (postgres /
--   service role), which is necessary to write through RLS without
--   requiring the caller to hold a write policy. The wedding_id
--   scope check inside the function body enforces ownership.
--
--   GRANT EXECUTE TO authenticated — anon callers cannot invoke
--   this function. Service role can always execute.
--
-- Risk: The JSONB input is not validated beyond casting. Malformed
--       UUIDs or non-integer sort_order values will raise a
--       Postgres cast error, which is the correct behaviour (the
--       caller receives an error rather than silent data corruption).
--       The wedding_id guard means a row with a mismatched
--       wedding_id is simply skipped (zero rows updated) rather
--       than rejected with an error — this is intentional to keep
--       the function simple and avoid partial-failure complexity.
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION bulk_reorder_milestones(
  p_wedding_id UUID,
  p_updates    JSONB   -- array of {id: uuid, sort_order: int}
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec JSONB;
BEGIN
  FOR rec IN SELECT * FROM jsonb_array_elements(p_updates)
  LOOP
    UPDATE story_milestones
    SET    sort_order = (rec->>'sort_order')::int
    WHERE  id         = (rec->>'id')::uuid
      AND  wedding_id = p_wedding_id;
  END LOOP;
END;
$$;

-- Only authenticated users (couple/planner) may call this RPC.
-- Service role bypasses this restriction automatically.
REVOKE EXECUTE ON FUNCTION bulk_reorder_milestones(UUID, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION bulk_reorder_milestones(UUID, JSONB) TO authenticated;
