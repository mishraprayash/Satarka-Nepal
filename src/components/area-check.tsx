"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Alert, AlertsResponse, Severity } from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { haversineKm } from "@/lib/distance";
import { NEPAL_DISTRICTS, type DistrictCentroid } from "@/lib/districts";
import { useAlerts } from "@/lib/use-alerts";
import { useUserLocation } from "@/lib/use-user-location";
import { AlertCard } from "@/components/alert-card";
import { SeverityGlyph, MapPinIcon, ArrowIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

const DISTRICT_KEY = "satarka-nearby-district";
const GPS_KEY = "satarka-nearby";
const RADIUS_KM = 25;
const MAX_SHOWN = 3;

type Tone = "danger" | "warning" | "watch" | "clear";

const TONE_STYLE: Record<Tone, { box: string; icon: string; glyph: Severity }> = {
  danger: { box: "border-danger bg-danger-soft", icon: "text-danger", glyph: "danger" },
  warning: { box: "border-warning bg-warning-soft", icon: "text-warning", glyph: "warning" },
  watch: { box: "border-watch bg-watch-soft", icon: "text-watch", glyph: "watch" },
  clear: { box: "border-advisory bg-advisory-soft", icon: "text-advisory", glyph: "advisory" },
};

function toneFor(items: Alert[]): Tone {
  let top = 0;
  for (const a of items) top = Math.max(top, SEVERITY_RANK[a.severity]);
  if (top >= SEVERITY_RANK.danger) return "danger";
  if (top >= SEVERITY_RANK.warning) return "warning";
  if (top >= SEVERITY_RANK.watch) return "watch";
  return items.length ? "watch" : "clear";
}

/**
 * The first thing a visitor sees: "Is it safe where I live?"
 * Pick a district (or share location) → one big, plain-language answer.
 */
export function AreaCheck({ initialData }: { initialData?: AlertsResponse }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("area");
  const { response } = useAlerts(120_000, initialData);
  const { coords, setCoords, status, requestLocation, clearLocation } = useUserLocation();
  const [district, setDistrict] = useState<DistrictCentroid | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the last chosen place after hydration.
  useEffect(() => {
    try {
      const id = localStorage.getItem(DISTRICT_KEY);
      const d = id ? NEPAL_DISTRICTS.find((x) => x.id === id) : undefined;
      if (d) {
        setDistrict(d);
        setCoords({ lat: d.lat, lng: d.lng });
      } else if (localStorage.getItem(GPS_KEY) === "on") {
        requestLocation();
      }
    } catch {}
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickDistrict = useCallback(
    (id: string) => {
      const d = NEPAL_DISTRICTS.find((x) => x.id === id);
      if (!d) return;
      setDistrict(d);
      setCoords({ lat: d.lat, lng: d.lng });
      try {
        localStorage.setItem(DISTRICT_KEY, d.id);
        localStorage.setItem(GPS_KEY, "off");
      } catch {}
    },
    [setCoords],
  );

  const useGps = useCallback(() => {
    setDistrict(null);
    try {
      localStorage.removeItem(DISTRICT_KEY);
      localStorage.setItem(GPS_KEY, "on");
    } catch {}
    requestLocation();
  }, [requestLocation]);

  const reset = useCallback(() => {
    setDistrict(null);
    clearLocation();
    try {
      localStorage.removeItem(DISTRICT_KEY);
      localStorage.setItem(GPS_KEY, "off");
    } catch {}
  }, [clearLocation]);

  const nearby = useMemo(() => {
    if (!coords) return [];
    const out: { alert: Alert; km: number }[] = [];
    for (const a of response?.alerts ?? []) {
      if (a.location?.lat == null || a.location.lng == null) continue;
      const km = haversineKm(coords, { lat: a.location.lat, lng: a.location.lng });
      if (km <= RADIUS_KM) out.push({ alert: a, km });
    }
    out.sort(
      (x, y) =>
        SEVERITY_RANK[y.alert.severity] - SEVERITY_RANK[x.alert.severity] || x.km - y.km,
    );
    return out;
  }, [coords, response]);

  const districtName = district ? (locale === "ne" ? district.ne : district.en) : null;

  const picker = (
    <div className="space-y-4">
      <div>
        <label htmlFor="area-district" className="mb-2 block text-lg font-semibold">
          {t("chooseLabel")}
        </label>
        <select
          id="area-district"
          value={district?.id ?? ""}
          onChange={(e) => pickDistrict(e.target.value)}
          className="h-14 w-full rounded-chip border-2 border-border-strong bg-surface px-4 text-lg font-medium focus:border-brand focus:outline-none"
        >
          <option value="" disabled>
            {t("choosePlaceholder")}
          </option>
          {NEPAL_DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {locale === "ne" ? d.ne : d.en}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 text-muted" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span>{t("or")}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <button type="button" onClick={useGps} className="btn btn-secondary w-full">
        <MapPinIcon width={20} height={20} />
        {t("useLocation")}
      </button>
      <p className="text-sm text-muted">{t("privacy")}</p>
    </div>
  );

  // ── 1. No place chosen yet ────────────────────────────────────────────────
  if (!ready || (!coords && status !== "locating" && status !== "denied" && status !== "timeout" && status !== "unavailable")) {
    return (
      <section aria-labelledby="area-title" className="card-elevated p-6 sm:p-8">
        <h2 id="area-title" className="text-2xl font-bold sm:text-3xl">
          {t("title")}
        </h2>
        <p className="mt-2 mb-6 text-lg text-muted">{t("subtitle")}</p>
        {picker}
      </section>
    );
  }

  // ── 2. Locating / failed ──────────────────────────────────────────────────
  if (!coords) {
    const msg =
      status === "locating"
        ? t("locating")
        : status === "denied"
          ? t("denied")
          : status === "unavailable"
            ? t("unsupported")
            : t("error");
    return (
      <section aria-labelledby="area-title" className="card-elevated p-6 sm:p-8" aria-busy={status === "locating"}>
        <h2 id="area-title" className="text-2xl font-bold">
          {t("title")}
        </h2>
        <p role="status" className="mt-3 mb-6 text-lg">
          {msg}
        </p>
        {status !== "locating" ? picker : null}
      </section>
    );
  }

  // ── 3. Answer ─────────────────────────────────────────────────────────────
  const tone = toneFor(nearby.map((n) => n.alert));
  const style = TONE_STYLE[tone];
  const place = districtName ?? t("yourLocation");

  return (
    <section aria-labelledby="area-title" className="space-y-5">
      <div
        role={tone === "danger" ? "alert" : "status"}
        className={cn("rounded-card border-2 p-6 sm:p-8", style.box)}
      >
        <div className="flex items-start gap-4">
          <span className={cn("mt-1 shrink-0", style.icon)}>
            <SeverityGlyph severity={style.glyph} width={40} height={40} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-base font-semibold text-muted">
              <MapPinIcon width={16} height={16} />
              <span>{place}</span>
            </p>
            <h2 id="area-title" className="mt-1 text-2xl font-bold sm:text-3xl">
              {t(`headline.${tone}`)}
            </h2>
            <p className="mt-2 text-lg">
              {tone === "clear"
                ? t("clearNote", { km: RADIUS_KM })
                : t("nearbyCount", { count: nearby.length, km: RADIUS_KM })}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn-secondary">
            {t("change")}
          </button>
          <Link href="/learn" className="btn btn-secondary">
            {t("prepare")}
          </Link>
        </div>
      </div>

      {nearby.length > 0 ? (
        <>
          <div className="grid gap-4">
            {nearby.slice(0, MAX_SHOWN).map(({ alert }, i) => (
              <AlertCard key={`${alert.id}-${i}`} alert={alert} />
            ))}
          </div>
          {nearby.length > MAX_SHOWN ? (
            <Link href="/alerts" className="btn btn-secondary">
              {t("seeAll", { count: nearby.length })}
              <ArrowIcon width={18} height={18} />
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
