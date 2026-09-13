"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { MapDataResponse } from "@/lib/map-data";

const LS_KEY = "satarka-map-data-cache";

interface CacheEnvelope {
  data: MapDataResponse;
  at: number;
}

async function fetchMapData(fresh = false): Promise<MapDataResponse> {
  const url = fresh ? "/api/map-data?fresh=1" : "/api/map-data";
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as MapDataResponse;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, at: Date.now() } satisfies CacheEnvelope));
  } catch {}
  return data;
}

export function useMapData(initialData?: MapDataResponse) {
  const [isLowBw, setIsLowBw] = useState(false);

  useEffect(() => {
    const check = () => setIsLowBw(document.documentElement.dataset.lowbw === "true");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lowbw"] });
    return () => obs.disconnect();
  }, []);

  const pollInterval = isLowBw ? 600_000 : 120_000;

  const query = useQuery({
    queryKey: ["map-data"],
    queryFn: () => fetchMapData(false),
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
      const freshData = await fetchMapData(true);
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
