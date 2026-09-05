"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ReportsResponse } from "@/lib/types";

const LS_KEY = "satarka-reports-cache";

interface CacheEnvelope {
  data: ReportsResponse;
  at: number;
}

async function fetchReports(): Promise<ReportsResponse> {
  const res = await fetch("/api/reports", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as ReportsResponse;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, at: Date.now() } satisfies CacheEnvelope));
  } catch {}
  return data;
}

/** Situation reports (ReliefWeb), with an offline last-known fallback like alerts. */
export function useReports(initialData?: ReportsResponse) {
  const query = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    initialData,
    refetchInterval: 15 * 60_000,
    retry: 1,
  });

  const [cached, setCached] = useState<CacheEnvelope | null>(null);
  useEffect(() => {
    if (query.data) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCached(JSON.parse(raw) as CacheEnvelope);
    } catch {}
  }, [query.data]);

  const data = query.data ?? cached?.data;

  return {
    data,
    fromCache: !query.data && !!cached,
    isLoading: query.isLoading && !cached && !initialData,
    isError: query.isError && !cached && !initialData,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

