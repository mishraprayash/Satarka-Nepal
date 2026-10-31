import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasSecret } from "@/lib/server-auth";
import type { HazardType } from "@/lib/types";

const HAZARDS: readonly HazardType[] = ["flood", "earthquake", "landslide", "glof"];

/** Escape LIKE wildcards so user input matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    // Expired and removed reports are admin-only.
    const adminSecret = process.env.ADMIN_SECRET?.trim();
    const includeAll =
      searchParams.get("all") === "true" &&
      !!adminSecret &&
      hasSecret(req, adminSecret, "x-admin-key");
    const hazard = searchParams.get("hazard");
    const district = searchParams.get("district");
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "100", 10) || 100), 500);

    let query = supabase
      .from("alerts")
      .select("*")
      .eq("provenance", "community")
      .order("issued_at", { ascending: false })
      .limit(limit);

    if (!includeAll) {
      query = query.eq("is_active", true);
    }

    if (hazard && hazard !== "all") {
      const normalized = hazard.toLowerCase() as HazardType;
      if (!HAZARDS.includes(normalized)) {
        return NextResponse.json({ error: "Unknown hazard" }, { status: 400 });
      }
      query = query.eq("hazard", normalized);
    }

    if (district && district !== "all") {
      query = query.ilike("district", `%${escapeLike(district.trim().slice(0, 100))}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[community-reports] fetch error:", error);
      throw error;
    }

    return NextResponse.json({ reports: data || [] });
  } catch (error) {
    console.error("[community-reports] server error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
