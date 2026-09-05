"use client";

import dynamic from "next/dynamic";
import type { Severity } from "@/lib/types";

export interface AlertMiniMapProps {
  lat: number;
  lng: number;
  severity: Severity;
  title: string;
  place?: string;
}

const AlertMiniMapInner = dynamic(
  () => import("./alert-mini-map-inner").then((m) => m.AlertMiniMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="relative flex h-48 sm:h-56 w-full items-center justify-center rounded-card border border-border bg-surface-2/40 text-xs text-muted">
        <span className="tabular">Loading map…</span>
      </div>
    ),
  },
);

export function AlertMiniMap(props: AlertMiniMapProps) {
  return <AlertMiniMapInner {...props} />;
}
