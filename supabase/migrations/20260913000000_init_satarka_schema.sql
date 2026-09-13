-- ==============================================================================
-- Satarka Nepal - Production Database Architecture
-- Optimized for Supabase PostgreSQL + PostGIS (Free Tier Compatible < 500MB)
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Enumerated Types
DO $$ BEGIN
  CREATE TYPE hazard_type AS ENUM ('flood', 'glof', 'earthquake', 'landslide');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('danger', 'warning', 'watch', 'advisory', 'info');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE timeframe_type AS ENUM ('now', 'forecast', 'report');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE highway_status_type AS ENUM ('BLOCKED', 'PARTIAL_OPEN', 'OPEN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE source_status_type AS ENUM ('live', 'recent', 'reference', 'report-only', 'no-feed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Canonical Alerts Table (Multi-Hazard Registry)
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  hazard hazard_type NOT NULL,
  severity severity_level NOT NULL,
  severity_rank SMALLINT NOT NULL DEFAULT 0,
  timeframe timeframe_type NOT NULL DEFAULT 'now',
  title_en TEXT NOT NULL,
  title_ne TEXT,
  description_en TEXT,
  description_ne TEXT,
  location_name TEXT,
  district TEXT,
  basin TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geom GEOMETRY(Point, 4326),
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_status source_status_type NOT NULL DEFAULT 'live',
  provenance TEXT NOT NULL DEFAULT 'official',
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_alerts_geom ON alerts USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_alerts_active_severity ON alerts (is_active, severity_rank DESC, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_hazard ON alerts (hazard, is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_district ON alerts (district) WHERE district IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_basin ON alerts (basin) WHERE basin IS NOT NULL;

-- 4. National Highway Passability Table
CREATE TABLE IF NOT EXISTS highway_blockages (
  id TEXT PRIMARY KEY,
  road_refno TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT,
  district TEXT,
  status highway_status_type NOT NULL,
  closure_reason TEXT NOT NULL DEFAULT 'Landslide',
  repair_eta TEXT,
  efforts_being_made TEXT,
  remarks TEXT,
  contact_person TEXT,
  chainage TEXT,
  started_at TIMESTAMPTZ,
  estimated_end_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geom GEOMETRY(Point, 4326),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highways_status ON highway_blockages (status);
CREATE INDEX IF NOT EXISTS idx_highways_geom ON highway_blockages USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_highways_road_refno ON highway_blockages (road_refno);

-- 5. River Gauge Telemetry Time-Series Table (Historical Curves)
CREATE TABLE IF NOT EXISTS river_telemetry_history (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT NOT NULL,
  station_name TEXT NOT NULL,
  basin TEXT,
  water_level DOUBLE PRECISION NOT NULL,
  warning_level DOUBLE PRECISION,
  danger_level DOUBLE PRECISION,
  trend TEXT,
  measured_at TIMESTAMPTZ NOT NULL,
  geom GEOMETRY(Point, 4326),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_station_time ON river_telemetry_history (station_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_basin ON river_telemetry_history (basin, measured_at DESC);

-- 6. Source Health Registry Table
CREATE TABLE IF NOT EXISTS source_health (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status source_status_type NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT true,
  scanned INTEGER NOT NULL DEFAULT 0,
  surfaced INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT
);

-- 7. High-Performance Spatial Query Function (Near-You)
CREATE OR REPLACE FUNCTION get_alerts_near_point(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 25.0,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF alerts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM alerts
  WHERE is_active = true
    AND geom IS NOT NULL
    AND ST_DWithin(
      geom::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000.0
    )
  ORDER BY
    ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) ASC,
    severity_rank DESC
  LIMIT p_limit;
$$;

-- 8. Automated Free-Tier Pruning Function (Rolling Retention < 50MB)
CREATE OR REPLACE FUNCTION prune_old_satarka_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Mark expired alerts as inactive
  UPDATE alerts
  SET is_active = false
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < now();

  -- Purge inactive alerts older than 30 days
  DELETE FROM alerts
  WHERE is_active = false
    AND created_at < (now() - INTERVAL '30 days');

  -- Purge historical river telemetry older than 14 days
  DELETE FROM river_telemetry_history
  WHERE measured_at < (now() - INTERVAL '14 days');

  -- Purge resolved highway blockages older than 14 days
  DELETE FROM highway_blockages
  WHERE status = 'OPEN'
    AND updated_at < (now() - INTERVAL '14 days');
END;
$$;

-- Restrict prune execution to backend service role only
REVOKE EXECUTE ON FUNCTION prune_old_satarka_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_old_satarka_records() TO service_role;

-- 9. Row Level Security (RLS) Configuration
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE highway_blockages ENABLE ROW LEVEL SECURITY;
ALTER TABLE river_telemetry_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_health ENABLE ROW LEVEL SECURITY;

-- Public READ-ONLY access for frontend consumers
DROP POLICY IF EXISTS "Public can view alerts" ON alerts;
CREATE POLICY "Public can view alerts" ON alerts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view highway blockages" ON highway_blockages;
CREATE POLICY "Public can view highway blockages" ON highway_blockages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view telemetry history" ON river_telemetry_history;
CREATE POLICY "Public can view telemetry history" ON river_telemetry_history
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view source health" ON source_health;
CREATE POLICY "Public can view source health" ON source_health
  FOR SELECT USING (true);

-- WRITE access restricted strictly to service_role (Ingestion engine)
DROP POLICY IF EXISTS "Service role write alerts" ON alerts;
CREATE POLICY "Service role write alerts" ON alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role write highway blockages" ON highway_blockages;
CREATE POLICY "Service role write highway blockages" ON highway_blockages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role write telemetry history" ON river_telemetry_history;
CREATE POLICY "Service role write telemetry history" ON river_telemetry_history
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role write source health" ON source_health;
CREATE POLICY "Service role write source health" ON source_health
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Enable Realtime Pub/Sub on critical alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
