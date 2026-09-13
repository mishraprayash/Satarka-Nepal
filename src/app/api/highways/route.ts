import { NextResponse } from "next/server";
import { loadHighways } from "@/lib/sources/highway";
import { getHighwaysFromDb } from "@/lib/supabase/server";
import { syncHighwaysToSupabase } from "@/lib/supabase/sync";
import type { HighwaysResponse } from "@/lib/types";

export const revalidate = 120; // 2 minutes

export async function GET() {
  try {
    // Attempt fast read from Supabase first
    const dbData = await getHighwaysFromDb();
    if (dbData && dbData.highways.length > 0) {
      return NextResponse.json(dbData, {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
          "X-Data-Source": "supabase",
        },
      });
    }

    // Upstream fallback
    const highways = await loadHighways();
    const blockedCount = highways.filter((h) => h.status === "BLOCKED").length;
    const partialCount = highways.filter((h) => h.status === "PARTIAL_OPEN").length;
    const openCount = highways.filter((h) => h.status === "OPEN").length;

    const res: HighwaysResponse = {
      generatedAt: new Date().toISOString(),
      highways,
      blockedCount,
      partialCount,
      openCount,
      ok: true,
    };

    // Asynchronously upsert to Supabase
    void syncHighwaysToSupabase(highways);

    return NextResponse.json(res, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        "X-Data-Source": "upstream-isr",
      },
    });
  } catch (err) {
    const res: HighwaysResponse = {
      generatedAt: new Date().toISOString(),
      highways: [],
      blockedCount: 0,
      partialCount: 0,
      openCount: 0,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(res, { status: 500 });
  }
}
