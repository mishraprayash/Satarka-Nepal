import type { HazardType, Severity } from "@/lib/types";

/**
 * Classifies free-text titles, descriptions, and incident notes into Satarka's
 * four core civil hazard categories: flood, glof, earthquake, landslide.
 * Rejects non-geohazard events (e.g. fire, road vehicle accidents, epidemics).
 */
export function classifyHazard(text: string): HazardType | null {
  const t = text.toLowerCase();
  if (/glof|glacial lake|outburst|हिमताल/.test(t)) return "glof";
  if (/landslide|pahiro|debris|rockfall|highway|road.*close|सडक.*बन्द|पहिरो/.test(t)) return "landslide";
  if (/earthquake|quake|भूकम्प|seismic/.test(t)) return "earthquake";
  // Reject fire-related incidents — not a supported hazard domain
  if (/fire|आगो|आगलागी|दावानल/.test(t)) return null;
  if (/flood|rain|rainfall|बाढी|जलप्लावन|वर्षा|भारी वर्षा|cloudburst|waterlog/.test(t)) return "flood";
  return null;
}

/** Map earthquake magnitude (Richter / Moment scale) to severity tier. */
export function magnitudeToSeverity(mag: number | null): Severity {
  if (mag === null) return "info";
  if (mag >= 6.0) return "danger";
  if (mag >= 5.0) return "warning";
  if (mag >= 4.0) return "watch";
  if (mag >= 3.0) return "advisory";
  return "info";
}

/** River gauge water level vs warning and danger thresholds. */
export function riverLevelToSeverity(
  level: number | null,
  warning: number | null,
  danger: number | null,
): Severity | null {
  if (level === null) return null;
  if (danger !== null && level >= danger) return "danger";
  if (warning !== null && level >= warning) return "warning";
  if (warning !== null || danger !== null) return "info";
  return null;
}

/** Normalises free-text status strings from DHM/BIPAD into standardized Severity. */
export function statusStringToSeverity(status: string | null): Severity | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s.includes("DANGER")) return "danger";
  if (s.includes("ABOVE WARNING") || s.includes("WARNING LEVEL")) {
    return s.includes("BELOW") ? "info" : "warning";
  }
  if (s.includes("BELOW")) return "info";
  return null;
}
