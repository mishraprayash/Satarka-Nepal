"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Alert } from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import dynamic from "next/dynamic";
import { haversineKm, type LatLng } from "@/lib/distance";
import { timeAgo } from "@/lib/format";
import { SEVERITY_BAR } from "@/lib/ui";
import { useAlerts } from "@/lib/use-alerts";
import { cn } from "@/lib/cn";
import { SeverityBadge, HazardChip } from "@/components/badges";
import { SeverityGlyph } from "@/components/icons";
import { NEPAL_DISTRICTS, type DistrictCentroid } from "@/lib/districts";
import type { AlertsResponse } from "@/lib/types";

const AlertDetailModal = dynamic(
  () => import("@/components/alert-detail-modal").then((m) => m.AlertDetailModal),
  { ssr: false }
);

const CONSENT_KEY = "satarka-nearby";
const DISTRICT_KEY = "satarka-nearby-district";
const MAX_SHOWN = 6;
const RADII = [5, 10, 25, 50];

type Consent = "prompt" | "on" | "off";
type LocStatus = "idle" | "locating" | "ok" | "denied" | "error" | "unsupported";

function readConsent(): Consent {
  if (typeof window === "undefined") return "prompt";
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === "on" || v === "off") return v;
  } catch {}
  return "prompt";
}

function storeConsent(c: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, c);
  } catch {}
}

function locate(onDone: (status: LocStatus, pos: LatLng | null) => void) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onDone("unsupported", null);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (p) => onDone("ok", { lat: p.coords.latitude, lng: p.coords.longitude }),
    (err) => onDone(err && err.code === 1 ? "denied" : "error", null),
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 },
  );
}

function locTitle(v: { en: string; ne?: string } | undefined, locale: Locale): string {
  return v ? (locale === "ne" ? v.ne ?? v.en : v.en) : "";
}

/** Banner accent per worst nearby severity — static strings so Tailwind sees them. */
const TONE: Record<string, string> = {
  danger: "border-danger/60 bg-danger-soft/40",
  warning: "border-warning/60 bg-warning-soft/40",
  watch: "border-watch/60 bg-watch-soft/40",
  advisory: "border-watch/60 bg-watch-soft/40",
  info: "border-watch/60 bg-watch-soft/40",
};

export function NearYou({ initialData }: { initialData?: AlertsResponse }) {
  const locale = useLocale() as Locale;
  const tn = useTranslations("near");
  const ta = useTranslations("actions");
  const tc = useTranslations("common");
  const { response } = useAlerts(120_000, initialData);

  const [consent, setConsent] = useState<Consent>("prompt");
  const [locStatus, setLocStatus] = useState<LocStatus>("idle");
  const [pos, setPos] = useState<LatLng | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictCentroid | null>(null);
  const [inspectAlert, setInspectAlert] = useState<Alert | null>(null);

  // Read persisted consent and district after hydration
  useEffect(() => {
    setConsent(readConsent());
    try {
      const savedDistId = localStorage.getItem(DISTRICT_KEY);
      if (savedDistId) {
        const d = NEPAL_DISTRICTS.find((item) => item.id === savedDistId);
        if (d) {
          setSelectedDistrict(d);
          setPos({ lat: d.lat, lng: d.lng });
          setLocStatus("ok");
        }
      }
    } catch {}
  }, []);

  const selectDistrict = useCallback((distId: string) => {
    if (!distId) return;
    const d = NEPAL_DISTRICTS.find((item) => item.id === distId);
    if (!d) return;
    setSelectedDistrict(d);
    setPos({ lat: d.lat, lng: d.lng });
    setLocStatus("ok");
    setConsent("on");
    storeConsent("on");
    try {
      localStorage.setItem(DISTRICT_KEY, d.id);
    } catch {}
  }, []);

  const request = useCallback(() => {
    setLocStatus("locating");
    setSelectedDistrict(null);
    try {
      localStorage.removeItem(DISTRICT_KEY);
    } catch {}
    locate((status, position) => {
      setLocStatus(status);
      setPos(position);
    });
  }, []);

  // Auto-locate once consent is already granted and no district chosen
  useEffect(() => {
    if (consent === "on" && locStatus === "idle" && !selectedDistrict) {
      request();
    }
  }, [consent, locStatus, selectedDistrict, request]);

  const nearby = useMemo(() => {
    if (!pos) return [];
    const alerts = response?.alerts ?? [];
    const out: { alert: Alert; km: number }[] = [];
    for (const a of alerts) {
      if (a.location?.lat == null || a.location.lng == null) continue;
      const km = haversineKm(pos, { lat: a.location.lat, lng: a.location.lng });
      if (km <= radiusKm) out.push({ alert: a, km });
    }
    out.sort(
      (x, y) =>
        x.km - y.km ||
        SEVERITY_RANK[y.alert.severity] - SEVERITY_RANK[x.alert.severity] ||
        Date.parse(y.alert.issuedAt) - Date.parse(x.alert.issuedAt),
    );
    return out;
  }, [pos, response, radiusKm]);

  const turnOff = useCallback(() => {
    setConsent("off");
    storeConsent("off");
    setPos(null);
    setSelectedDistrict(null);
    try {
      localStorage.removeItem(DISTRICT_KEY);
    } catch {}
    setLocStatus("idle");
  }, []);

  const enable = useCallback(() => {
    setConsent("on");
    storeConsent("on");
    request();
  }, [request]);

  // ── Consent prompt ─────────────────────────────────────────────────────────
  if (consent === "prompt") {
    return (
      <section className="card border-warning/40 bg-warning-soft/30 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-xl items-start gap-3">
            <span className="mt-0.5 shrink-0 text-warning" aria-hidden>
              <SeverityGlyph severity="watch" width={22} height={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{tn("promptTitle")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{tn("promptBody")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={enable}
              className="inline-flex items-center gap-2 rounded-chip bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-strong cursor-pointer"
            >
              {tn("enable")}
            </button>
            <button
              type="button"
              onClick={() => {
                setConsent("off");
                storeConsent("off");
              }}
              className="rounded-chip border border-border-strong px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text cursor-pointer"
            >
              {tn("notNow")}
            </button>
          </div>
        </div>

        {/* Manual district selection alternative */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-warning/20 pt-3 text-xs">
          <span className="font-medium text-muted">{tn("selectDistrict")}:</span>
          <select
            value={selectedDistrict?.id ?? ""}
            onChange={(e) => selectDistrict(e.target.value)}
            className="rounded-chip border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-text focus:border-brand focus:outline-none"
          >
            <option value="" disabled>
              {tn("chooseDistrict")}
            </option>
            {NEPAL_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {locale === "ne" ? d.ne : d.en}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-faint">{tn("privacy")}</p>
      </section>
    );
  }

  // ── Turned off ────────────────────────────────────────────────────────────
  if (consent === "off") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-border bg-surface px-4 py-2.5 text-sm text-muted">
        <span>{tn("off")}</span>
        <button
          type="button"
          onClick={() => {
            setConsent("prompt");
            storeConsent("prompt");
          }}
          className="font-medium text-brand hover:text-brand-strong cursor-pointer"
        >
          {tn("reEnable")}
        </button>
      </div>
    );
  }

  // ── Granted but not yet located ──────────────────────────────────
  if (locStatus === "locating") {
    return (
      <div className="card grid place-items-center px-4 py-4 text-sm text-muted" aria-busy>
        {tn("locating")}
      </div>
    );
  }

  // ── Location failed or denied ──────────────────────────────────────────────
  if (locStatus === "denied" || locStatus === "error" || locStatus === "unsupported") {
    const message =
      locStatus === "denied" ? tn("denied") : locStatus === "unsupported" ? tn("unsupported") : tn("error");
    return (
      <div className="card border-warning/40 bg-warning-soft/30 p-4 sm:p-5">
        <p className="text-sm">{message}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-warning/20 pt-3 text-xs">
          <span className="font-semibold text-text">{tn("selectDistrict")}:</span>
          <select
            value={selectedDistrict?.id ?? ""}
            onChange={(e) => selectDistrict(e.target.value)}
            className="rounded-chip border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-text focus:border-brand focus:outline-none"
          >
            <option value="" disabled>
              {tn("chooseDistrict")}
            </option>
            {NEPAL_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {locale === "ne" ? d.ne : d.en}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {locStatus !== "unsupported" ? (
            <button
              type="button"
              onClick={request}
              className="rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2 cursor-pointer"
            >
              {ta("retry")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={turnOff}
            className="rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text cursor-pointer"
          >
            {tn("turnOff")}
          </button>
        </div>
      </div>
    );
  }

  // ── Active Controls Header (Radius + Location badge) ─────────────────────
  const locationBadge = selectedDistrict ? (locale === "ne" ? selectedDistrict.ne : selectedDistrict.en) : "GPS";

  // ── Located, no alerts in range ───────────────────────────────────────────
  if (nearby.length === 0) {
    return (
      <div className="card flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-advisory" aria-hidden>
              <SeverityGlyph severity="advisory" width={18} height={18} />
            </span>
            <div>
              <p className="text-sm font-medium">{tn("none")}</p>
              <p className="text-xs text-faint">
                {tn("noneNote")} (📍 {locationBadge} · {radiusKm} km)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusKm(r)}
                className={cn(
                  "rounded-chip px-2 py-0.5 text-xs font-semibold tabular transition-colors cursor-pointer",
                  radiusKm === r
                    ? "bg-brand text-brand-fg"
                    : "border border-border text-muted hover:bg-surface-2",
                )}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 text-xs text-faint">
          <div className="flex items-center gap-2">
            <span>{tn("selectDistrict")}:</span>
            <select
              value={selectedDistrict?.id ?? ""}
              onChange={(e) => selectDistrict(e.target.value)}
              className="rounded border border-border bg-surface px-2 py-0.5 text-xs text-text focus:border-brand focus:outline-none"
            >
              <option value="" disabled>
                {tn("chooseDistrict")}
              </option>
              {NEPAL_DISTRICTS.map((d) => (
                <option key={d.id} value={d.id}>
                  {locale === "ne" ? d.ne : d.en}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={request} className="font-medium text-brand hover:underline cursor-pointer">
              GPS
            </button>
            <button type="button" onClick={turnOff} className="font-medium text-muted hover:text-text cursor-pointer">
              {tn("turnOff")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Located, alerts within radiusKm — the caution banner ──────────────────
  const worst = nearby[0].alert.severity;
  const shown = nearby.slice(0, MAX_SHOWN);
  const extra = nearby.length - shown.length;

  return (
    <section className={cn("card relative overflow-hidden border-2 p-5 sm:p-6", TONE[worst] ?? TONE.warning)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="shrink-0 text-danger" aria-hidden>
            <SeverityGlyph severity={worst} width={24} height={24} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold leading-tight tracking-tight">
                {tn("withinPlural", { count: nearby.length })}
              </h2>
              <span className="rounded-chip border border-border/80 bg-surface/70 px-2 py-0.5 text-xs font-semibold tabular text-text">
                📍 {locationBadge}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted">{tn("caution")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Radius selector */}
          <div className="flex items-center gap-1 text-xs">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadiusKm(r)}
                className={cn(
                  "rounded-chip px-2 py-0.5 text-xs font-semibold tabular transition-colors cursor-pointer",
                  radiusKm === r
                    ? "bg-brand text-brand-fg"
                    : "border border-border-strong bg-surface text-muted hover:bg-surface-2",
                )}
              >
                {r}km
              </button>
            ))}
          </div>
          <Link
            href="/alerts"
            className="inline-flex items-center gap-1 rounded-chip bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-strong"
          >
            {tn("seeAll")}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <ul className="mt-4 grid gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ alert, km }) => (
          <li
            key={alert.id}
            role="button"
            tabIndex={0}
            onClick={() => setInspectAlert(alert)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setInspectAlert(alert);
              }
            }}
            className="card group relative flex flex-col justify-between overflow-hidden bg-surface p-5 pl-6 cursor-pointer hover:border-border-strong hover:shadow-md transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", SEVERITY_BAR[alert.severity])} aria-hidden />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={alert.severity} />
                <HazardChip hazard={alert.hazard} />
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-snug break-words group-hover:text-brand transition-colors">
                {locTitle(alert.title, locale)}
              </h3>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs border-t border-border/60 pt-2.5">
              <span className="tabular font-bold text-danger">{tn("kmAway", { km })}</span>
              <span className="text-faint">{tc("updatedAgo", { time: timeAgo(alert.issuedAt, locale) })}</span>
            </div>
          </li>
        ))}
      </ul>

      {extra > 0 ? <p className="mt-3 text-xs text-muted">{tn("more", { count: extra })}</p> : null}

      {inspectAlert ? (
        <AlertDetailModal
          alert={inspectAlert}
          isOpen={!!inspectAlert}
          onClose={() => setInspectAlert(null)}
        />
      ) : null}
    </section>
  );
}
