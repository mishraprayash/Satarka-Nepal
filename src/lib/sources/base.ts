import type {
  Alert,
  HazardType,
  Localized,
  SourceRef,
  SourceStatus,
  Timeframe,
} from "@/lib/types";

/** Result of loading one source for a single refresh cycle. */
export interface SourceLoadResult {
  alerts: Alert[];
  /** How many upstream items we looked at (e.g. "200 stations monitored"). */
  scanned?: number;
}

export interface SourceContext {
  /** Shared timestamp for this refresh cycle, stamped onto every alert. */
  fetchedAt: string;
}

/**
 * One source = its honest metadata + a loader that maps upstream → Alert[].
 * The registry (index.ts) runs every loader, stamps health, and never lets a
 * single failing feed take down the response.
 */
export interface SourceDescriptor {
  id: string;
  name: string;
  /** Outbound link to the authoritative source, always shown to the user. */
  url: string;
  status: SourceStatus;
  timeframe: Timeframe;
  hazards: HazardType[];
  /** Honest caveat rendered under the source (why it's reference/report/etc). */
  note?: Localized;
  load: (ctx: SourceContext) => Promise<SourceLoadResult>;
}

export function makeSourceRef(d: SourceDescriptor, fetchedAt: string): SourceRef {
  return { id: d.id, name: d.name, url: d.url, status: d.status, fetchedAt };
}
