import type { Alert } from "@/lib/types";

/** The four public-warning steps shown on the status ladder, lowest first. */
export const LEVELS = ["clear", "watch", "warning", "danger"] as const;
export type NationalLevel = (typeof LEVELS)[number];

/**
 * The single headline level for Nepal: the most severe active alert decides it.
 * Advisory and info alerts don't raise the level above "clear".
 */
export function nationalLevel(alerts: Alert[]): { level: NationalLevel; count: number } {
  for (const level of ["danger", "warning", "watch"] as const) {
    const count = alerts.filter((a) => a.severity === level).length;
    if (count > 0) return { level, count };
  }
  return { level: "clear", count: 0 };
}
