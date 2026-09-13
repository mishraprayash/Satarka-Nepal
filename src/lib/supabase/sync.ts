import { getSupabaseServerClient } from "./server";
import { alertToAlertInsert, highwayToHighwayInsert, type TelemetryInsert } from "./types";
import type { Alert, HighwayBlockage, SourceHealth } from "@/lib/types";

/**
 * Idempotently syncs canonical alerts and source health metrics into Supabase.
 * Uses batch upsert (ON CONFLICT (id) DO UPDATE).
 */
export async function syncAlertsToSupabase(
  alerts: Alert[],
  sources: SourceHealth[],
): Promise<{ alertsSynced: number; telemetryRecorded: number } | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const alertInserts = alerts.map(alertToAlertInsert);
    const telemetryInserts: TelemetryInsert[] = [];

    for (const a of alerts) {
      const m = a.meta ?? {};
      if (typeof m.waterLevel === "number" && a.hazard === "flood") {
        telemetryInserts.push({
          station_id: a.id,
          station_name: a.title.en,
          basin: a.location?.basin ?? null,
          water_level: m.waterLevel as number,
          warning_level: typeof m.warningLevel === "number" ? (m.warningLevel as number) : null,
          danger_level: typeof m.dangerLevel === "number" ? (m.dangerLevel as number) : null,
          trend: typeof m.trend === "string" ? (m.trend as string) : null,
          measured_at: a.issuedAt,
          geom: a.location?.lat && a.location?.lng ? `SRID=4326;POINT(${a.location.lng} ${a.location.lat})` : null,
        });
      }
    }

    // 1. Batch upsert alerts
    if (alertInserts.length > 0) {
      const { error: alertErr } = await supabase
        .from("alerts")
        .upsert(alertInserts, { onConflict: "id" });
      if (alertErr) {
        console.warn("[supabase-sync] alerts upsert error:", alertErr.message);
      }
    }

    // 2. Batch insert telemetry history (for hydrographs)
    if (telemetryInserts.length > 0) {
      const { error: telemErr } = await supabase
        .from("river_telemetry_history")
        .insert(telemetryInserts);
      if (telemErr) {
        console.warn("[supabase-sync] telemetry insert error:", telemErr.message);
      }
    }

    // 3. Batch upsert source health
    if (sources.length > 0) {
      const healthInserts = sources.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        ok: s.ok,
        scanned: s.scanned ?? 0,
        surfaced: s.surfaced,
        latency_ms: null,
        last_checked_at: s.fetchedAt,
        error_message: s.error ?? null,
      }));

      const { error: healthErr } = await supabase
        .from("source_health")
        .upsert(healthInserts, { onConflict: "id" });
      if (healthErr) {
        console.warn("[supabase-sync] source health upsert error:", healthErr.message);
      }
    }

    return {
      alertsSynced: alertInserts.length,
      telemetryRecorded: telemetryInserts.length,
    };
  } catch (err) {
    console.warn("[supabase-sync] exception during sync:", err);
    return null;
  }
}

/**
 * Idempotently syncs national highway status into Supabase.
 */
export async function syncHighwaysToSupabase(
  highways: HighwayBlockage[],
): Promise<number | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const inserts = highways.map(highwayToHighwayInsert);
    if (inserts.length === 0) return 0;

    const { error } = await supabase
      .from("highway_blockages")
      .upsert(inserts, { onConflict: "id" });

    if (error) {
      console.warn("[supabase-sync] highways upsert error:", error.message);
      return null;
    }

    return inserts.length;
  } catch (err) {
    console.warn("[supabase-sync] highway sync exception:", err);
    return null;
  }
}
