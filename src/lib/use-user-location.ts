"use client";

import { useCallback, useState } from "react";
import type { LatLng } from "@/lib/distance";

import { CONFIG } from "@/lib/config";

export type LocationError = "denied" | "unavailable" | "timeout";
export type LocationStatus = "idle" | "locating" | "ok" | "denied" | "timeout" | "unavailable";

export function useUserLocation(initialCoords: LatLng | null = null) {
  const [coords, setCoordsState] = useState<LatLng | null>(initialCoords);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<LocationError | null>(null);
  const [status, setStatus] = useState<LocationStatus>(initialCoords ? "ok" : "idle");

  const setCoords = useCallback((pos: LatLng | null) => {
    setCoordsState(pos);
    if (pos) {
      setStatus("ok");
      setError(null);
    } else {
      setStatus("idle");
    }
  }, []);

  const requestLocation = useCallback((onSuccess?: (pos: LatLng) => void) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("unavailable");
      setStatus("unavailable");
      return;
    }

    setLocating(true);
    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos: LatLng = { lat: p.coords.latitude, lng: p.coords.longitude };
        setCoordsState(pos);
        setLocating(false);
        setStatus("ok");
        onSuccess?.(pos);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("denied");
          setStatus("denied");
        } else if (err.code === err.TIMEOUT) {
          setError("timeout");
          setStatus("timeout");
        } else {
          setError("unavailable");
          setStatus("unavailable");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: CONFIG.timeouts.geolocationMs,
        maximumAge: 5 * 60_000,
      },
    );
  }, []);

  const clearLocation = useCallback(() => {
    setCoordsState(null);
    setError(null);
    setStatus("idle");
  }, []);

  return {
    coords,
    setCoords,
    locating,
    error,
    status,
    requestLocation,
    clearLocation,
  };
}
