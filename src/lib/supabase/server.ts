import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { alertRowToAlert, highwayRowToHighway, sourceHealthRowToSourceHealth } from "./types";
import type { Alert, AlertsResponse, HighwayBlockage, HighwaysResponse, SourceHealth } from "@/lib/types";
import { CONFIG } from "@/lib/config";
import { SOURCES } from "@/lib/sources";

let serverClient: SupabaseClient<Database> | null = null;
let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseServerClient(): SupabaseClient<Database> | null {
  if (!CONFIG.supabase.url) return null;

  const key = CONFIG.supabase.serviceRoleKey || CONFIG.supabase.anonKey;
  if (!key) return null;

  if (!serverClient) {
    serverClient = createClient<Database>(CONFIG.supabase.url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}

export function getSupabaseAdminClient(): SupabaseClient<Database> | null {
  if (!CONFIG.supabase.url || !CONFIG.supabase.serviceRoleKey) return null;

  if (!adminClient) {
    adminClient = createClient<Database>(CONFIG.supabase.url, CONFIG.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

export function resetSupabaseClients(): void {
  serverClient = null;
  adminClient = null;
}

function latestIso(values: (string | null | undefined)[]): string | null {
  let latest: number | null = null;
  for (const v of values) {
    const t = v ? Date.parse(v) : NaN;
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }
  return latest === null ? null : new Date(latest).toISOString();
}

/** True when a DB snapshot is recent enough to serve as current data. */
export function isSnapshotFresh(generatedAt: string, now = Date.now()): boolean {
  const t = Date.parse(generatedAt);
  return Number.isFinite(t) && now - t <= CONFIG.cache.dbSnapshotMaxAgeMs;
}

/**
 * Active community reports. These only live in Supabase, so the upstream
 * fallback path merges them in to stay consistent with the DB path.
 */
export async function getCommunityAlertsFromDb(): Promise<Alert[]> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("is_active", true)
      .eq("provenance", "community")
      .order("issued_at", { ascending: false })
      .limit(100);

    if (error) {
      console.warn("[supabase] community alerts fetch failed:", error.message);
      return [];
    }
    return (data ?? []).map(alertRowToAlert);
  } catch (err) {
    console.warn("[supabase] community alerts exception:", err);
    return [];
  }
}

/**
 * High-speed read of active alerts from Supabase PostgreSQL (< 15ms).
 * `generatedAt` is the time of the last ingest run (newest source_health
 * check), so callers can tell how old the snapshot really is.
 * Returns null if Supabase is unconfigured, has never been ingested into, or
 * encounters a network error.
 */
export async function getAlertsFromDb(): Promise<AlertsResponse | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const [alertsRes, healthRes] = await Promise.all([
      supabase
        .from("alerts")
        .select("*")
        .eq("is_active", true)
        .order("severity_rank", { ascending: false })
        .order("issued_at", { ascending: false })
        .limit(100),
      supabase
        .from("source_health")
        .select("*"),
    ]);

    if (alertsRes.error) {
      console.warn("[supabase] alerts fetch failed:", alertsRes.error.message);
      return null;
    }

    if (healthRes.error) {
      console.warn("[supabase] source_health fetch failed:", healthRes.error.message);
    }

    const sourceLookup = Object.fromEntries(
      SOURCES.map((s) => [
        s.id,
        { url: s.url, timeframe: s.timeframe, hazards: s.hazards, note: s.note },
      ]),
    );
    const alerts: Alert[] = (alertsRes.data ?? []).map(alertRowToAlert);
    const sources: SourceHealth[] = (healthRes.data ?? []).map((r) =>
      sourceHealthRowToSourceHealth(r, sourceLookup),
    );

    // The snapshot is only as new as the last ingest run, never "now".
    const generatedAt = latestIso((healthRes.data ?? []).map((r) => r.last_checked_at));
    if (!generatedAt) return null;

    return {
      generatedAt,
      sources,
      alerts,
    };
  } catch (err) {
    console.warn("[supabase] connection exception:", err);
    return null;
  }
}

/**
 * High-speed read of national highway blockages from Supabase.
 */
export async function getHighwaysFromDb(): Promise<HighwaysResponse | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("highway_blockages")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(150);

    if (error) {
      console.warn("[supabase] highways fetch failed:", error.message);
      return null;
    }

    const highways: HighwayBlockage[] = (data ?? []).map(highwayRowToHighway);
    // Rows are stamped with updated_at on every sync, so the newest one marks the snapshot time.
    const generatedAt = latestIso((data ?? []).map((r) => r.updated_at));
    if (!generatedAt) return null;
    const blockedCount = highways.filter((h) => h.status === "BLOCKED" || h.status === "CLOSED").length;
    const partialCount = highways.filter((h) => h.status === "PARTIAL_OPEN").length;
    const openCount = highways.filter((h) => h.status === "OPEN").length;

    return {
      generatedAt,
      highways,
      blockedCount,
      partialCount,
      openCount,
      ok: true,
    };
  } catch (err) {
    console.warn("[supabase] highways exception:", err);
    return null;
  }
}

/**
 * PostGIS spatial query: returns alerts within radiusKm of given lat/lng.
 */
export async function getAlertsNearFromDb(
  lat: number,
  lng: number,
  radiusKm = 25,
): Promise<Alert[] | null> {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc("get_alerts_near_point", {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_limit: 30,
    });

    if (error) {
      console.warn("[supabase] spatial RPC failed:", error.message);
      return null;
    }

    return (data ?? []).map(alertRowToAlert);
  } catch (err) {
    console.warn("[supabase] spatial query exception:", err);
    return null;
  }
}
