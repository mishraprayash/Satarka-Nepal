"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AlertsResponse } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type { RealtimeChannel } from "@supabase/supabase-js";

let activeAlertsChannel: RealtimeChannel | null = null;
let subscribersCount = 0;
const alertChangeListeners = new Set<() => void>();

/**
 * An ingest run upserts every alert row, which arrives as one realtime event
 * per row. Coalesce a burst into a single refetch per quiet window, and cap the
 * wait so a steady trickle still refreshes.
 */
const REALTIME_DEBOUNCE_MS = 2_000;
const REALTIME_MAX_WAIT_MS = 10_000;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let burstStartedAt: number | null = null;

function notifyListeners() {
  debounceTimer = null;
  burstStartedAt = null;
  alertChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch {}
  });
}

function scheduleNotify() {
  const now = Date.now();
  burstStartedAt ??= now;
  if (debounceTimer) clearTimeout(debounceTimer);
  const remaining = REALTIME_MAX_WAIT_MS - (now - burstStartedAt);
  debounceTimer = setTimeout(notifyListeners, Math.max(0, Math.min(REALTIME_DEBOUNCE_MS, remaining)));
}

function subscribeToAlertsRealtime(onChange: () => void): () => void {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return () => {};

  alertChangeListeners.add(onChange);
  subscribersCount++;

  if (!activeAlertsChannel) {
    activeAlertsChannel = supabase
      .channel("satarka_realtime_alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "alerts",
        },
        scheduleNotify,
      )
      .subscribe();
  }

  return () => {
    alertChangeListeners.delete(onChange);
    subscribersCount--;

    if (subscribersCount <= 0 && activeAlertsChannel) {
      const ch = activeAlertsChannel;
      activeAlertsChannel = null;
      subscribersCount = 0;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = null;
      burstStartedAt = null;
      void supabase.removeChannel(ch);
    }
  };
}

const LS_KEY = "satarka-alerts-cache";

interface CacheEnvelope {
  data: AlertsResponse;
  at: number;
}

async function fetchAlerts(fresh = false): Promise<AlertsResponse> {
  const url = fresh ? "/api/alerts?fresh=1" : "/api/alerts";
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as AlertsResponse;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ data, at: Date.now() } satisfies CacheEnvelope));
  } catch {}
  return data;
}

/**
 * Live alerts with an honest offline story and threat-adaptive polling:
 * - Low-bandwidth mode throttles auto-polling to save 3G mobile data.
 * - Active danger warnings increase polling frequency to 60s.
 * - Auto-revalidates upon network reconnection.
 * - Supports forced fresh bypass (?fresh=1) on manual user refresh.
 */
export function useAlerts(pollMs = 120_000, initialData?: AlertsResponse) {
  const [isLowBw, setIsLowBw] = useState(false);

  useEffect(() => {
    const checkLowBw = () => {
      setIsLowBw(document.documentElement.dataset.lowbw === "true");
    };
    checkLowBw();
    const observer = new MutationObserver(checkLowBw);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-lowbw"] });
    return () => observer.disconnect();
  }, []);

  // Compute adaptive polling interval:
  // - Low bandwidth: 10 minutes (600s) to protect metered connections
  // - Normal: default 120s
  const effectiveInterval = isLowBw ? 600_000 : pollMs;

  const query = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetchAlerts(false),
    initialData,
    staleTime: 60_000,
    refetchInterval: effectiveInterval,
    refetchOnWindowFocus: true,
  });

  const queryClient = useQueryClient();

  // Subscribe to Supabase Realtime changes if configured (disabled in low-bw mode)
  useEffect(() => {
    if (isLowBw) return;
    return subscribeToAlertsRealtime(() => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
    });
  }, [isLowBw, queryClient]);

  // Revalidate immediately when network connection restores
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

  const response = query.data ?? cached?.data;
  const fromCache = !query.data && !!cached;

  // Dedicated force-refresh bypasses server cache directly
  const refetchFresh = async () => {
    try {
      const freshData = await fetchAlerts(true);
      queryClient.setQueryData(["alerts"], freshData);
      return freshData;
    } catch {
      return (await query.refetch()).data;
    }
  };

  return {
    response,
    fromCache,
    cachedAt: fromCache ? cached?.at : undefined,
    isLoading: query.isLoading && !cached && !initialData,
    isError: query.isError && !cached && !initialData,
    refetch: refetchFresh,
    isFetching: query.isFetching,
    isLowBw,
  };
}

