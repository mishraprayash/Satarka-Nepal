"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AlertsResponse } from "@/lib/types";

const LS_KEY = "satarka-alerts-cache";

interface CacheEnvelope {
  data: AlertsResponse;
  at: number;
}

async function fetchAlerts(): Promise<AlertsResponse> {
  const res = await fetch("/api/alerts", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as AlertsResponse;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, at: Date.now() } satisfies CacheEnvelope));
  } catch {}
  return data;
}

/**
 * Live alerts with an honest offline story: when the network fails we fall back
 * to the last snapshot we persisted and tell the caller it's stale, so the UI
 * can show a "last-known from …" banner instead of pretending it's current.
 */
export function useAlerts(pollMs = 120_000, initialData?: AlertsResponse) {
  const query = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    initialData,
    refetchInterval: pollMs,
  });

  const [cached, setCached] = useState<CacheEnvelope | null>(null);
  useEffect(() => {
    if (query.data) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCached(JSON.parse(raw) as CacheEnvelope);
    } catch {}
  }, [query.data]);

  const response = query.data ?? cached?.data;
  const fromCache = !query.data && !!cached;

  return {
    response,
    fromCache,
    cachedAt: fromCache ? cached?.at : undefined,
    isLoading: query.isLoading && !cached && !initialData,
    isError: query.isError && !cached && !initialData,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

