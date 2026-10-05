"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
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

function parseCoordinate(val: string | null | undefined, min: number, max: number): number | undefined {
  if (!val) return undefined;
  const n = parseFloat(val);
  if (!Number.isFinite(n) || n < min || n > max) return undefined;
  return n;
}

function parseZoom(val: string | null | undefined): number | undefined {
  if (!val) return undefined;
  const n = parseInt(val, 10);
  if (!Number.isFinite(n) || n < 1 || n > 22) return undefined;
  return n;
}

function layersFromHazard(h: string | null | undefined): LayerState {
  if (!h) return DEFAULT_LAYERS;
  const lower = h.toLowerCase().trim();
  if (lower === "flood" || lower === "rivers") {
    return { basins: true, seismic: false, glacial: false, rivers: true, quakes: false, highways: false };
  }
  if (lower === "earthquake" || lower === "quakes") {
    return { basins: false, seismic: true, glacial: false, rivers: false, quakes: true, highways: false };
  }
  if (lower === "landslide" || lower === "highways") {
    return { basins: false, seismic: false, glacial: false, rivers: false, quakes: false, highways: true };
  }
  if (lower === "glof" || lower === "glacial") {
    return { basins: false, seismic: false, glacial: true, rivers: false, quakes: false, highways: false };
  }
  return DEFAULT_LAYERS;
}

function hazardFromLayers(l: LayerState): string | undefined {
  if (l.rivers && !l.quakes && !l.highways && !l.glacial && !l.seismic) return "flood";
  if (l.quakes && !l.rivers && !l.highways && !l.glacial && !l.basins) return "earthquake";
  if (l.highways && !l.rivers && !l.quakes && !l.glacial && !l.basins && !l.seismic) return "landslide";
  if (l.glacial && !l.rivers && !l.quakes && !l.highways && !l.basins && !l.seismic) return "glof";
  return undefined;
}

interface StationMatch {
  id: string;
  name: string;
  sub: string;
  lat: number;
  lng: number;
}

export function HazardMap({ initialData }: { initialData?: MapDataResponse }) {
  const t = useTranslations("map");
  const tc = useTranslations("common");
  const ta = useTranslations("actions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { data, isError, refetch } = useMapData(initialData);

  // Deep-linking URL query params parsing
  const rawLat = searchParams?.get("lat");
  const rawLng = searchParams?.get("lng");
  const rawZoom = searchParams?.get("zoom");
  const rawTitle = searchParams?.get("title") ?? undefined;
  const rawHazard = searchParams?.get("hazard");
  const rawStation = searchParams?.get("station");
  const rawWarning = searchParams?.get("warning") === "1" || searchParams?.get("warning") === "true";
  const rawBlocked = searchParams?.get("blocked") === "1" || searchParams?.get("blocked") === "true";

  const [layers, setLayers] = useState<LayerState>(() => layersFromHazard(rawHazard));
  const [riversOnlyWarning, setRiversOnlyWarning] = useState<boolean>(() => rawWarning);
  const [highwaysBlockedOnly, setHighwaysBlockedOnly] = useState<boolean>(() => rawBlocked);
  const [stationQuery, setStationQuery] = useState(() => rawStation ?? "");
  const [customFocus, setCustomFocus] = useState<
    { lat: number; lng: number; zoom?: number; title?: string } | undefined
  >(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const parsedLat = parseCoordinate(rawLat, -90, 90);
  const parsedLng = parseCoordinate(rawLng, -180, 180);
  const parsedZoom = parseZoom(rawZoom);

  const focusTarget = useMemo(() => {
    if (parsedLat !== undefined && parsedLng !== undefined) {
      return {
        lat: parsedLat,
        lng: parsedLng,
        zoom: parsedZoom ?? 12,
        title: rawTitle,
      };
    }
    return undefined;
  }, [parsedLat, parsedLng, parsedZoom, rawTitle]);

  // Deep-linking: if station query param is present on load, find and focus it
  useEffect(() => {
    if (!data || !rawStation || customFocus) return;
    const sLower = rawStation.toLowerCase().trim();

    // Check rivers
    const r = data.rivers.find(
      (x: RiverGauge) =>
        x.lat != null &&
        x.lng != null &&
        Number.isFinite(x.lat) &&
        Number.isFinite(x.lng) &&
        (x.id.toLowerCase() === sLower ||
          x.id.toLowerCase() === `gauge-${sLower}` ||
          x.station.toLowerCase() === sLower ||
          x.station.toLowerCase().includes(sLower)),
    );
    if (r && r.lat != null && r.lng != null) {
      setCustomFocus({ lat: r.lat, lng: r.lng, zoom: 13, title: r.station });
      return;
    }

    // Check quakes
    const q = data.quakes.find(
      (x: Quake) =>
        x.lat != null &&
        x.lng != null &&
        Number.isFinite(x.lat) &&
        Number.isFinite(x.lng) &&
        (x.id.toLowerCase() === sLower ||
          x.id.toLowerCase() === `quake-${sLower}` ||
          x.place.toLowerCase().includes(sLower)),
    );
    if (q && q.lat != null && q.lng != null) {
      setCustomFocus({ lat: q.lat, lng: q.lng, zoom: 12, title: q.place });
      return;
    }

    // Check highways
    const h = (data.highways ?? []).find(
      (x: HighwayBlockage) =>
        x.lat != null &&
        x.lng != null &&
        Number.isFinite(x.lat) &&
        Number.isFinite(x.lng) &&
        (x.id.toLowerCase() === sLower ||
          x.roadRefno.toLowerCase().includes(sLower) ||
          x.title.toLowerCase().includes(sLower) ||
          x.location.toLowerCase().includes(sLower)),
    );
    if (h && h.lat != null && h.lng != null) {
      setCustomFocus({ lat: h.lat, lng: h.lng, zoom: 13, title: `${h.roadRefno}: ${h.location || h.title}` });
    }
  }, [data, rawStation, customFocus]);

  const effectiveFocus = customFocus ?? focusTarget;

  // Sync state changes to URL query parameters
  useEffect(() => {
    if (!mounted) return;
    const currentQs = searchParams?.toString() ?? "";
    const params = new URLSearchParams();

    const activeHazard = hazardFromLayers(layers);
    if (activeHazard) {
      params.set("hazard", activeHazard);
    }

    if (riversOnlyWarning) {
      params.set("warning", "1");
    }

    if (highwaysBlockedOnly) {
      params.set("blocked", "1");
    }

    const activeFocus = customFocus ?? focusTarget;
    if (activeFocus && Number.isFinite(activeFocus.lat) && Number.isFinite(activeFocus.lng)) {
      params.set("lat", activeFocus.lat.toFixed(4));
      params.set("lng", activeFocus.lng.toFixed(4));
      if (activeFocus.zoom) {
        params.set("zoom", String(activeFocus.zoom));
      }
      if (activeFocus.title) {
        params.set("title", activeFocus.title);
      }
    }

    if (stationQuery.trim()) {
      params.set("station", stationQuery.trim());
    }

    const qs = params.toString();
    if (qs !== currentQs) {
      const target = qs ? `${pathname}?${qs}` : pathname;
      router.replace(target, { scroll: false });
    }
  }, [
    mounted,
    layers,
    riversOnlyWarning,
    highwaysBlockedOnly,
    customFocus,
    focusTarget,
    stationQuery,
    pathname,
    router,
    searchParams,
  ]);

  const matchingStations: StationMatch[] = useMemo(() => {
    const q = stationQuery.trim().toLowerCase();
    if (!q || !data) return [];

    const riverMatches: StationMatch[] = (data.rivers ?? [])
      .filter(
        (r: RiverGauge) =>
          r.lat != null &&
          r.lng != null &&
          Number.isFinite(r.lat) &&
          Number.isFinite(r.lng) &&
          (r.station.toLowerCase().includes(q) || (r.basin && r.basin.toLowerCase().includes(q))),
      )
      .map((r: RiverGauge) => ({
        id: `r-${r.id}`,
        name: r.station,
        sub: r.basin ? `${r.basin} basin` : "River gauge",
        lat: r.lat!,
        lng: r.lng!,
      }));

    const quakeMatches: StationMatch[] = (data.quakes ?? [])
      .filter(
        (qk: Quake) =>
          qk.lat != null &&
          qk.lng != null &&
          Number.isFinite(qk.lat) &&
          Number.isFinite(qk.lng) &&
          qk.place.toLowerCase().includes(q),
      )
      .map((qk: Quake) => ({
        id: `q-${qk.id}`,
        name: qk.place,
        sub: `M ${qk.mag != null ? qk.mag.toFixed(1) : ""} Earthquake`,
        lat: qk.lat!,
        lng: qk.lng!,
      }));

    const highwayMatches: StationMatch[] = (data.highways ?? [])
      .filter(
        (h: HighwayBlockage) =>
          h.lat != null &&
          h.lng != null &&
          Number.isFinite(h.lat) &&
          Number.isFinite(h.lng) &&
          (h.title.toLowerCase().includes(q) ||
            h.roadRefno.toLowerCase().includes(q) ||
            h.location.toLowerCase().includes(q)),
      )
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
      count: data?.rivers?.length,
      icon: <HazardGlyph hazard="flood" width={14} height={14} />,
    },
    {
      key: "highways",
      label: t("layerHighways"),
      count: data?.highways?.length,
      icon: <HazardGlyph hazard="landslide" width={14} height={14} />,
    },
    {
      key: "quakes",
      label: t("layerQuakes"),
      count: data?.quakes?.length,
      icon: <HazardGlyph hazard="earthquake" width={14} height={14} />,
    },
    {
      key: "glacial",
      label: t("layerGlacial"),
      count: data?.glacialLakes?.length,
      icon: <HazardGlyph hazard="glof" width={14} height={14} />,
    },
    {
      key: "basins",
      label: t("layerBasins"),
      count: data?.basins?.length,
    },
    {
      key: "seismic",
      label: t("layerSeismic"),
      count: data?.seismic?.length,
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
          className="btn btn-secondary"
        >
          {ta("retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search first: the most common task is "find my river / road" */}
      <div className="relative w-full max-w-2xl">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted" aria-hidden="true">
          <SearchIcon width={20} height={20} />
        </span>
        <input
          type="search"
          value={stationQuery}
          onChange={(e) => setStationQuery(e.target.value)}
          aria-label={t("searchLabel")}
          placeholder={t("searchLabel")}
          className="h-14 w-full rounded-chip border-2 border-border-strong bg-surface pl-12 pr-12 text-lg text-text placeholder:text-muted focus:border-brand focus:outline-none"
        />
        {stationQuery ? (
          <button
            type="button"
            onClick={() => {
              setStationQuery("");
              setCustomFocus(undefined);
            }}
            aria-label={tc("clear")}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-text cursor-pointer"
          >
            <CloseIcon width={20} height={20} />
          </button>
        ) : null}

        {matchingStations.length > 0 ? (
          <ul className="absolute left-0 right-0 top-full z-[1100] mt-2 overflow-hidden rounded-card border border-border bg-surface shadow-xl divide-y divide-border">
            {matchingStations.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCustomFocus({ lat: item.lat, lng: item.lng, zoom: 13, title: item.name });
                    setStationQuery(item.name);
                  }}
                  className="flex min-h-14 w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-surface-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-text">{item.name}</p>
                    <p className="truncate text-sm text-muted">{item.sub}</p>
                  </div>
                  <span className="shrink-0 text-base font-semibold text-brand">{t("flyTo")} →</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Layers live behind one friendly disclosure */}
      <details className="group rounded-card border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
          {t("layersPrompt")}
          <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            {toggles.map(({ key, label, count, icon }) => {
              const active = layers[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(key)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-chip border-2 px-3.5 py-2 text-base font-medium transition-all cursor-pointer active:scale-95",
                    active
                      ? "border-brand bg-brand text-brand-fg font-semibold"
                      : "border-border text-text hover:bg-surface-2",
                  )}
                >
                  {icon ? <span>{icon}</span> : <span aria-hidden>{active ? "✓" : "○"}</span>}
                  <span>{label}</span>
                  {typeof count === "number" ? <span className="tabular opacity-80">({count})</span> : null}
                </button>
              );
            })}
          </div>

          {layers.rivers || layers.highways ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {layers.rivers ? (
                <button
                  type="button"
                  aria-pressed={riversOnlyWarning}
                  onClick={() => setRiversOnlyWarning((v) => !v)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-chip border-2 px-3.5 py-2 text-base font-semibold transition-all cursor-pointer active:scale-95",
                    riversOnlyWarning ? "border-warning bg-warning text-white" : "border-border text-text hover:bg-surface-2",
                  )}
                >
                  <span aria-hidden>{riversOnlyWarning ? "⚠" : "○"}</span>
                  <span>{t("riversOnlyWarning")}</span>
                </button>
              ) : null}
              {layers.highways ? (
                <button
                  type="button"
                  aria-pressed={highwaysBlockedOnly}
                  onClick={() => setHighwaysBlockedOnly((v) => !v)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-chip border-2 px-3.5 py-2 text-base font-semibold transition-all cursor-pointer active:scale-95",
                    highwaysBlockedOnly ? "border-danger bg-danger text-white" : "border-border text-text hover:bg-surface-2",
                  )}
                >
                  <span aria-hidden>{highwaysBlockedOnly ? "⛔" : "○"}</span>
                  <span>{t("highwaysBlockedOnly")}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>

      <div className="relative overflow-hidden rounded-card border border-border shadow-card">
        <LeafletMap
          data={data}
          layers={layers}
          focusTarget={effectiveFocus}
          riversOnlyWarning={riversOnlyWarning}
          highwaysBlockedOnly={highwaysBlockedOnly}
        />
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
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
