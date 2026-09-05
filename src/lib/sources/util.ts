import type { HazardType, Severity } from "@/lib/types";

/**
 * Government hydrology feeds are noisy: bogus int64 counts, and sentinel
 * readings like -9999 / -99991 that mean "no data", not "very low water".
 */
const SENTINELS = new Set([-9999, -99991, -999, -99, 9223372036854775807]);

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  if (SENTINELS.has(n)) return null;
  return n;
}

export function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Map a raw earthquake magnitude to our shared severity scale. */
export function magnitudeToSeverity(mag: number | null): Severity {
  if (mag === null) return "info";
  if (mag >= 6) return "danger";
  if (mag >= 5) return "warning";
  if (mag >= 4) return "watch";
  if (mag >= 3) return "advisory";
  return "info";
}

/**
 * River water level vs its own warning/danger thresholds → severity.
 * Returns null when there isn't enough data to say anything honest.
 */
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

/** Normalise the free-text status strings BIPAD/DHM use. */
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

export interface FetchOpts {
  /** Next.js ISR revalidation window in seconds. */
  revalidate?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

/**
 * fetch() with a hard timeout and identifying User-Agent. Server-side only —
 * this is what lets us proxy feeds the browser can't reach and normalise them.
 */
async function fetchJsonOnce<T>(url: string, opts: FetchOpts): Promise<T> {
  const { revalidate = 120, timeoutMs = 9000, headers } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Satarka/0.1 (+Nepal disaster awareness; non-commercial)",
        accept: "application/json",
        ...headers,
      },
      // Cache/normalise at the edge; each source sets its own cadence.
      next: { revalidate },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * fetch() with a hard timeout, identifying User-Agent, and a single retry.
 * Server-side only — this is what lets us proxy feeds the browser can't reach
 * and normalise them. A one-shot retry (short backoff) means a single upstream
 * blip doesn't take a source dark for the whole revalidate window; 4xx client
 * errors are not retried since they won't succeed on a second try.
 */
export async function fetchJson<T = unknown>(url: string, opts: FetchOpts = {}): Promise<T> {
  try {
    return await fetchJsonOnce<T>(url, opts);
  } catch (err) {
    // Don't retry client errors (4xx) — they're deterministic.
    const msg = err instanceof Error ? err.message : String(err);
    if (/HTTP 4\d\d/.test(msg)) throw err;
    await new Promise((r) => setTimeout(r, 400));
    return fetchJsonOnce<T>(url, opts);
  }
}

/** Nepal / central-Himalaya bounding box, reused by several sources. */
export const NEPAL_BBOX = {
  minLat: 26,
  maxLat: 31,
  minLng: 80,
  maxLng: 89,
} as const;

export function inNepalBbox(lat: number, lng: number): boolean {
  return (
    lat >= NEPAL_BBOX.minLat &&
    lat <= NEPAL_BBOX.maxLat &&
    lng >= NEPAL_BBOX.minLng &&
    lng <= NEPAL_BBOX.maxLng
  );
}

/**
 * Pull a coordinate out of a BIPAD/DHM row. GeoJSON stores it as
 * `point.coordinates = [lng, lat]`; some rows instead carry flat
 * `latitude`/`longitude`. Sentinel readings (-9999 etc.) are rejected by
 * `num()`, so this returns null rather than a bogus point.
 */
export function extractLatLng(
  row: Record<string, unknown>,
): { lat: number; lng: number } | null {
  const point = row["point"] as { coordinates?: unknown } | undefined;
  const coords = point?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = num(coords[0]);
    const lat = num(coords[1]);
    if (lat !== null && lng !== null) return { lat, lng };
  }
  const lat = num(row["latitude"]);
  const lng = num(row["longitude"]);
  if (lat !== null && lng !== null) return { lat, lng };
  return null;
}

export type { HazardType };
