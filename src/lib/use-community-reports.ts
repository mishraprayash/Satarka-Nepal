"use client";

import { useQuery } from "@tanstack/react-query";
import type { Alert } from "@/lib/types";
import { communityRowToAlert, type CommunityReportRow } from "@/lib/community-reports";

// Stable empty list so consumers' effects don't re-run on every render while loading.
const NO_REPORTS: Alert[] = [];

async function fetchCommunityReports(): Promise<Alert[]> {
  const res = await fetch("/api/community-reports", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { reports?: CommunityReportRow[] };
  return (data.reports ?? []).map(communityRowToAlert);
}

/** Active community reports from Supabase, normalised to the shared Alert shape. */
export function useCommunityReports() {
  const query = useQuery({
    queryKey: ["community-reports"],
    queryFn: fetchCommunityReports,
    refetchInterval: 5 * 60_000,
  });

  return {
    reports: query.data ?? NO_REPORTS,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
