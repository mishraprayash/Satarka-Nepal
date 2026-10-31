import type { AlertsResponse } from "@/lib/types";
import { loadAllAlerts } from "@/lib/sources";
import { sortAlerts } from "@/lib/deduplication";
import {
  getAlertsFromDb,
  getCommunityAlertsFromDb,
  isSnapshotFresh,
} from "@/lib/supabase/server";

export type AlertsOrigin = "supabase" | "upstream";

/**
 * The single read path for alerts, shared by server-rendered pages and
 * /api/alerts so the first render and the first client refetch agree.
 *
 * 1. Serve the Supabase snapshot when it exists and the ingest cron has
 *    refreshed it recently.
 * 2. Otherwise go to the live upstream feeds and merge in active community
 *    reports, which only exist in Supabase.
 *
 * This is read-only: writes to Supabase happen only in /api/ingest.
 */
export async function getAlerts(
  { fresh = false }: { fresh?: boolean } = {},
): Promise<{ data: AlertsResponse; origin: AlertsOrigin }> {
  if (!fresh) {
    const db = await getAlertsFromDb();
    if (db && db.alerts.length > 0 && isSnapshotFresh(db.generatedAt)) {
      return { data: db, origin: "supabase" };
    }
  }

  const [upstream, community] = await Promise.all([
    loadAllAlerts(fresh),
    getCommunityAlertsFromDb(),
  ]);

  const upstreamIds = new Set(upstream.alerts.map((a) => a.id));
  const alerts = [
    ...upstream.alerts,
    ...community.filter((a) => !upstreamIds.has(a.id)),
  ].sort(sortAlerts);

  return { data: { ...upstream, alerts }, origin: "upstream" };
}
