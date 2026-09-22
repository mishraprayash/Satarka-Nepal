-- ==============================================================================
-- Migration: Update Automated Retention & Pruning Function for Community Reports
-- Description: Extends prune_old_satarka_records() to auto-deactivate community 
--              reports after 3 days and permanently purge them after 14 days.
-- ==============================================================================

CREATE OR REPLACE FUNCTION prune_old_satarka_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- 1. Mark expired alerts as inactive (or community reports older than 3 days)
  UPDATE alerts
  SET is_active = false
  WHERE is_active = true
    AND (
      (expires_at IS NOT NULL AND expires_at < now())
      OR (provenance = 'community' AND issued_at < (now() - INTERVAL '3 days'))
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

  -- 4. Purge resolved highway blockages older than 14 days
  DELETE FROM highway_blockages
  WHERE status = 'OPEN'
    AND updated_at < (now() - INTERVAL '14 days');
END;
$$;

-- Restrict prune execution to backend service role only
REVOKE EXECUTE ON FUNCTION prune_old_satarka_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_old_satarka_records() TO service_role;
