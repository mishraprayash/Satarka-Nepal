import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get("all") === "true";

    let query = supabase
      .from("alerts")
      .select("*")
      .eq("provenance", "community")
      .order("issued_at", { ascending: false });

    if (!includeAll) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ reports: data || [] });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
