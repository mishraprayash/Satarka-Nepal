"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Severity } from "@/lib/types";

export interface AlertMiniMapInnerProps {
  lat: number;
  lng: number;
  severity: Severity;
  title: string;
  place?: string;
}

interface ThemeColors {
  info: string;
  advisory: string;
  watch: string;
  warning: string;
  danger: string;
}

/** Read severity colours from CSS variables so markers match the active theme. */
function readColors(): ThemeColors {
  if (typeof window === "undefined") {
    return {
      info: "#35506b",
      advisory: "#1a7a3e",
      watch: "#8a5900",
      warning: "#a3480f",
      danger: "#b01c2b",
    };
  }
  const cs = getComputedStyle(document.documentElement);
  const get = (n: string, fallback: string) => cs.getPropertyValue(n).trim() || fallback;
  return {
    info: get("--sev-info-fg", "#35506b"),
    advisory: get("--sev-advisory-fg", "#1a7a3e"),
    watch: get("--sev-watch-fg", "#8a5900"),
    warning: get("--sev-warning-fg", "#a3480f"),
    danger: get("--sev-danger-fg", "#b01c2b"),
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

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export function AlertMiniMapInner({ lat, lng, severity, title, place }: AlertMiniMapInnerProps) {
  const colors = useThemeColors();
  const color = colors[severity] || colors.info;

  return (
    <div className="relative h-48 sm:h-56 w-full overflow-hidden rounded-card border border-border shadow-inner">
      <MapContainer
        center={[lat, lng]}
        zoom={11}
        scrollWheelZoom={false}
        attributionControl={false}
        className="h-full w-full z-0"
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Outer pulse CircleMarker */}
        <CircleMarker
          center={[lat, lng]}
          radius={20}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.18,
            weight: 1.5,
          }}
        />

        {/* Core marker */}
        <CircleMarker
          center={[lat, lng]}
          radius={7}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.9,
            weight: 2,
          }}
        >
          <Popup>
            <div className="min-w-[150px] text-xs">
              <p className="font-semibold text-text">{title}</p>
              {place ? <p className="text-muted mt-0.5">{place}</p> : null}
              <p className="tabular text-faint mt-1">
                {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
              </p>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}

export default AlertMiniMapInner;
