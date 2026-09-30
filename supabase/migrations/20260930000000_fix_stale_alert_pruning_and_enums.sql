-- ==============================================================================
-- Migration: Stale Alert Retention, Active Flag Transitions, and Enum Consistency
-- ==============================================================================

-- 1. Ensure highway_status_type enum accepts 'CLOSED' if added in future
DO $$ BEGIN
  ALTER TYPE highway_status_type ADD VALUE IF NOT EXISTS 'CLOSED';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Enhanced Automated Retention Function
-- Handles:
--   - Expired alerts (expires_at < now())
--   - Community reports older than 3 days
--   - Stale official alerts (> 14 days old or unrefreshed for > 7 days)
--   - Permanent purging of inactive records older than retention threshold
--   - Purging of river telemetry (> 14 days) and resolved roadblocks (> 14 days)
CREATE OR REPLACE FUNCTION prune_old_satarka_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Mark expired or stale alerts as inactive
  UPDATE alerts
  SET is_active = false,
      updated_at = now()
  WHERE is_active = true
    AND (
      (expires_at IS NOT NULL AND expires_at < now())
      OR (provenance = 'community' AND issued_at < (now() - INTERVAL '3 days'))
      OR (provenance = 'official' AND issued_at < (now() - INTERVAL '14 days'))
      OR (updated_at < (now() - INTERVAL '7 days'))
    );

  -- 2. Purge inactive alerts older than 30 days (or inactive community reports older than 14 days)
  DELETE FROM alerts
  WHERE is_active = false
    AND (
      (provenance = 'community' AND created_at < (now() - INTERVAL '14 days'))
      OR created_at < (now() - INTERVAL '30 days')
    );

  -- 3. Purge historical river telemetry older than 14 days
  DELETE FROM river_telemetry_history
  WHERE measured_at < (now() - INTERVAL '14 days');

  -- 4. Purge resolved highway blockages older than 14 days, or stale open records older than 30 days
  DELETE FROM highway_blockages
  WHERE (status = 'OPEN' AND updated_at < (now() - INTERVAL '14 days'))
     OR updated_at < (now() - INTERVAL '30 days');
END;
$$;

-- Restrict prune execution to backend service role only
REVOKE EXECUTE ON FUNCTION prune_old_satarka_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_old_satarka_records() TO service_role;
