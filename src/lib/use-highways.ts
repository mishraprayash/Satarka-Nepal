"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { HighwaysResponse } from "@/lib/types";

const LS_KEY = "satarka-highways-cache";

interface CacheEnvelope {
  data: HighwaysResponse;
  at: number;
}

async function fetchHighways(fresh = false): Promise<HighwaysResponse> {
  const url = fresh ? "/api/highways?fresh=1" : "/api/highways";
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as HighwaysResponse;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, at: Date.now() } satisfies CacheEnvelope));
  } catch {}
  return data;
}

export function useHighways(initialData?: HighwaysResponse) {
  const [isLowBw, setIsLowBw] = useState(false);

  useEffect(() => {
    const check = () => setIsLowBw(document.documentElement.dataset.lowbw === "true");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lowbw"] });
    return () => obs.disconnect();
  }, []);

  const pollInterval = isLowBw ? 600_000 : 180_000;

  const query = useQuery({
    queryKey: ["highways"],
    queryFn: () => fetchHighways(false),
    initialData,
    staleTime: 60_000,
    refetchInterval: pollInterval,
    refetchOnWindowFocus: true,
  });

  // Revalidate on network recovery
  useEffect(() => {
    const handleOnline = () => {
      void query.refetch();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [query]);

  const [cached, setCached] = useState<CacheEnvelope | null>(null);
  useEffect(() => {
    if (query.data) return;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setCached(JSON.parse(raw) as CacheEnvelope);
    } catch {}
  }, [query.data]);

  const data = query.data ?? cached?.data;
  const fromCache = !query.data && !!cached;

  const refetchFresh = async () => {
    try {
      const freshData = await fetchHighways(true);
      query.refetch();
      return freshData;
    } catch {
      return query.refetch();
    }
  };

  return {
    data,
    fromCache,
    cachedAt: fromCache ? cached?.at : undefined,
    isLoading: query.isLoading && !cached && !initialData,
    isError: query.isError && !cached && !initialData,
    refetch: refetchFresh,
    isFetching: query.isFetching,
    isLowBw,
  };
}
