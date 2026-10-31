-- ==============================================================================
-- Migration: Fixed-Window Rate Limiting for Community Report Submissions
-- ==============================================================================

-- Keys are salted SHA-256 hashes of the client IP; raw addresses are never stored.
CREATE TABLE IF NOT EXISTS report_rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_report_rate_limits_window ON report_rate_limits (window_start);

-- No public policies: only the service role (which bypasses RLS) touches this table.
ALTER TABLE report_rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically counts one hit for p_key in the current window and returns
-- whether it is still within p_limit. Also clears windows older than a day.
CREATE OR REPLACE FUNCTION check_report_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window TIMESTAMPTZ :=
    to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_count INTEGER;
BEGIN
  INSERT INTO report_rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = report_rate_limits.count + 1
  RETURNING count INTO v_count;

  DELETE FROM report_rate_limits WHERE window_start < now() - INTERVAL '1 day';

  RETURN v_count <= p_limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION check_report_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION check_report_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
