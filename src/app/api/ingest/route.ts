import crypto from "crypto";
import { NextResponse } from "next/server";
import { loadAllAlerts } from "@/lib/sources";
import { loadHighways } from "@/lib/sources/highway";
import { syncAlertsToSupabase, syncHighwaysToSupabase } from "@/lib/supabase/sync";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Constant-time string matching using SHA-256 hashes.
 * Ensures fixed 32-byte buffers to eliminate length-leak timing attacks
 * and prevent RangeError from crypto.timingSafeEqual length mismatches.
 */
function timingSafeMatch(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
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

  // Validate authorization if CRON_SECRET is configured
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const bearer = bearerMatch ? bearerMatch[1].trim() : "";
    const customHeaderSecret = req.headers.get("x-cron-secret")?.trim() ?? "";
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get("secret")?.trim() ?? "";

    const isAuthorized =
      timingSafeMatch(bearer, cronSecret) ||
      timingSafeMatch(customHeaderSecret, cronSecret) ||
      timingSafeMatch(querySecret, cronSecret);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const errors: string[] = [];

  try {
    // 1. Fetch fresh upstream data in parallel with failure isolation
    const [alertsSettled, highwaysSettled] = await Promise.allSettled([
      loadAllAlerts(true),
      loadHighways(),
    ]);

    const alertsData = alertsSettled.status === "fulfilled" ? alertsSettled.value : null;
    const highwaysData = highwaysSettled.status === "fulfilled" ? highwaysSettled.value : null;

    if (alertsSettled.status === "rejected") {
      const errMsg =
        alertsSettled.reason instanceof Error
          ? alertsSettled.reason.message
          : String(alertsSettled.reason);
      console.error("[ingest] alerts upstream load failed:", alertsSettled.reason);
      errors.push(`Alerts load: ${errMsg}`);
    }

    if (highwaysSettled.status === "rejected") {
      const errMsg =
        highwaysSettled.reason instanceof Error
          ? highwaysSettled.reason.message
          : String(highwaysSettled.reason);
      console.error("[ingest] highways upstream load failed:", highwaysSettled.reason);
      errors.push(`Highways load: ${errMsg}`);
    }

    // 2. Sync to Supabase in parallel with failure isolation
    const [alertSyncSettled, highwaySyncSettled] = await Promise.allSettled([
      alertsData
        ? syncAlertsToSupabase(alertsData.alerts, alertsData.sources)
        : Promise.resolve(null),
      highwaysData
        ? syncHighwaysToSupabase(highwaysData)
        : Promise.resolve(null),
    ]);

    const alertSyncResult =
      alertSyncSettled.status === "fulfilled" ? alertSyncSettled.value : null;
    const highwaySyncCount =
      highwaySyncSettled.status === "fulfilled" ? highwaySyncSettled.value : null;

    if (alertSyncSettled.status === "rejected") {
      const errMsg =
        alertSyncSettled.reason instanceof Error
          ? alertSyncSettled.reason.message
          : String(alertSyncSettled.reason);
      console.error("[ingest] alerts Supabase sync failed:", alertSyncSettled.reason);
      errors.push(`Alerts sync: ${errMsg}`);
    }

    if (highwaySyncSettled.status === "rejected") {
      const errMsg =
        highwaySyncSettled.reason instanceof Error
          ? highwaySyncSettled.reason.message
          : String(highwaySyncSettled.reason);
      console.error("[ingest] highways Supabase sync failed:", highwaySyncSettled.reason);
      errors.push(`Highways sync: ${errMsg}`);
    }

    // 3. Trigger automated rolling retention prune safely
    const supabase = getSupabaseServerClient();
    if (supabase) {
      try {
        const { error: pruneErr } = await supabase.rpc("prune_old_satarka_records");
        if (pruneErr) {
          console.error("[ingest] prune_old_satarka_records RPC error:", pruneErr.message);
          errors.push(`Prune RPC: ${pruneErr.message}`);
        }
      } catch (pErr) {
        const errMsg = pErr instanceof Error ? pErr.message : String(pErr);
        console.error("[ingest] prune_old_satarka_records exception:", pErr);
        errors.push(`Prune exception: ${errMsg}`);
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
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
