import type { Alert, AlertsResponse, SourceHealth } from "@/lib/types";
import { haversineKm } from "@/lib/distance";
import { SEVERITY_RANK } from "@/lib/types";
import type { SourceContext, SourceDescriptor } from "./base";
import {
  bipadAlertSource,
  bipadIncidentSource,
  bipadRainSource,
  bipadRiverSource,
} from "./bipad";
import { usgsSource } from "./usgs";
import { gdacsSource } from "./gdacs";
import { geoglowsSource } from "./geoglows";
import { GEOGLOWS_REACHES } from "./geoglows-reaches";
import { nowIso } from "./util";

/**
 * The v1 source registry. GEOGloWS is only registered once its reach list is
 * curated — an empty forecast feed would be noise, not honesty.
 */
export const SOURCES: SourceDescriptor[] = [
  bipadAlertSource,
  bipadRiverSource,
  bipadRainSource,
  bipadIncidentSource,
  usgsSource,
  gdacsSource,
  ...(GEOGLOWS_REACHES.length > 0 ? [geoglowsSource] : []),
];

/** Most severe first; within a severity, most recent first. */
function sortAlerts(a: Alert, b: Alert): number {
  const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (bySeverity !== 0) return bySeverity;
  return Date.parse(b.issuedAt || "") - Date.parse(a.issuedAt || "");
}

/** 
 * Remove near-duplicate alerts that represent the same real-world event
 * reported by multiple sources. Keeps the higher-severity / more-trusted entry.
 */
function deduplicateAlerts(alerts: Alert[]): Alert[] {
  const STATUS_TRUST: Record<string, number> = {
    live: 3,
    recent: 2,
    reference: 1,
    "report-only": 0,
    "no-feed": 0,
  };

  const dominated = new Set<number>();

  for (let i = 0; i < alerts.length; i++) {
    if (dominated.has(i)) continue;
    for (let j = i + 1; j < alerts.length; j++) {
      if (dominated.has(j)) continue;
      const a = alerts[i];
      const b = alerts[j];

      // Must be the same hazard type
      if (a.hazard !== b.hazard) continue;

      // Must be issued within 24h of each other
      const timeDiff = Math.abs(Date.parse(a.issuedAt) - Date.parse(b.issuedAt));
      if (timeDiff > 24 * 3600_000) continue;

      // Must have co-located coordinates (within 5 km)
      if (
        a.location?.lat == null || a.location?.lng == null ||
        b.location?.lat == null || b.location?.lng == null
      ) continue;
      const km = haversineKm(
        { lat: a.location.lat, lng: a.location.lng },
        { lat: b.location.lat, lng: b.location.lng },
      );
      if (km > 5) continue;

      // They are duplicates — drop the weaker one
      const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (sevDiff > 0) {
        dominated.add(i);
        break; // i is dominated, stop comparing it
      } else if (sevDiff < 0) {
        dominated.add(j);
      } else {
        // Same severity — prefer higher trust source
        const trustA = STATUS_TRUST[a.source.status] ?? 0;
        const trustB = STATUS_TRUST[b.source.status] ?? 0;
        if (trustB > trustA) {
          dominated.add(i);
          break;
        } else {
          dominated.add(j);
        }
      }
    }
  }

  return alerts.filter((_, idx) => !dominated.has(idx));
}

let cachedSnapshot: AlertsResponse | null = null;
let lastFetchedEpoch = 0;
let refreshPromise: Promise<AlertsResponse> | null = null;
const CACHE_FRESHNESS_MS = 45_000;

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
export async function loadAllAlerts(): Promise<AlertsResponse> {
  const now = Date.now();

  // If cache is fresh, return immediately
  if (cachedSnapshot && now - lastFetchedEpoch < CACHE_FRESHNESS_MS) {
    return cachedSnapshot;
  }

  // If cache exists but is stale, trigger background refresh and return stale snapshot
  if (cachedSnapshot) {
    if (!refreshPromise) {
      refreshPromise = fetchFreshAlerts().finally(() => {
        refreshPromise = null;
      });
    }
    return cachedSnapshot;
  }

  // Cold start
  if (!refreshPromise) {
    refreshPromise = fetchFreshAlerts().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export { loadReports, RELIEFWEB_PUBLIC_URL } from "./reliefweb";
