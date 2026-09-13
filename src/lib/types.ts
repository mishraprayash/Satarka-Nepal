import { z } from "zod";

/**
 * The single normalised hazard schema every upstream feed is mapped into.
 * Each source has its own format, cadence, and quirks; the rest of the app
 * only ever sees `Alert` objects and the `SourceHealth` that produced them.
 */

export const HAZARD_TYPES = ["flood", "glof", "earthquake", "landslide"] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

/** Ordered least → most severe. Colour is never the ONLY signal in the UI. */
export const SEVERITIES = ["info", "advisory", "watch", "warning", "danger"] as const;
export type Severity = (typeof SEVERITIES)[number];
export const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  advisory: 1,
  watch: 2,
  warning: 3,
  danger: 4,
};

/**
 * How honest a section is allowed to be about its data:
 *  live        — a real feed we verified, refreshed continuously
 *  recent      — real but lags (hours/days), labelled as such
 *  reference   — static dataset (e.g. glacial-lake inventory), NOT monitoring
 *  report-only — situation reports, we link out rather than imply an alert
 *  no-feed     — no reliable feed exists; we say so and point to the source
 */
export const SOURCE_STATUSES = [
  "live",
  "recent",
  "reference",
  "report-only",
  "no-feed",
] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

/** Observed-now vs model-forecast vs after-the-fact report. Never blurred. */
export const TIMEFRAMES = ["now", "forecast", "report"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const LocalizedSchema = z.object({
  en: z.string(),
  ne: z.string().optional(),
});
export type Localized = z.infer<typeof LocalizedSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  hazard: z.enum(HAZARD_TYPES),
  severity: z.enum(SEVERITIES),
  timeframe: z.enum(TIMEFRAMES),
  title: LocalizedSchema,
  description: LocalizedSchema.optional(),
  location: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      name: z.string().optional(),
      district: z.string().optional(),
      basin: z.string().optional(),
    })
    .optional(),
  issuedAt: z.string(),
  expiresAt: z.string().nullable().optional(),
  source: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    status: z.enum(SOURCE_STATUSES),
    fetchedAt: z.string(),
  }),
  provenance: z.enum(["official", "community"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type Alert = z.infer<typeof AlertSchema>;

export type SourceRef = Alert["source"];

/** Runtime health of one source in an aggregate response. */
export interface SourceHealth {
  id: string;
  name: string;
  url: string;
  status: SourceStatus;
  timeframe: Timeframe;
  hazards: HazardType[];
  /** Whether OUR fetch of it succeeded this cycle. */
  ok: boolean;
  fetchedAt: string;
  /** Items scanned upstream (for "N stations monitored"). */
  scanned?: number;
  /** Noteworthy items we surfaced as alerts. */
  surfaced: number;
  error?: string;
  /** Short, honest note shown under the source (e.g. why it's reference-only). */
  note?: Localized;
}

export interface AlertsResponse {
  generatedAt: string;
  sources: SourceHealth[];
  alerts: Alert[];
}

/**
 * Situation reports are kept OUT of the alert stream on purpose: a report is
 * not a warning. They surface as a clearly-separated "latest reports" list.
 */
export interface ReportItem {
  id: string;
  title: string;
  url: string;
  date: string;
  sourceName: string;
}

export interface ReportsResponse {
  generatedAt: string;
  status: SourceStatus;
  source: { name: string; url: string };
  reports: ReportItem[];
  ok: boolean;
  error?: string;
}

/** Compare severity; positive if a is more severe than b. */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

/**
 * Live Highway & Roadblock telemetry from Department of Roads (DOR) via BIPAD
 */
export type HighwayStatus = "OPEN" | "PARTIAL_OPEN" | "BLOCKED" | "CLOSED";

export interface HighwayBlockage {
  id: string;
  roadDataId?: number;
  title: string;
  roadRefno: string;
  linkCode?: string;
  location: string;
  district?: string;
  province?: number;
  status: HighwayStatus;
  closureReason: string;
  repairEta?: string;
  effortsBeingMade?: string;
  remarks?: string;
  contactPerson?: string;
  lat?: number;
  lng?: number;
  chainage?: string;
  startedAt?: string;
  estimatedEndAt?: string;
  endedAt?: string;
  actualRepairTime?: string;
  affectedDemography?: {
    maleCount?: number;
    femaleCount?: number;
    householdCount?: number;
  };
  images: string[];
}

export interface HighwaysResponse {
  generatedAt: string;
  highways: HighwayBlockage[];
  blockedCount: number;
  partialCount: number;
  openCount: number;
  ok: boolean;
  error?: string;
}

export interface DistrictWeather {
  districtId: string;
  temperature: number;
  humidity: number;
  rain: number;
  precipitationSum: number;
  weatherCode: number;
  windSpeed: number;
  aqi?: number;
  pm25?: number;
  pm10?: number;
  observedAt: string;
  forecast?: Array<{
    date: string;
    weatherCode: number;
    tempMax: number;
    tempMin: number;
    precipitationSum: number;
  }>;
}

