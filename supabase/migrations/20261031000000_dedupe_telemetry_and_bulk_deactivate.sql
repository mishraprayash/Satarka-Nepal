-- ==============================================================================
-- Migration: Idempotent River Telemetry + Single-Call Stale Alert Deactivation
-- ==============================================================================

-- 1. Remove duplicate gauge readings written by repeated syncs, keeping the first.
DELETE FROM river_telemetry_history t
USING river_telemetry_history d
WHERE t.station_id = d.station_id
  AND t.measured_at = d.measured_at
  AND t.id > d.id;

-- 2. One row per station per reading, so the sync can upsert with ON CONFLICT DO NOTHING.
CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_station_measured
  ON river_telemetry_history (station_id, measured_at);

-- 3. Deactivate official alerts from sources that just refreshed successfully
--    but no longer report them. Replaces one SELECT + UPDATE round trip per source.
CREATE OR REPLACE FUNCTION deactivate_stale_alerts(
  p_source_ids TEXT[],
  p_active_ids TEXT[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE alerts
  SET is_active = false,
      updated_at = now()
  WHERE is_active = true
    AND provenance = 'official'
    AND source_id = ANY(p_source_ids)
    AND NOT (id = ANY(COALESCE(p_active_ids, ARRAY[]::TEXT[])));

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE EXECUTE ON FUNCTION deactivate_stale_alerts(TEXT[], TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION deactivate_stale_alerts(TEXT[], TEXT[]) TO service_role;
