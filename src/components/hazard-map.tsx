"use client";

import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { MapDataResponse, RiverGauge, Quake } from "@/lib/map-data";
import type { HighwayBlockage } from "@/lib/types";
import { useMapData } from "@/lib/use-map-data";
import { cn } from "@/lib/cn";
import { ExternalIcon, HazardGlyph, SearchIcon, CloseIcon } from "@/components/icons";

const LeafletMap = dynamic(
  () => import("./leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[70vh] min-h-[460px] place-items-center text-sm text-muted">
        {"" /* replaced by the client render */}
      </div>
    ),
  },
);

export interface LayerState {
  basins: boolean;
  seismic: boolean;
  glacial: boolean;
  rivers: boolean;
  quakes: boolean;
  highways: boolean;
}

const DEFAULT_LAYERS: LayerState = {
  basins: true,
  seismic: false,
  glacial: true,
  rivers: true,
  quakes: true,
  highways: true,
};

export function HazardMap({ initialData }: { initialData?: MapDataResponse }) {
  const t = useTranslations("map");
  const tc = useTranslations("common");
  const ta = useTranslations("actions");
  const searchParams = useSearchParams();

  const { data, isError, refetch } = useMapData(initialData);


  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [riversOnlyWarning, setRiversOnlyWarning] = useState(false);
  const [stationQuery, setStationQuery] = useState("");
  const [customFocus, setCustomFocus] = useState<
    { lat: number; lng: number; zoom?: number; title?: string } | undefined
  >(undefined);

  // Deep-linking coordinates support
  const rawLat = searchParams?.get("lat");
  const rawLng = searchParams?.get("lng");
  const rawZoom = searchParams?.get("zoom");
  const title = searchParams?.get("title") ?? undefined;

  const focusTarget =
    rawLat && rawLng
      ? {
          lat: parseFloat(rawLat),
          lng: parseFloat(rawLng),
          zoom: rawZoom ? parseInt(rawZoom, 10) : 12,
          title,
        }
      : undefined;

interface StationMatch {
  id: string;
  name: string;
  sub: string;
  lat: number;
  lng: number;
}

  const effectiveFocus = customFocus ?? focusTarget;

  const matchingStations: StationMatch[] = useMemo(() => {
    const q = stationQuery.trim().toLowerCase();
    if (!q || !data) return [];
    const riverMatches: StationMatch[] = data.rivers
      .filter((r: RiverGauge) => r.station.toLowerCase().includes(q) || (r.basin && r.basin.toLowerCase().includes(q)))
      .map((r: RiverGauge) => ({
        id: `r-${r.id}`,
        name: r.station,
        sub: r.basin ? `${r.basin} basin` : "River gauge",
        lat: r.lat!,
        lng: r.lng!,
      }));
    const quakeMatches: StationMatch[] = data.quakes
      .filter((qk: Quake) => qk.place.toLowerCase().includes(q))
      .map((qk: Quake) => ({
        id: `q-${qk.id}`,
        name: qk.place,
        sub: `M ${qk.mag?.toFixed(1) ?? ""} Earthquake`,
        lat: qk.lat!,
        lng: qk.lng!,
      }));
    const highwayMatches: StationMatch[] = (data.highways ?? [])
      .filter((h: HighwayBlockage) => h.lat != null && h.lng != null && (
        h.title.toLowerCase().includes(q) ||
        h.roadRefno.toLowerCase().includes(q) ||
        h.location.toLowerCase().includes(q)
      ))
      .map((h: HighwayBlockage) => ({
        id: `h-${h.id}`,
        name: `${h.roadRefno}: ${h.location || h.title}`,
        sub: `${h.status} (${h.closureReason})`,
        lat: h.lat!,
        lng: h.lng!,
      }));
    return [...riverMatches, ...quakeMatches, ...highwayMatches].slice(0, 7);
  }, [stationQuery, data]);

  const toggles: { key: keyof LayerState; label: string; count?: number; icon?: React.ReactNode }[] = [
    {
      key: "rivers",
      label: t("layerRivers"),
      count: data?.rivers.length,
      icon: <HazardGlyph hazard="flood" width={14} height={14} />,
    },
    {
      key: "highways",
      label: t("layerHighways"),
      count: data?.highways.length,
      icon: <HazardGlyph hazard="landslide" width={14} height={14} />,
    },
    {
      key: "quakes",
      label: t("layerQuakes"),
      count: data?.quakes.length,
      icon: <HazardGlyph hazard="earthquake" width={14} height={14} />,
    },
    {
      key: "glacial",
      label: t("layerGlacial"),
      count: data?.glacialLakes.length,
      icon: <HazardGlyph hazard="glof" width={14} height={14} />,
    },
    {
      key: "basins",
      label: t("layerBasins"),
      count: data?.basins.length,
    },
    {
      key: "seismic",
      label: t("layerSeismic"),
      count: data?.seismic.length,
    },
  ];

  function toggle(key: keyof LayerState) {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (isError || !data) {
    return (
      <div className="card flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-muted">{tc("error")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2 cursor-pointer"
        >
          {ta("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Layer Controls Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-surface p-3 sm:p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1 hidden sm:inline">{t("layers")}:</span>
          {toggles.map(({ key, label, count, icon }) => {
            const active = layers[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95",
                  active
                    ? "border-brand bg-brand text-brand-fg shadow-xs"
                    : "border-border text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {icon ? <span>{icon}</span> : <span aria-hidden>{active ? "✓" : "○"}</span>}
                <span>{label}</span>
                {typeof count === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] tabular font-mono font-bold",
                      active ? "bg-white/20 text-white" : "bg-surface-2 text-faint",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Warning stations filter shortcut */}
        {layers.rivers ? (
          <button
            type="button"
            aria-pressed={riversOnlyWarning}
            onClick={() => setRiversOnlyWarning((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0",
              riversOnlyWarning
                ? "border-warning bg-warning text-white shadow-xs"
                : "border-border text-muted hover:bg-surface-2 hover:text-text",
            )}
          >
            <span aria-hidden>{riversOnlyWarning ? "⚠" : "○"}</span>
            <span>{t("riversOnlyWarning")}</span>
          </button>
        ) : null}

        {/* Station Search Input with fly-to */}
        <div className="relative w-full sm:w-64">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted" aria-hidden="true">
            <SearchIcon width={13} height={13} />
          </span>
          <input
            type="search"
            value={stationQuery}
            onChange={(e) => setStationQuery(e.target.value)}
            placeholder="Search river station or quake…"
            className="w-full rounded-chip border border-border bg-surface py-1.5 pl-8 pr-7 text-xs text-text placeholder:text-muted focus:border-brand focus:outline-none"
          />
          {stationQuery ? (
            <button
              type="button"
              onClick={() => setStationQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2 text-muted hover:text-text cursor-pointer"
            >
              <CloseIcon width={12} height={12} />
            </button>
          ) : null}

          {/* Autocomplete dropdown */}
          {matchingStations.length > 0 ? (
            <ul className="absolute left-0 right-0 top-full mt-1 z-30 overflow-hidden rounded-xl border border-border bg-surface shadow-xl divide-y divide-border/50">
              {matchingStations.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFocus({ lat: item.lat, lng: item.lng, zoom: 13, title: item.name });
                      setStationQuery("");
                    }}
                    className="flex w-full items-center justify-between p-2.5 text-left text-xs hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-text truncate">{item.name}</p>
                      <p className="text-[11px] text-muted truncate">{item.sub}</p>
                    </div>
                    <span className="text-[10px] text-brand font-semibold shrink-0">Fly to →</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-card border border-border shadow-card">
        <LeafletMap
          data={data}
          layers={layers}
          focusTarget={effectiveFocus}
          riversOnlyWarning={riversOnlyWarning}
        />
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-faint">
        <span>{t("tileNote")}</span>
        {!data.riverOk || !data.quakeOk ? (
          <span className="text-warning">
            {tc("showingLastKnown")} ·{" "}
            <a
              href="https://bipadportal.gov.np/realtime-monitoring"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
            >
              BIPAD <ExternalIcon width={11} height={11} />
            </a>
          </span>
        ) : null}
      </p>
    </div>
  );
}
