import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { alertRowToAlert, highwayRowToHighway, sourceHealthRowToSourceHealth } from "./types";
import type { Alert, AlertsResponse, HighwayBlockage, HighwaysResponse, SourceHealth } from "@/lib/types";
import { CONFIG } from "@/lib/config";
import { SOURCES } from "@/lib/sources";

let serverClient: SupabaseClient<Database> | null = null;

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

/**
 * High-speed read of active alerts from Supabase PostgreSQL (< 15ms).
 * Returns null if Supabase is unconfigured or encounters a network error.
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

    return {
      generatedAt: new Date().toISOString(),
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
    const blockedCount = highways.filter((h) => h.status === "BLOCKED" || h.status === "CLOSED").length;
    const partialCount = highways.filter((h) => h.status === "PARTIAL_OPEN").length;
    const openCount = highways.filter((h) => h.status === "OPEN").length;

    return {
      generatedAt: new Date().toISOString(),
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
