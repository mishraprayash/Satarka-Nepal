import { NextResponse } from "next/server";
import { loadAllAlerts } from "@/lib/sources";
import { loadHighways } from "@/lib/sources/highway";
import { syncAlertsToSupabase, syncHighwaysToSupabase } from "@/lib/supabase/sync";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { hasSecret } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Unwraps a settled result, recording a labelled error when it rejected. */
function settledValue<T>(label: string, settled: PromiseSettledResult<T>, errors: string[]): T | null {
  if (settled.status === "fulfilled") return settled.value;
  console.error(`[ingest] ${label} failed:`, settled.reason);
  errors.push(`${label}: ${errorMessage(settled.reason)}`);
  return null;
}

export async function POST(req: Request) {
  return handleIngest(req);
}

export async function GET(req: Request) {
  return handleIngest(req);
}

async function handleIngest(req: Request) {
  const startMs = Date.now();
  const cronSecret = process.env.CRON_SECRET?.trim();

  // In production, require CRON_SECRET to prevent unauthorized invocations
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET must be configured in production" },
      { status: 503 },
    );
  }

  // Validate authorization if CRON_SECRET is configured. Header-only: the
  // secret must never travel in the URL, where it lands in access logs.
  if (cronSecret && !hasSecret(req, cronSecret, "x-cron-secret")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];

  try {
    // 1. Fetch fresh upstream data in parallel with failure isolation
    const [alertsSettled, highwaysSettled] = await Promise.allSettled([
      loadAllAlerts(true),
      loadHighways(),
    ]);

    const alertsData = settledValue("Alerts load", alertsSettled, errors);
    const highwaysData = settledValue("Highways load", highwaysSettled, errors);

    // 2. Sync to Supabase in parallel with failure isolation
    const [alertSyncSettled, highwaySyncSettled] = await Promise.allSettled([
      alertsData
        ? syncAlertsToSupabase(alertsData.alerts, alertsData.sources)
        : Promise.resolve(null),
      highwaysData
        ? syncHighwaysToSupabase(highwaysData)
        : Promise.resolve(null),
    ]);

    const alertSyncResult = settledValue("Alerts sync", alertSyncSettled, errors);
    const highwaySyncCount = settledValue("Highways sync", highwaySyncSettled, errors);

    // 3. Trigger automated rolling retention prune safely
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      try {
        const { error: pruneErr } = await supabase.rpc("prune_old_satarka_records");
        if (pruneErr) {
          console.error("[ingest] prune_old_satarka_records RPC error:", pruneErr.message);
          errors.push(`Prune RPC: ${pruneErr.message}`);
        }
      } catch (pErr) {
        console.error("[ingest] prune_old_satarka_records exception:", pErr);
        errors.push(`Prune exception: ${errorMessage(pErr)}`);
      }
    }

    const durationMs = Date.now() - startMs;
    const allUpstreamsFailed = alertsData === null && highwaysData === null;

    return NextResponse.json(
      {
        ok: !allUpstreamsFailed,
        durationMs,
        synced: {
          alerts: alertSyncResult?.alertsSynced ?? 0,
          telemetry: alertSyncResult?.telemetryRecorded ?? 0,
          staleDeactivated: alertSyncResult?.staleDeactivated ?? 0,
          highways: highwaySyncCount ?? 0,
          sources: alertsData?.sources.length ?? 0,
        },
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      },
      {
        status: allUpstreamsFailed ? 502 : 200,
      },
    );
  } catch (err) {
    console.error("[ingest] unexpected synchronization failure:", err);
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(err),
      },
      { status: 500 },
    );
  }
}
