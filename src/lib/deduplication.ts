import type { Alert, SourceStatus } from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";
import { haversineKm } from "@/lib/distance";

/** Relative trust ranking between source statuses for same-severity tie-breaking. */
const STATUS_TRUST: Record<SourceStatus, number> = {
  live: 3,
  recent: 2,
  reference: 1,
  "report-only": 0,
  "no-feed": 0,
};

/**
 * Sorts alerts with standard prioritization:
 * 1. Highest severity first (danger > warning > watch > advisory > info)
 * 2. Within the same severity, most recent first (newest issuedAt first)
 */
export function sortAlerts(a: Alert, b: Alert): number {
  const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (bySeverity !== 0) return bySeverity;
  return Date.parse(b.issuedAt || "") - Date.parse(a.issuedAt || "");
}

/**
 * Removes near-duplicate alerts representing the same real-world hazard event reported
 * by multiple feeds (e.g. DHM rain telemetry + BIPAD automated incident + DOR road block).
 *
 * Evaluation criteria for duplicate match:
 * 1. Same hazard category (e.g. flood vs flood)
 * 2. Spatial proximity within 5.0 km
 * 3. Temporal proximity within 24 hours
 *
 * Conflict resolution:
 * - Higher severity dominates and survives.
 * - Same severity: source with higher verified trust status (live > recent > reference) survives.
 */
export function deduplicateAlerts(alerts: Alert[]): Alert[] {
  if (alerts.length <= 1) return alerts;

  // 1. Exact ID deduplication: guarantee strictly unique alert IDs
  const seenIds = new Set<string>();
  const idDeduped: Alert[] = [];
  for (const a of alerts) {
    if (!seenIds.has(a.id)) {
      seenIds.add(a.id);
      idDeduped.push(a);
    }
  }

  if (idDeduped.length <= 1) return idDeduped;

  const dominated = new Set<number>();

  for (let i = 0; i < idDeduped.length; i++) {
    if (dominated.has(i)) continue;
    for (let j = i + 1; j < idDeduped.length; j++) {
      if (dominated.has(j)) continue;
      const a = idDeduped[i];
      const b = idDeduped[j];

      // Must be the exact same hazard type
      if (a.hazard !== b.hazard) continue;

      // Must be issued within a 24h temporal window of each other
      const timeDiff = Math.abs(Date.parse(a.issuedAt) - Date.parse(b.issuedAt));
      if (timeDiff > 24 * 3600_000) continue;

      // Must both have valid co-located coordinates (within 5 km radius)
      if (
        a.location?.lat == null ||
        a.location?.lng == null ||
        b.location?.lat == null ||
        b.location?.lng == null
      ) {
        continue;
      }

      const km = haversineKm(
        { lat: a.location.lat, lng: a.location.lng },
        { lat: b.location.lat, lng: b.location.lng },
      );
      if (km > 5) continue;

      // Duplicate confirmed — resolve which one dominates
      const sevDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
      if (sevDiff > 0) {
        // b is more severe, i is dominated
        dominated.add(i);
        break;
      } else if (sevDiff < 0) {
        // a is more severe, j is dominated
        dominated.add(j);
      } else {
        // Same severity — prefer source with higher status trust ranking
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

  return idDeduped.filter((_, idx) => !dominated.has(idx));
}
