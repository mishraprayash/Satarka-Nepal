import { NextResponse } from "next/server";
import { loadReports, RELIEFWEB_PUBLIC_URL } from "@/lib/sources";
import type { ReportsResponse } from "@/lib/types";
import { nowIso } from "@/lib/sources/util";

export const revalidate = 900;

export async function GET() {
  const meta = {
    generatedAt: nowIso(),
    status: "report-only" as const,
    source: { name: "ReliefWeb (UN OCHA)", url: RELIEFWEB_PUBLIC_URL },
  };
  try {
    const reports = await loadReports();
    const body: ReportsResponse = { ...meta, reports, ok: true };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (err) {
    const body: ReportsResponse = {
      ...meta,
      reports: [],
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(body);
  }
}
