import type { Alert, AlertsResponse, SourceHealth } from "@/lib/types";
import { deduplicateAlerts, sortAlerts } from "@/lib/deduplication";
import type { SourceContext, SourceDescriptor } from "./base";
import {
  bipadAlertSource,
  bipadIncidentSource,
  bipadRainSource,
  bipadRiverSource,
} from "./bipad";
import { usgsSource } from "./usgs";
import { gdacsSource } from "./gdacs";
import { highwaySource, loadHighways } from "./highway";
import { geoglowsSource } from "./geoglows";
import { GEOGLOWS_REACHES } from "./geoglows-reaches";
import { nowIso } from "./util";

/**
 * The unified source registry.
 */
export const SOURCES: SourceDescriptor[] = [
  bipadAlertSource,
  bipadRiverSource,
  bipadRainSource,
  highwaySource,
  bipadIncidentSource,
  usgsSource,
  gdacsSource,
  ...(GEOGLOWS_REACHES.length > 0 ? [geoglowsSource] : []),
];

/**
 * In-memory stale-while-revalidate. NOTE: this cache is per-instance and only
 * helps within a single warm server process — on serverless/edge each cold
 * instance starts empty. The durable cross-request cache is Next.js's own data
 * cache (`next: { revalidate }` on every upstream fetch, plus `export const
 * revalidate` on the route). This layer just avoids re-running the fan-out +
 * dedup on rapid successive hits to the same warm instance.
 */
import { CONFIG } from "@/lib/config";

let cachedSnapshot: AlertsResponse | null = null;
let lastFetchedEpoch = 0;
let refreshPromise: Promise<AlertsResponse> | null = null;
const CACHE_FRESHNESS_MS = CONFIG.cache.alertsFreshnessMs;

/**
 * Kick off a background refresh at most once at a time. Errors are swallowed on
 * purpose: a failed background refresh must not become an unhandled rejection,
 * and callers keep serving the last good snapshot until the next attempt.
 */
function startBackgroundRefresh(): Promise<AlertsResponse> {
  if (!refreshPromise) {
    refreshPromise = fetchFreshAlerts()
      .catch((err) => {
        // Keep serving the stale snapshot; log for observability only.
        console.error("[alerts] background refresh failed:", err);
        return cachedSnapshot ?? { generatedAt: nowIso(), sources: [], alerts: [] };
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function fetchFreshAlerts(): Promise<AlertsResponse> {
  const fetchedAt = nowIso();
  const ctx: SourceContext = { fetchedAt };

  const settled = await Promise.allSettled(SOURCES.map((s) => s.load(ctx)));

  const sources: SourceHealth[] = SOURCES.map((s, i) => {
    const r = settled[i];
    const base = {
      id: s.id,
      name: s.name,
      url: s.url,
      status: s.status,
      timeframe: s.timeframe,
      hazards: s.hazards,
      fetchedAt,
      note: s.note,
    };
    if (r.status === "fulfilled") {
      return { ...base, ok: true, scanned: r.value.scanned, surfaced: r.value.alerts.length };
    }
    return {
      ...base,
      ok: false,
      surfaced: 0,
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    };
  });

  const alerts = deduplicateAlerts(
    settled
      .flatMap((r) => (r.status === "fulfilled" ? r.value.alerts : []))
  ).sort(sortAlerts);

  const result: AlertsResponse = { generatedAt: fetchedAt, sources, alerts };
  cachedSnapshot = result;
  lastFetchedEpoch = Date.now();
  return result;
}

/**
 * Run every source concurrently with server-side in-memory stale-while-revalidate.
 * Returns sub-millisecond cached responses while refreshing upstream APIs in the background.
 */
export async function loadAllAlerts(fresh = false): Promise<AlertsResponse> {
  const now = Date.now();

  // If forced fresh by client refresh action, coalesce in-flight or debounce within 5s
  if (fresh) {
    if (cachedSnapshot && now - lastFetchedEpoch < 5_000) {
      return cachedSnapshot;
    }
    if (refreshPromise) {
      return refreshPromise;
    }
    return startBackgroundRefresh();
  }

  // If cache is fresh, return immediately
  if (cachedSnapshot && now - lastFetchedEpoch < CACHE_FRESHNESS_MS) {
    return cachedSnapshot;
  }

  // If cache exists but is stale, trigger background refresh and return stale snapshot
  if (cachedSnapshot) {
    void startBackgroundRefresh();
    return cachedSnapshot;
  }

  // Cold start — no snapshot yet, so we must await the first fetch.
  return startBackgroundRefresh();
}

export { loadReports, RELIEFWEB_PUBLIC_URL } from "./reliefweb";
export { loadHighways } from "./highway";
