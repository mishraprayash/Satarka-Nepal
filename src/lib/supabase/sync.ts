import { getSupabaseServerClient } from "./server";
import { alertToAlertInsert, highwayToHighwayInsert, type TelemetryInsert } from "./types";
import type { Alert, HighwayBlockage, SourceHealth } from "@/lib/types";
import { CONFIG } from "@/lib/config";

const BATCH_CHUNK_SIZE = 100;

export interface AlertSyncResult {
  alertsSynced: number;
  telemetryRecorded: number;
  staleDeactivated: number;
}

/**
 * Idempotently syncs canonical alerts and source health metrics into Supabase.
 * - Uses batch chunked upsert (ON CONFLICT (id) DO UPDATE).
 * - Transitions stale official alerts from healthy sources to is_active = false.
 * - Safely batches telemetry history and source health updates.
 */
export async function syncAlertsToSupabase(
  alerts: Alert[],
  sources: SourceHealth[],
): Promise<AlertSyncResult | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  if (!CONFIG.supabase.serviceRoleKey) {
    console.warn(
      "[supabase-sync] SUPABASE_SERVICE_ROLE_KEY is not configured; write operations may fail RLS policies.",
    );
  }

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

    // 1. Batch chunked upsert for active alerts
    let alertsSynced = 0;
    if (alertInserts.length > 0) {
      for (let i = 0; i < alertInserts.length; i += BATCH_CHUNK_SIZE) {
        const chunk = alertInserts.slice(i, i + BATCH_CHUNK_SIZE);
        const { error: alertErr } = await supabase
          .from("alerts")
          .upsert(chunk, { onConflict: "id" });

        if (alertErr) {
          console.error(
            `[supabase-sync] alerts upsert error on chunk ${Math.floor(i / BATCH_CHUNK_SIZE)}:`,
            alertErr.message,
            alertErr.details ?? "",
          );
        } else {
          alertsSynced += chunk.length;
        }
      }
    }

    // 2. Active flag transitions: Deactivate stale alerts for sources that ran successfully
    let staleDeactivated = 0;
    const healthySources = sources.filter((s) => s.ok);

    for (const s of healthySources) {
      const currentIdsForSource = new Set(
        alerts.filter((a) => a.source.id === s.id).map((a) => a.id),
      );

      // Find all currently active official alerts in DB for this source
      const { data: dbRows, error: fetchErr } = await supabase
        .from("alerts")
        .select("id")
        .eq("source_id", s.id)
        .eq("is_active", true)
        .eq("provenance", "official");

      if (fetchErr) {
        console.error(
          `[supabase-sync] failed to fetch active alerts for stale check on source ${s.id}:`,
          fetchErr.message,
        );
        continue;
      }

      const staleIds = (dbRows ?? [])
        .map((r) => r.id)
        .filter((id) => !currentIdsForSource.has(id));

      if (staleIds.length > 0) {
        for (let i = 0; i < staleIds.length; i += BATCH_CHUNK_SIZE) {
          const chunk = staleIds.slice(i, i + BATCH_CHUNK_SIZE);
          const { error: deactErr } = await supabase
            .from("alerts")
            .update({
              is_active: false,
              updated_at: new Date().toISOString(),
            })
            .in("id", chunk);

          if (deactErr) {
            console.error(
              `[supabase-sync] failed to deactivate stale alerts for source ${s.id}:`,
              deactErr.message,
            );
          } else {
            staleDeactivated += chunk.length;
          }
        }
      }
    }

    // 3. Batch chunked insert for telemetry history (for hydrographs)
    let telemetryRecorded = 0;
    if (telemetryInserts.length > 0) {
      for (let i = 0; i < telemetryInserts.length; i += BATCH_CHUNK_SIZE) {
        const chunk = telemetryInserts.slice(i, i + BATCH_CHUNK_SIZE);
        const { error: telemErr } = await supabase
          .from("river_telemetry_history")
          .insert(chunk);

        if (telemErr) {
          console.error(
            `[supabase-sync] telemetry insert error on chunk ${Math.floor(i / BATCH_CHUNK_SIZE)}:`,
            telemErr.message,
            telemErr.details ?? "",
          );
        } else {
          telemetryRecorded += chunk.length;
        }
      }
    }

    // 4. Batch chunked upsert for source health
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

      for (let i = 0; i < healthInserts.length; i += BATCH_CHUNK_SIZE) {
        const chunk = healthInserts.slice(i, i + BATCH_CHUNK_SIZE);
        const { error: healthErr } = await supabase
          .from("source_health")
          .upsert(chunk, { onConflict: "id" });

        if (healthErr) {
          console.error(
            `[supabase-sync] source health upsert error on chunk ${Math.floor(i / BATCH_CHUNK_SIZE)}:`,
            healthErr.message,
            healthErr.details ?? "",
          );
        }
      }
    }

    return {
      alertsSynced,
      telemetryRecorded,
      staleDeactivated,
    };
  } catch (err) {
    console.error("[supabase-sync] exception during sync:", err);
    return null;
  }
}

/**
 * Idempotently syncs national highway status into Supabase.
 * Batches inserts in chunks with comprehensive error logging.
 */
export async function syncHighwaysToSupabase(
  highways: HighwayBlockage[],
): Promise<number | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const inserts = highways.map(highwayToHighwayInsert);
    if (inserts.length === 0) return 0;

    let syncedCount = 0;
    for (let i = 0; i < inserts.length; i += BATCH_CHUNK_SIZE) {
      const chunk = inserts.slice(i, i + BATCH_CHUNK_SIZE);
      const { error } = await supabase
        .from("highway_blockages")
        .upsert(chunk, { onConflict: "id" });

      if (error) {
        console.error(
          `[supabase-sync] highways upsert error on chunk ${Math.floor(i / BATCH_CHUNK_SIZE)}:`,
          error.message,
          error.details ?? "",
        );
      } else {
        syncedCount += chunk.length;
      }
    }

    return syncedCount;
  } catch (err) {
    console.error("[supabase-sync] highway sync exception:", err);
    return null;
  }
}
