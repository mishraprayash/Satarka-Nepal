"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Alert } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { timeAgo, formatDateTime } from "@/lib/format";
import { SEVERITY_BAR, SEVERITY_CHIP, SEVERITY_TEXT } from "@/lib/ui";
import { LEARN_CONTENT } from "@/lib/learn-content";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import {
  HazardGlyph,
  CloseIcon,
  ExternalIcon,
  ArrowIcon,
  MapPinIcon,
} from "@/components/icons";
import { AlertMiniMap } from "@/components/alert-mini-map";

export interface AlertDetailModalProps {
  alert: Alert;
  isOpen: boolean;
  onClose: () => void;
}

function loc(v: { en: string; ne?: string } | undefined, locale: Locale): string {
  if (!v) return "";
  return locale === "ne" ? v.ne ?? v.en : v.en;
}

function getReadouts(alert: Alert): { label: string; value: string }[] {
  const m = alert.meta ?? {};
  const out: { label: string; value: string }[] = [];
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  if (n(m.magnitude) !== null) out.push({ label: "Magnitude", value: `M ${(m.magnitude as number).toFixed(1)}` });
  if (n(m.depthKm) !== null) out.push({ label: "Depth", value: `${Math.round(m.depthKm as number)} km` });
  if (n(m.waterLevel) !== null) out.push({ label: "Water Level", value: `${(m.waterLevel as number).toFixed(2)} m` });
  if (n(m.warningLevel) !== null) out.push({ label: "Warning Level", value: `${(m.warningLevel as number).toFixed(2)} m` });
  if (n(m.dangerLevel) !== null) out.push({ label: "Danger Level", value: `≥ ${(m.dangerLevel as number).toFixed(2)} m` });
  if (n(m.rainfall) !== null) out.push({ label: "Rainfall", value: `${(m.rainfall as number).toFixed(1)} mm` });
  if (typeof m.trend === "string" && m.trend.trim().length > 0) {
    const t = m.trend.trim().toUpperCase();
    const symbol = t === "RISING" ? "↑ " : t === "FALLING" ? "↓ " : "→ ";
    out.push({ label: "Trend", value: `${symbol}${t}` });
  }

  return out;
}

function RiverGaugeMeter({
  waterLevel,
  warningLevel,
  dangerLevel,
  trend,
}: {
  waterLevel: number;
  warningLevel?: number | null;
  dangerLevel?: number | null;
  trend?: string;
}) {
  const maxScale = Math.max(
    (dangerLevel ?? (warningLevel ? warningLevel * 1.15 : waterLevel)) * 1.25,
    waterLevel * 1.15,
    1,
  );

  const curPct = Math.min(Math.max((waterLevel / maxScale) * 100, 4), 96);
  const warnPct = warningLevel ? Math.min((warningLevel / maxScale) * 100, 94) : null;
  const dangerPct = dangerLevel ? Math.min((dangerLevel / maxScale) * 100, 97) : null;

  const isDanger = dangerLevel != null && waterLevel >= dangerLevel;
  const isWarning = !isDanger && warningLevel != null && waterLevel >= warningLevel;

  return (
    <div className="space-y-2 rounded-xl border border-border/80 bg-surface-2/60 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wider text-muted">River Level Gauge</span>
        <div className="flex items-center gap-2">
          {trend ? (
            <span className="rounded-chip border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase text-text">
              {trend === "RISING" ? "↑ " : trend === "FALLING" ? "↓ " : "→ "}
              {trend}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-chip px-2.5 py-0.5 text-[11px] font-bold uppercase",
              isDanger
                ? "bg-danger text-white animate-pulse"
                : isWarning
                  ? "bg-warning text-white"
                  : "bg-surface text-muted border border-border",
            )}
          >
            {isDanger ? "Danger Level Exceeded" : isWarning ? "Warning Level Active" : "Normal / Below Warning"}
          </span>
        </div>
      </div>

      {/* Visual Meter Bar */}
      <div className="relative pt-6 pb-5">
        {/* Current level indicator */}
        <div
          className="absolute top-0 -translate-x-1/2 transition-all flex flex-col items-center z-20"
          style={{ left: `${curPct}%` }}
        >
          <span className="tabular rounded bg-text px-2 py-0.5 text-[11px] font-bold text-bg shadow-sm whitespace-nowrap">
            {waterLevel.toFixed(2)} m
          </span>
          <span className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-text" />
        </div>

        {/* The Track */}
        <div className="relative h-3.5 w-full rounded-full bg-surface-2 overflow-hidden border border-border/60">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isDanger ? "bg-danger" : isWarning ? "bg-warning" : "bg-brand",
            )}
            style={{ width: `${curPct}%` }}
          />
        </div>

        {/* Warning & Danger threshold tick lines */}
        {warnPct !== null ? (
          <div
            className="absolute top-5 bottom-0 w-0.5 bg-warning z-10 flex flex-col items-center"
            style={{ left: `${warnPct}%` }}
            title={`Warning: ${warningLevel!.toFixed(2)}m`}
          >
            <span className="absolute top-4 -translate-x-1/2 text-[10px] font-semibold tabular text-warning whitespace-nowrap">
              Warn: {warningLevel!.toFixed(1)}m
            </span>
          </div>
        ) : null}

        {dangerPct !== null ? (
          <div
            className="absolute top-5 bottom-0 w-0.5 bg-danger z-10 flex flex-col items-center"
            style={{ left: `${dangerPct}%` }}
            title={`Danger: ${dangerLevel!.toFixed(2)}m`}
          >
            <span className="absolute top-4 -translate-x-1/2 text-[10px] font-semibold tabular text-danger whitespace-nowrap">
              Danger: {dangerLevel!.toFixed(1)}m
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AlertDetailModal({ alert, isOpen, onClose }: AlertDetailModalProps) {
  const locale = useLocale() as Locale;
  const tf = useTranslations("timeframe");
  const tc = useTranslations("common");
  const th = useTranslations("hazards");
  const talerts = useTranslations("alerts");
  const tact = useTranslations("actions");
  const tv = useTranslations("verdict");

  // Prevent background scroll and close on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title = loc(alert.title, locale) || alert.title.en;
  const description = loc(alert.description, locale);
  const detailUrl =
    (typeof alert.meta?.detailUrl === "string" && alert.meta.detailUrl) || alert.source.url;
  const place =
    alert.location?.name ??
    alert.location?.district ??
    (alert.location?.basin ? `${alert.location.basin} basin` : undefined);

  const hasCoords =
    alert.location?.lat != null &&
    alert.location?.lng != null &&
    !Number.isNaN(alert.location.lat) &&
    !Number.isNaN(alert.location.lng);

  const readouts = getReadouts(alert);
  const duringSteps = LEARN_CONTENT[alert.hazard].during.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="presentation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/55 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Responsive Drawer Container: Slide from right on md+, Slide from bottom on mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-drawer-title"
        className={cn(
          "fixed z-50 flex flex-col bg-surface text-text shadow-2xl border-border focus:outline-none transition-all",
          // Desktop & Tablet: slide-in from right
          "md:inset-y-0 md:right-0 md:w-full md:max-w-xl md:border-l md:animate-drawer-right",
          // Mobile: slide-in bottom sheet
          "inset-x-0 bottom-0 max-h-[92vh] border-t rounded-t-2xl animate-drawer-bottom",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-border md:hidden shrink-0" aria-hidden="true" />

        {/* Severity Accent Ribbon */}
        <div className={cn("h-1.5 w-full shrink-0", SEVERITY_BAR[alert.severity])} aria-hidden="true" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6 shrink-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <SeverityBadge severity={alert.severity} />
            <span className="h-3.5 w-px bg-border" aria-hidden />
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
              <HazardGlyph hazard={alert.hazard} width={16} height={16} className="shrink-0 text-brand" />
              <span>{th(`${alert.hazard}.name`)}</span>
            </span>
            <span className="h-3.5 w-px bg-border" aria-hidden />
            <span className="eyebrow shrink-0">{tf(alert.timeframe)}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={tact("close")}
            className="rounded-chip p-2 text-muted hover:text-text hover:bg-surface-2 transition-colors shrink-0 cursor-pointer"
          >
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">
          {/* Plain-language "should I act?" verdict */}
          <div className={cn("rounded-xl px-4 py-3", SEVERITY_CHIP[alert.severity])}>
            <p className={cn("text-sm font-bold", SEVERITY_TEXT[alert.severity])}>
              {tv(`${alert.severity}.title`)}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-text/80">
              {tv(`${alert.severity}.body`)}
            </p>
          </div>

          {/* Title & place with MapPin */}
          <div className="space-y-1.5">
            <h2
              id="alert-drawer-title"
              className={cn(
                "text-xl sm:text-2xl font-bold leading-snug break-words",
                locale === "ne" ? "tracking-normal" : "tracking-tight"
              )}
            >
              {title}
            </h2>
            {place ? (
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted break-words">
                <MapPinIcon width={16} height={16} className="shrink-0 text-brand" />
                <span>{place}</span>
                {alert.location?.district && alert.location.name && alert.location.district !== alert.location.name ? (
                  <span className="text-faint">({alert.location.district})</span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* River Gauge Level Meter (when hydrological water level data exists) */}
          {typeof alert.meta?.waterLevel === "number" &&
          (alert.meta?.warningLevel != null || alert.meta?.dangerLevel != null) ? (
            <RiverGaugeMeter
              waterLevel={alert.meta.waterLevel as number}
              warningLevel={typeof alert.meta.warningLevel === "number" ? alert.meta.warningLevel : undefined}
              dangerLevel={typeof alert.meta.dangerLevel === "number" ? alert.meta.dangerLevel : undefined}
              trend={typeof alert.meta.trend === "string" ? alert.meta.trend : undefined}
            />
          ) : null}

          {/* Instrument Readouts grid */}
          {readouts.length > 0 ? (
            <div className="space-y-2">
              <p className="eyebrow">{talerts("readingsTitle")}</p>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-xl border border-border/80 bg-surface-2/50 p-4">
                {readouts.map((d) => (
                  <div key={d.label} className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint truncate">
                      {d.label}
                    </dt>
                    <dd className="tabular mt-0.5 text-sm sm:text-base font-bold text-text truncate">
                      {d.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {/* Interactive AlertMiniMap */}
          {hasCoords ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="eyebrow">{talerts("locationDetails")}</span>
                <span className="tabular text-faint font-mono">
                  {alert.location!.lat!.toFixed(4)}°N, {alert.location!.lng!.toFixed(4)}°E
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border">
                <AlertMiniMap
                  lat={alert.location!.lat!}
                  lng={alert.location!.lng!}
                  severity={alert.severity}
                  title={title}
                  place={place}
                />
              </div>
            </div>
          ) : null}

          {/* Description / situation details */}
          {description ? (
            <div className="space-y-2">
              <p className="eyebrow">{talerts("situationTitle")}</p>
              <div className="text-sm leading-relaxed text-muted break-words whitespace-pre-line rounded-xl border border-border/60 bg-surface-2/30 p-4">
                {description}
              </div>
            </div>
          ) : null}

          {/* What to do now — act-now steps pulled from the hazard guide */}
          {duringSteps.length > 0 ? (
            <div className="space-y-2">
              <p className="eyebrow">{talerts("whatToDoNow")}</p>
              <div className="rounded-xl border border-warning/40 bg-warning-soft/30 p-4">
                <ol className="space-y-2.5">
                  {duringSteps.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        className="tabular mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-warning text-xs font-bold text-white"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <p className="text-sm leading-relaxed text-text">{loc(item, locale)}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-muted">{talerts("whatToDoNowNote")}</p>
              </div>
            </div>
          ) : null}

          {/* Preparedness Quick Link Banner */}
          <div className="rounded-xl border border-brand/30 bg-brand/5 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <HazardGlyph hazard={alert.hazard} width={20} height={20} className="text-brand shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text">
                  {locale === "ne"
                    ? `${th(`${alert.hazard}.name`)} सम्बन्धी सुरक्षा सावधानीहरू`
                    : `Safety Action Guide: ${th(`${alert.hazard}.name`)}`}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {locale === "ne"
                    ? "जोखिमको बेला गर्नुपर्ने र गर्न नहुने कामहरू"
                    : "Steps to take before, during, and after this hazard"}
                </p>
              </div>
            </div>
            <Link
              href={`/learn/${alert.hazard}`}
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-chip bg-brand px-3 py-1.5 text-xs font-semibold text-brand-fg hover:bg-brand-strong transition-colors shrink-0"
            >
              <span>{tact("learnMore")}</span>
              <ArrowIcon width={12} height={12} />
            </Link>
          </div>

          {/* Source provenance & StatusBadge & timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/50 bg-surface-2/30 px-4 py-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-muted">
              <span className="font-semibold text-text">{alert.source.name}</span>
              <span className="h-3 w-px bg-border" aria-hidden />
              <StatusBadge status={alert.source.status} />
              <span className="h-3 w-px bg-border" aria-hidden />
              <span className="capitalize">{alert.provenance === "official" ? tc("official") : tc("community")}</span>
            </div>
            <div className="tabular text-faint font-mono">
              <span>{tc("updatedAgo", { time: timeAgo(alert.issuedAt, locale) })}</span>
              <span className="hidden sm:inline"> · {formatDateTime(alert.issuedAt, locale)}</span>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-surface-2/40 px-5 py-3.5 sm:px-6 shrink-0">
          {hasCoords ? (
            <Link
              href={`/map?lat=${alert.location!.lat}&lng=${alert.location!.lng}&zoom=12&title=${encodeURIComponent(title)}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-chip border border-border-strong bg-surface px-4 py-2 text-xs sm:text-sm font-semibold text-text hover:bg-surface-2 transition-colors min-h-[40px]"
            >
              <MapPinIcon width={14} height={14} className="text-brand" />
              <span>{talerts("openFullMap")}</span>
            </Link>
          ) : null}

          <a
            href={detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-chip border border-brand/40 bg-brand/10 px-4 py-2 text-xs sm:text-sm font-semibold text-brand hover:bg-brand/20 transition-colors min-h-[40px]"
          >
            <span>{tact("viewSource")}</span>
            <ExternalIcon width={13} height={13} />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-chip border border-border bg-surface px-4 py-2 text-xs sm:text-sm font-medium text-text hover:bg-surface-2 transition-colors min-h-[40px] cursor-pointer"
          >
            {tact("close")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertDetailModal;
