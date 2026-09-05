import type { HazardType, Severity, SourceStatus } from "@/lib/types";

/** Chip styles per severity. Static strings so Tailwind can see them. */
export const SEVERITY_CHIP: Record<Severity, string> = {
  info: "text-info bg-info-soft",
  advisory: "text-advisory bg-advisory-soft",
  watch: "text-watch bg-watch-soft",
  warning: "text-warning bg-warning-soft",
  danger: "text-danger bg-danger-soft",
};

/** Foreground-only severity colour (word + glyph accents, no pill background). */
export const SEVERITY_TEXT: Record<Severity, string> = {
  info: "text-info",
  advisory: "text-advisory",
  watch: "text-watch",
  warning: "text-warning",
  danger: "text-danger",
};

/** Left accent bar per severity, for alert cards. */
export const SEVERITY_BAR: Record<Severity, string> = {
  info: "bg-info",
  advisory: "bg-advisory",
  watch: "bg-watch",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** SourceStatus → i18n key under the `status` namespace. */
export const STATUS_KEY: Record<SourceStatus, "live" | "recent" | "reference" | "reportOnly" | "noFeed"> = {
  live: "live",
  recent: "recent",
  reference: "reference",
  "report-only": "reportOnly",
  "no-feed": "noFeed",
};

/** Status indicator dot colour (semantic, not decorative). */
export const STATUS_DOT: Record<SourceStatus, string> = {
  live: "bg-advisory",
  recent: "bg-watch",
  reference: "bg-info",
  "report-only": "bg-info",
  "no-feed": "bg-danger",
};

export const HAZARD_ORDER: HazardType[] = ["flood", "glof", "earthquake", "landslide"];
export const SEVERITY_ORDER: Severity[] = ["danger", "warning", "watch", "advisory", "info"];
