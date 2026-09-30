"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import type { MapDataResponse, Quake, RiverGauge } from "@/lib/map-data";
import type { BasinRisk } from "@/lib/map-data";
import type { HighwayBlockage } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { formatDateTime, formatNumber, timeAgo, localizeText } from "@/lib/format";
import { ExternalIcon } from "@/components/icons";
import type { LayerState } from "./hazard-map";

const NEPAL_BOUNDS: L.LatLngBoundsExpression = [
  [26.1, 79.8],
  [30.6, 88.4],
];

interface ThemeColors {
  info: string;
  advisory: string;
  watch: string;
  warning: string;
  danger: string;
}

/** Read severity colours from CSS variables so markers match the active theme. */
function readColors(): ThemeColors {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      info: "#35506b",
      advisory: "#1a7a3e",
      watch: "#8a5900",
      warning: "#a3480f",
      danger: "#b01c2b",
    };
  }
  const cs = getComputedStyle(document.documentElement);
  const get = (n: string) => cs.getPropertyValue(n).trim();
  return {
    info: get("--sev-info-fg") || "#35506b",
    advisory: get("--sev-advisory-fg") || "#1a7a3e",
    watch: get("--sev-watch-fg") || "#8a5900",
    warning: get("--sev-warning-fg") || "#a3480f",
    danger: get("--sev-danger-fg") || "#b01c2b",
  };
}

function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(() => readColors());
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const update = () => setColors(readColors());
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class", "data-theme"] });
    return () => mo.disconnect();
  }, []);
  return colors;
}


function riskColor(colors: ThemeColors, risk: BasinRisk): string {
  switch (risk) {
    case "high":
      return colors.danger;
    case "moderate":
      return colors.watch;
    default:
      return colors.advisory;
  }
}

function quakeColor(colors: ThemeColors, mag?: number): string {
  if (mag === undefined) return colors.info;
  if (mag >= 6) return colors.danger;
  if (mag >= 5) return colors.warning;
  if (mag >= 4) return colors.watch;
  return colors.info;
}

function gaugeColor(colors: ThemeColors, g: RiverGauge): string {
  if (g.atDanger) return colors.danger;
  if (g.atWarning) return colors.warning;
  return colors.info;
}

function GaugeMarker({ gauge, colors, locale }: { gauge: RiverGauge; colors: ThemeColors; locale: Locale }) {
  const tc = useTranslations("common");
  const tsev = useTranslations("severity");
  const color = gaugeColor(colors, gauge);
  return (
    <CircleMarker
      center={[gauge.lat ?? 0, gauge.lng ?? 0]}
      radius={gauge.atDanger || gauge.atWarning ? 6 : 4}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: gauge.atDanger || gauge.atWarning ? 0.85 : 0.45,
        weight: 1.5,
      }}
    >
      <Popup>
        <div className="min-w-[180px] text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {gauge.station}
            {gauge.basin ? ` · ${gauge.basin}` : ""}
          </p>
          {gauge.waterLevel !== undefined ? (
            <p className="tabular mt-1 text-base font-semibold">
              {formatNumber(gauge.waterLevel, locale)} m
            </p>
          ) : null}
          <dl className="mt-1 space-y-0.5 text-xs text-muted">
            {gauge.warningLevel !== undefined ? (
              <div className="flex justify-between gap-4">
                <dt>{tsev("warning.label")}</dt>
                <dd className="tabular">{formatNumber(gauge.warningLevel, locale)} m</dd>
              </div>
            ) : null}
            {gauge.dangerLevel !== undefined ? (
              <div className="flex justify-between gap-4">
                <dt>{tsev("danger.label")}</dt>
                <dd className="tabular">{formatNumber(gauge.dangerLevel, locale)} m</dd>
              </div>
            ) : null}
          </dl>
          {gauge.status ? <p className="mt-1 text-xs">{gauge.status}</p> : null}
          {gauge.trend ? <p className="text-xs text-muted">Trend: {gauge.trend.toLowerCase()}</p> : null}
          {gauge.issuedAt ? (
            <p className="mt-1 text-xs text-faint">{tc("checkedAgo", { time: timeAgo(gauge.issuedAt, locale) })}</p>
          ) : null}
        </div>
      </Popup>
    </CircleMarker>
  );
}

function QuakeMarker({ quake, colors, locale }: { quake: Quake; colors: ThemeColors; locale: Locale }) {
  const tc = useTranslations("common");
  const color = quakeColor(colors, quake.mag);
  const radius = quake.mag ? Math.min(15, Math.max(5, quake.mag * 2)) : 5;
  return (
    <CircleMarker
      center={[quake.lat ?? 0, quake.lng ?? 0]}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.5,
        weight: 1.5,
      }}
    >
      <Popup>
        <div className="min-w-[190px] text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{quake.place}</p>
          <p className="tabular mt-1 text-base font-semibold">
            {quake.mag !== undefined ? `M ${quake.mag.toFixed(1)}` : "Earthquake"}
            {quake.depthKm !== undefined ? (
              <span className="ml-2 text-xs font-normal text-muted">{Math.round(quake.depthKm)} km deep</span>
            ) : null}
          </p>
          {quake.issuedAt ? (
            <p className="mt-1 text-xs text-faint">
              {tc("checkedAgo", { time: timeAgo(quake.issuedAt, locale) })} · {formatDateTime(quake.issuedAt, locale)}
            </p>
          ) : null}
          {quake.url ? (
            <a
              href={quake.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-strong"
            >
              USGS <ExternalIcon width={11} height={11} />
            </a>
          ) : null}
        </div>
      </Popup>
    </CircleMarker>
  );
}

function HighwayMarker({ highway, colors, locale }: { highway: HighwayBlockage; colors: ThemeColors; locale: Locale }) {
  const isBlocked = highway.status === "BLOCKED";
  const isPartial = highway.status === "PARTIAL_OPEN";
  const color = isBlocked ? colors.danger : isPartial ? colors.warning : colors.info;

  return (
    <CircleMarker
      center={[highway.lat ?? 0, highway.lng ?? 0]}
      radius={isBlocked ? 7 : 5}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.9,
        weight: 2,
      }}
    >
      <Popup>
        <div className="min-w-[200px] text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold">
              {highway.roadRefno}
            </span>
            <span className="text-xs font-bold" style={{ color }}>
              {highway.status === "BLOCKED" ? "BLOCKED" : highway.status === "PARTIAL_OPEN" ? "PARTIAL OPEN" : "OPEN"}
            </span>
          </div>
          <p className="mt-1 font-semibold text-text">{highway.title}</p>
          <p className="text-xs text-muted">{highway.location}</p>
          <p className="mt-1 text-xs font-medium" style={{ color: colors.warning }}>
            Cause: {highway.closureReason}
          </p>
          {highway.repairEta ? <p className="text-xs text-muted">ETA: {highway.repairEta}</p> : null}
          {highway.effortsBeingMade ? <p className="mt-1 text-xs text-faint">{highway.effortsBeingMade}</p> : null}
          {highway.contactPerson ? <p className="mt-0.5 text-[11px] text-muted">{highway.contactPerson}</p> : null}
        </div>
      </Popup>
    </CircleMarker>
  );
}


function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);
  return null;
}

function MapViewController({
  focusTarget,
}: {
  focusTarget?: { lat: number; lng: number; zoom?: number; title?: string };
}) {
  const map = useMap();
  useEffect(() => {
    if (
      focusTarget &&
      Number.isFinite(focusTarget.lat) &&
      Number.isFinite(focusTarget.lng) &&
      focusTarget.lat >= -90 &&
      focusTarget.lat <= 90 &&
      focusTarget.lng >= -180 &&
      focusTarget.lng <= 180
    ) {
      const zoom = Number.isFinite(focusTarget.zoom) ? focusTarget.zoom! : 12;
      map.flyTo([focusTarget.lat, focusTarget.lng], zoom, {
        duration: 1.5,
      });
    }
  }, [focusTarget, map]);
  return null;
}

export interface LeafletMapProps {
  data: MapDataResponse;
  layers: LayerState;
  focusTarget?: {
    lat: number;
    lng: number;
    zoom?: number;
    title?: string;
  };
  riversOnlyWarning?: boolean;
  highwaysBlockedOnly?: boolean;
}

export function LeafletMap({
  data,
  layers,
  focusTarget,
  riversOnlyWarning = false,
  highwaysBlockedOnly = false,
}: LeafletMapProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("map");
  const tsev = useTranslations("severity");
  const colors = useThemeColors();

  const gaugePoints = useMemo(() => {
    const pts = (data.rivers ?? []).filter(
      (g) =>
        g.lat != null &&
        g.lng != null &&
        Number.isFinite(g.lat) &&
        Number.isFinite(g.lng) &&
        g.lat >= -90 &&
        g.lat <= 90 &&
        g.lng >= -180 &&
        g.lng <= 180,
    );
    if (riversOnlyWarning) {
      return pts.filter((g) => g.atDanger || g.atWarning);
    }
    return pts;
  }, [data.rivers, riversOnlyWarning]);

  const quakePoints = useMemo(
    () =>
      (data.quakes ?? []).filter(
        (q) =>
          q.lat != null &&
          q.lng != null &&
          Number.isFinite(q.lat) &&
          Number.isFinite(q.lng) &&
          q.lat >= -90 &&
          q.lat <= 90 &&
          q.lng >= -180 &&
          q.lng <= 180,
      ),
    [data.quakes],
  );

  const highwayPoints = useMemo(() => {
    const pts = (data.highways ?? []).filter(
      (h) =>
        h.lat != null &&
        h.lng != null &&
        Number.isFinite(h.lat) &&
        Number.isFinite(h.lng) &&
        h.lat >= -90 &&
        h.lat <= 90 &&
        h.lng >= -180 &&
        h.lng <= 180,
    );
    if (highwaysBlockedOnly) {
      return pts.filter((h) => h.status === "BLOCKED" || h.status === "PARTIAL_OPEN");
    }
    return pts;
  }, [data.highways, highwaysBlockedOnly]);

  const glacialLakePoints = useMemo(
    () =>
      (data.glacialLakes ?? []).filter(
        (l) =>
          l.lat != null &&
          l.lng != null &&
          Number.isFinite(l.lat) &&
          Number.isFinite(l.lng) &&
          l.lat >= -90 &&
          l.lat <= 90 &&
          l.lng >= -180 &&
          l.lng <= 180,
      ),
    [data.glacialLakes],
  );

  const validBasins = useMemo(
    () =>
      (data.basins ?? [])
        .map((b) => ({
          ...b,
          validPositions: (b.points ?? [])
            .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng))
            .map(([lng, lat]) => [lat, lng] as [number, number]),
        }))
        .filter((b) => b.validPositions.length >= 3),
    [data.basins],
  );

  const validSeismic = useMemo(
    () =>
      (data.seismic ?? [])
        .map((f) => ({
          ...f,
          validPositions: (f.points ?? [])
            .filter(([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng))
            .map(([lng, lat]) => [lat, lng] as [number, number]),
        }))
        .filter((f) => f.validPositions.length >= 2),
    [data.seismic],
  );

  const validFocusTarget = useMemo(() => {
    if (
      !focusTarget ||
      focusTarget.lat == null ||
      focusTarget.lng == null ||
      !Number.isFinite(focusTarget.lat) ||
      !Number.isFinite(focusTarget.lng) ||
      focusTarget.lat < -90 ||
      focusTarget.lat > 90 ||
      focusTarget.lng < -180 ||
      focusTarget.lng > 180
    ) {
      return undefined;
    }
    return focusTarget;
  }, [focusTarget]);

  const atDanger = (data.rivers ?? []).filter((g) => g.atDanger).length;
  const atWarning = (data.rivers ?? []).filter((g) => g.atWarning).length;

  return (
    <div className="relative h-[70vh] min-h-[460px]">
      <MapContainer
        bounds={NEPAL_BOUNDS}
        boundsOptions={{ padding: [16, 16] }}
        scrollWheelZoom
        className="h-full w-full"
      >
        <MapResizer />
        <MapViewController focusTarget={validFocusTarget} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {layers.basins
          ? validBasins.map((b) => (
              <Polygon
                key={b.id}
                positions={b.validPositions}
                pathOptions={{
                  color: riskColor(colors, b.risk),
                  weight: 1,
                  fillColor: riskColor(colors, b.risk),
                  fillOpacity: 0.1,
                }}
              >
                <Popup>
                  <div className="min-w-[170px] text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {locale === "ne" ? b.nameNe : b.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {t(b.risk === "high" ? "riskHigh" : b.risk === "moderate" ? "riskModerate" : "riskLow")}
                    </p>
                    <p className="mt-1 text-xs text-faint">{t("referenceNote")}</p>
                  </div>
                </Popup>
              </Polygon>
            ))
          : null}

        {layers.seismic
          ? validSeismic.map((f) =>
              f.kind === "thrust" ? (
                <Polyline
                  key={f.id}
                  positions={f.validPositions}
                  pathOptions={{ color: colors.warning, weight: 2.5, dashArray: "6 6" }}
                >
                  <Popup>
                    <div className="min-w-[200px] text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {locale === "ne" ? f.nameNe ?? f.name : f.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">{localizeText(f.note, locale)}</p>
                    </div>
                  </Popup>
                </Polyline>
              ) : (
                <Polygon
                  key={f.id}
                  positions={f.validPositions}
                  pathOptions={{ color: colors.warning, weight: 1, fillColor: colors.warning, fillOpacity: 0.08 }}
                >
                  <Popup>
                    <div className="min-w-[200px] text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {locale === "ne" ? f.nameNe ?? f.name : f.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">{localizeText(f.note, locale)}</p>
                    </div>
                  </Popup>
                </Polygon>
              ),
            )
          : null}

        {layers.glacial
          ? glacialLakePoints.map((l) => (
              <CircleMarker
                key={l.id}
                center={[l.lat, l.lng]}
                radius={6}
                pathOptions={{
                  color: riskColor(colors, l.risk),
                  fillColor: riskColor(colors, l.risk),
                  fillOpacity: 0.6,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div className="min-w-[190px] text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {l.name} · {l.district}
                    </p>
                    <p className="mt-1 font-medium">
                      {t(l.risk === "high" ? "riskHigh" : "riskModerate")}
                    </p>
                    {l.note ? <p className="mt-1 text-xs text-muted">{localizeText(l.note, locale)}</p> : null}
                    <p className="mt-1 text-xs text-faint">{t("referenceNote")}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))
          : null}

        {layers.rivers ? gaugePoints.map((g) => <GaugeMarker key={g.id} gauge={g} colors={colors} locale={locale} />) : null}
        {layers.quakes ? quakePoints.map((q) => <QuakeMarker key={q.id} quake={q} colors={colors} locale={locale} />) : null}
        {layers.highways ? highwayPoints.map((h) => <HighwayMarker key={h.id} highway={h} colors={colors} locale={locale} />) : null}

        {validFocusTarget ? (
          <CircleMarker
            center={[validFocusTarget.lat, validFocusTarget.lng]}
            radius={11}
            pathOptions={{
              color: colors.danger,
              fillColor: colors.danger,
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Popup autoClose={false}>
              <div className="min-w-[180px] text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-danger">
                  {t("targetAlert") ?? "Focused Incident"}
                </p>
                <p className="mt-1 font-bold text-text">
                  {validFocusTarget.title || `${validFocusTarget.lat.toFixed(4)}°N, ${validFocusTarget.lng.toFixed(4)}°E`}
                </p>
                <p className="mt-1 text-xs tabular text-faint">
                  {validFocusTarget.lat.toFixed(4)}°N, {validFocusTarget.lng.toFixed(4)}°E
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>

      {/* Legend — severity is never colour-only; labels carry the meaning. */}
      <div className="absolute bottom-3 left-3 z-[1000] space-y-1 rounded-card border border-border bg-surface/90 px-3 py-2 text-xs shadow-card backdrop-blur">
        <p className="eyebrow">{t("layers")}</p>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: colors.danger }} aria-hidden />
          <span className="text-warning font-medium">{tsev("danger.label")}</span>
          <span className="text-faint">({atDanger})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: colors.warning }} aria-hidden />
          <span className="text-warning font-medium">{tsev("warning.label")}</span>
          <span className="text-faint">({atWarning})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: colors.info }} aria-hidden />
          <span className="text-muted">{tsev("info.label")}</span>
        </div>
      </div>
    </div>
  );
}
