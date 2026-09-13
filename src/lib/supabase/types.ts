import type {
  Alert,
  HazardType,
  HighwayBlockage,
  HighwayStatus,
  Localized,
  Severity,
  SourceHealth,
  SourceStatus,
  Timeframe,
} from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: AlertRow;
        Insert: AlertInsert;
        Update: Partial<AlertInsert>;
        Relationships: GenericRelationship[];
      };
      highway_blockages: {
        Row: HighwayRow;
        Insert: HighwayInsert;
        Update: Partial<HighwayInsert>;
        Relationships: GenericRelationship[];
      };
      river_telemetry_history: {
        Row: TelemetryRow;
        Insert: TelemetryInsert;
        Update: Partial<TelemetryInsert>;
        Relationships: GenericRelationship[];
      };
      source_health: {
        Row: SourceHealthRow;
        Insert: SourceHealthInsert;
        Update: Partial<SourceHealthInsert>;
        Relationships: GenericRelationship[];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_alerts_near_point: {
        Args: {
          p_lat: number;
          p_lng: number;
          p_radius_km: number;
          p_limit: number;
        };
        Returns: AlertRow[];
      };
      prune_old_satarka_records: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type AlertRow = {
  id: string;
  hazard: HazardType;
  severity: Severity;
  severity_rank: number;
  timeframe: Timeframe;
  title_en: string;
  title_ne: string | null;
  description_en: string | null;
  description_ne: string | null;
  location_name: string | null;
  district: string | null;
  basin: string | null;
  lat: number | null;
  lng: number | null;
  geom: unknown | null;
  issued_at: string;
  expires_at: string | null;
  source_id: string;
  source_name: string;
  source_url: string;
  source_status: SourceStatus;
  provenance: string;
  meta: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AlertInsert = Omit<AlertRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

export type HighwayRow = {
  id: string;
  road_refno: string;
  title: string;
  location: string | null;
  district: string | null;
  status: HighwayStatus;
  closure_reason: string;
  repair_eta: string | null;
  efforts_being_made: string | null;
  remarks: string | null;
  contact_person: string | null;
  chainage: string | null;
  started_at: string | null;
  estimated_end_at: string | null;
  ended_at: string | null;
  lat: number | null;
  lng: number | null;
  geom: unknown | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type HighwayInsert = Omit<HighwayRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

export type TelemetryRow = {
  id: number;
  station_id: string;
  station_name: string;
  basin: string | null;
  water_level: number;
  warning_level: number | null;
  danger_level: number | null;
  trend: string | null;
  measured_at: string;
  geom: unknown | null;
  created_at: string;
};

export type TelemetryInsert = Omit<TelemetryRow, "id" | "created_at"> & {
  id?: number;
  created_at?: string;
};

export type SourceHealthRow = {
  id: string;
  name: string;
  status: SourceStatus;
  ok: boolean;
  scanned: number;
  surfaced: number;
  latency_ms: number | null;
  last_checked_at: string;
  error_message: string | null;
};

export type SourceHealthInsert = SourceHealthRow;

// ── Model Mappers: Canonical TS <-> Supabase DB Row ────────────────────────

export function alertRowToAlert(row: AlertRow): Alert {
  const hasCoords = row.lat != null && row.lng != null && !Number.isNaN(row.lat) && !Number.isNaN(row.lng);
  return {
    id: row.id,
    hazard: row.hazard,
    severity: row.severity,
    timeframe: row.timeframe,
    title: {
      en: row.title_en,
      ne: row.title_ne ?? undefined,
    },
    description: row.description_en || row.description_ne
      ? {
          en: row.description_en ?? "",
          ne: row.description_ne ?? undefined,
        }
      : undefined,
    location: hasCoords || row.location_name || row.district || row.basin
      ? {
          lat: hasCoords ? row.lat! : 0,
          lng: hasCoords ? row.lng! : 0,
          name: row.location_name ?? undefined,
          district: row.district ?? undefined,
          basin: row.basin ?? undefined,
        }
      : undefined,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    source: {
      id: row.source_id,
      name: row.source_name,
      url: row.source_url,
      status: row.source_status,
      fetchedAt: row.updated_at || row.created_at,
    },
    provenance: (row.provenance as "official" | "community") || "official",
    meta: row.meta || {},
  };
}

export function alertToAlertInsert(alert: Alert): AlertInsert {
  const loc = alert.location;
  const hasCoords = loc?.lat != null && loc?.lng != null && loc.lat !== 0 && loc.lng !== 0;

  return {
    id: alert.id,
    hazard: alert.hazard,
    severity: alert.severity,
    severity_rank: SEVERITY_RANK[alert.severity] ?? 0,
    timeframe: alert.timeframe,
    title_en: alert.title.en,
    title_ne: alert.title.ne ?? null,
    description_en: alert.description?.en ?? null,
    description_ne: alert.description?.ne ?? null,
    location_name: loc?.name ?? null,
    district: loc?.district ?? null,
    basin: loc?.basin ?? null,
    lat: hasCoords && loc?.lat != null ? loc.lat : null,
    lng: hasCoords && loc?.lng != null ? loc.lng : null,
    geom: hasCoords ? `SRID=4326;POINT(${loc!.lng} ${loc!.lat})` : null,
    issued_at: alert.issuedAt,
    expires_at: alert.expiresAt ?? null,
    source_id: alert.source.id,
    source_name: alert.source.name,
    source_url: alert.source.url,
    source_status: alert.source.status,
    provenance: alert.provenance,
    meta: alert.meta ?? {},
    is_active: true,
  };
}

export function highwayRowToHighway(row: HighwayRow): HighwayBlockage {
  return {
    id: row.id,
    roadRefno: row.road_refno,
    title: row.title,
    location: row.location ?? "",
    district: row.district ?? undefined,
    status: row.status,
    closureReason: row.closure_reason,
    repairEta: row.repair_eta ?? undefined,
    effortsBeingMade: row.efforts_being_made ?? undefined,
    remarks: row.remarks ?? undefined,
    contactPerson: row.contact_person ?? undefined,
    chainage: row.chainage ?? undefined,
    startedAt: row.started_at ?? undefined,
    estimatedEndAt: row.estimated_end_at ?? undefined,
    endedAt: row.ended_at ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    images: Array.isArray(row.meta?.images) ? (row.meta.images as string[]) : [],
    affectedDemography: (row.meta?.affectedDemography as HighwayBlockage["affectedDemography"]) ?? undefined,
  };
}

export function highwayToHighwayInsert(h: HighwayBlockage): HighwayInsert {
  const hasCoords = h.lat != null && h.lng != null;
  return {
    id: h.id,
    road_refno: h.roadRefno,
    title: h.title,
    location: h.location ?? null,
    district: h.district ?? null,
    status: h.status,
    closure_reason: h.closureReason,
    repair_eta: h.repairEta ?? null,
    efforts_being_made: h.effortsBeingMade ?? null,
    remarks: h.remarks ?? null,
    contact_person: h.contactPerson ?? null,
    chainage: h.chainage ?? null,
    started_at: h.startedAt ?? null,
    estimated_end_at: h.estimatedEndAt ?? null,
    ended_at: h.endedAt ?? null,
    lat: hasCoords ? h.lat! : null,
    lng: hasCoords ? h.lng! : null,
    geom: hasCoords ? `SRID=4326;POINT(${h.lng} ${h.lat})` : null,
    meta: {
      images: h.images ?? [],
      affectedDemography: h.affectedDemography ?? null,
    },
  };
}

export function sourceHealthRowToSourceHealth(
  row: SourceHealthRow,
  staticLookup?: Record<
    string,
    { url: string; timeframe: Timeframe; hazards: HazardType[]; note?: Localized }
  >,
): SourceHealth {
  const meta = staticLookup?.[row.id];
  return {
    id: row.id,
    name: row.name,
    url: meta?.url ?? "",
    status: row.status,
    timeframe: meta?.timeframe ?? "now",
    hazards: meta?.hazards ?? [],
    ok: row.ok,
    scanned: row.scanned,
    surfaced: row.surfaced,
    fetchedAt: row.last_checked_at,
    error: row.error_message ?? undefined,
    note: meta?.note,
  };
}
