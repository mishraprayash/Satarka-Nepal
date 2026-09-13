import { NextResponse } from "next/server";
import { loadAllAlerts } from "@/lib/sources";
import { getAlertsFromDb } from "@/lib/supabase/server";
import { syncAlertsToSupabase } from "@/lib/supabase/sync";

// Recompute at most once a minute; upstream feeds have their own cache windows.
export const revalidate = 60;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fresh = searchParams.get("fresh") === "1" || searchParams.get("fresh") === "true";

  // If not a forced fresh bypass, attempt sub-15ms read from Supabase DB first
  if (!fresh) {
    const dbData = await getAlertsFromDb();
    if (dbData && dbData.alerts.length > 0) {
      return NextResponse.json(dbData, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Data-Source": "supabase",
        },
      });
    }
  }

  // Fallback / fresh fetch directly from upstream feeds
  const data = await loadAllAlerts(fresh);

  // Asynchronously upsert fresh alerts into Supabase without blocking the HTTP response
  void syncAlertsToSupabase(data.alerts, data.sources);

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": fresh
        ? "no-cache, no-store, max-age=0"
        : "public, s-maxage=60, stale-while-revalidate=300",
      "X-Data-Source": "upstream-isr",
    },
  });
}
