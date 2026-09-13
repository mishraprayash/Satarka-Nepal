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
  const cs = getComputedStyle(document.documentElement);
  const get = (n: string) => cs.getPropertyValue(n).trim() || "#667";
  return {
    info: get("--sev-info-fg"),
    advisory: get("--sev-advisory-fg"),
    watch: get("--sev-watch-fg"),
    warning: get("--sev-warning-fg"),
    danger: get("--sev-danger-fg"),
  };
}

function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(() => readColors());
  useEffect(() => {
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


function MapViewController({
  focusTarget,
}: {
  focusTarget?: { lat: number; lng: number; zoom?: number; title?: string };
}) {
  const map = useMap();
  useEffect(() => {
    if (focusTarget) {
      map.flyTo([focusTarget.lat, focusTarget.lng], focusTarget.zoom ?? 12, {
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
}

export function LeafletMap({ data, layers, focusTarget, riversOnlyWarning = false }: LeafletMapProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("map");
  const tsev = useTranslations("severity");
  const colors = useThemeColors();

  const gaugePoints = useMemo(() => {
    const pts = data.rivers.filter(
      (g) => g.lat !== undefined && g.lng !== undefined && !Number.isNaN(g.lat!) && !Number.isNaN(g.lng!),
    );
    if (riversOnlyWarning) {
      return pts.filter((g) => g.atDanger || g.atWarning);
    }
    return pts;
  }, [data.rivers, riversOnlyWarning]);

  const quakePoints = useMemo(
    () => data.quakes.filter((q) => q.lat !== undefined && q.lng !== undefined && !Number.isNaN(q.lat!) && !Number.isNaN(q.lng!)),
    [data.quakes],
  );

  const highwayPoints = useMemo(
    () => (data.highways ?? []).filter((h) => h.lat !== undefined && h.lng !== undefined && !Number.isNaN(h.lat!) && !Number.isNaN(h.lng!)),
    [data.highways],
  );

  const atDanger = data.rivers.filter((g) => g.atDanger).length;
  const atWarning = data.rivers.filter((g) => g.atWarning).length;

  return (
    <div className="relative h-[70vh] min-h-[460px]">
      <MapContainer
        bounds={NEPAL_BOUNDS}
        boundsOptions={{ padding: [16, 16] }}
        scrollWheelZoom
        className="h-full w-full"
      >
        <MapViewController focusTarget={focusTarget} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {layers.basins
          ? data.basins.map((b) => (
              <Polygon
                key={b.id}
                positions={b.points.map(([lng, lat]) => [lat, lng] as [number, number])}
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
          ? data.seismic.map((f) =>
              f.kind === "thrust" ? (
                <Polyline
                  key={f.id}
                  positions={f.points.map(([lng, lat]) => [lat, lng] as [number, number])}
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
                  positions={f.points.map(([lng, lat]) => [lat, lng] as [number, number])}
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
          ? data.glacialLakes.map((l) => (
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

        {focusTarget ? (
          <CircleMarker
            center={[focusTarget.lat, focusTarget.lng]}
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
                  {focusTarget.title || `${focusTarget.lat.toFixed(4)}°N, ${focusTarget.lng.toFixed(4)}°E`}
                </p>
                <p className="mt-1 text-xs tabular text-faint">
                  {focusTarget.lat.toFixed(4)}°N, {focusTarget.lng.toFixed(4)}°E
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
