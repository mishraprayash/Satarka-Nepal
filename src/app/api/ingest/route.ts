import crypto from "crypto";
import { NextResponse } from "next/server";
import { loadAllAlerts } from "@/lib/sources";
import { loadHighways } from "@/lib/sources/highway";
import { syncAlertsToSupabase, syncHighwaysToSupabase } from "@/lib/supabase/sync";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function timingSafeMatch(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: Request) {
  return handleIngest(req);
}

export async function GET(req: Request) {
  return handleIngest(req);
}

async function handleIngest(req: Request) {
  const startMs = Date.now();
  const cronSecret = process.env.CRON_SECRET;

  // In production, require CRON_SECRET to prevent unauthorized scrapers from invoking ingest
  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET must be configured in production" },
      { status: 503 },
    );
  }

  // Validate authorization if CRON_SECRET is configured
  if (cronSecret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get("secret") ?? "";

    const isAuthorized =
      timingSafeMatch(bearer, cronSecret) || timingSafeMatch(querySecret, cronSecret);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // 1. Fetch fresh upstream data in parallel
    const [alertsData, highwaysData] = await Promise.all([
      loadAllAlerts(true),
      loadHighways(),
    ]);

    // 2. Sync to Supabase
    const [alertSyncResult, highwaySyncCount] = await Promise.all([
      syncAlertsToSupabase(alertsData.alerts, alertsData.sources),
      syncHighwaysToSupabase(highwaysData),
    ]);

    // 3. Trigger automated rolling retention prune
    const supabase = getSupabaseServerClient();
    if (supabase) {
      void supabase.rpc("prune_old_satarka_records");
    }

    const durationMs = Date.now() - startMs;

    return NextResponse.json({
      ok: true,
      durationMs,
      synced: {
        alerts: alertSyncResult?.alertsSynced ?? 0,
        telemetry: alertSyncResult?.telemetryRecorded ?? 0,
        highways: highwaySyncCount ?? 0,
        sources: alertsData.sources.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ingest] synchronization failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
