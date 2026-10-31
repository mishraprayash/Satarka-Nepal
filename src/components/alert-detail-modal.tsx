"use client";

import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Alert } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { timeAgo, formatDateTime, localizeText } from "@/lib/format";
import { SEVERITY_BAR, SEVERITY_CHIP, SEVERITY_TEXT } from "@/lib/ui";
import { LEARN_CONTENT } from "@/lib/learn-content";
import { SeverityBadge, StatusBadge } from "@/components/badges";
import {
  HazardGlyph,
  SeverityGlyph,
  CloseIcon,
  ExternalIcon,
  ArrowIcon,
  MapPinIcon,
} from "@/components/icons";
import { AlertMiniMap } from "@/components/alert-mini-map";
import { RiverGaugeChart } from "@/components/river-gauge-chart";

export interface AlertDetailModalProps {
  alert: Alert;
  isOpen: boolean;
  onClose: () => void;
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
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-muted">River Level Gauge</span>
        <div className="flex items-center gap-2">
          {trend ? (
            <span className="rounded-chip border border-border bg-surface px-2 py-0.5 text-sm font-semibold uppercase text-text">
              {trend === "RISING" ? "↑ " : trend === "FALLING" ? "↓ " : "→ "}
              {trend}
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-chip px-2.5 py-0.5 text-sm font-bold uppercase",
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
          <span className="tabular rounded bg-text px-2 py-0.5 text-sm font-bold text-bg shadow-sm whitespace-nowrap">
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
            <span className="absolute top-4 -translate-x-1/2 text-sm font-semibold tabular text-warning whitespace-nowrap">
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
            <span className="absolute top-4 -translate-x-1/2 text-sm font-semibold tabular text-danger whitespace-nowrap">
              Danger: {dangerLevel!.toFixed(1)}m
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface ParsedMetric {
  label: string;
  value: string;
}

function parseSituationDetails(text?: string): { metrics: ParsedMetric[]; paragraphs: string[] } {
  if (!text) return { metrics: [], paragraphs: [] };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const metrics: ParsedMetric[] = [];
  const paragraphs: string[] = [];

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 35) {
      const rawKey = line.slice(0, colonIdx).trim();
      let rawVal = line.slice(colonIdx + 1).trim();

      const label =
        rawKey.toLowerCase() === "warning level"
          ? "Warning Level"
          : rawKey.toLowerCase() === "water level"
            ? "Water Level"
            : rawKey.toLowerCase() === "danger level"
              ? "Danger Level"
              : rawKey.toLowerCase() === "elevation"
                ? "Elevation"
                : rawKey.toLowerCase() === "basin"
                  ? "River Basin"
                  : rawKey;

      const num = Number(rawVal);
      if (Number.isFinite(num)) {
        if (/level/i.test(rawKey)) {
          rawVal = `${num.toFixed(2)} m`;
        } else if (/elevation/i.test(rawKey)) {
          rawVal = `${Math.round(num)} m`;
        } else if (/rain/i.test(rawKey)) {
          rawVal = `${num.toFixed(1)} mm`;
        } else if (rawVal.includes(".") && rawVal.length > 5) {
          rawVal = num.toFixed(2);
        }
      }

      metrics.push({ label, value: rawVal });
    } else {
      paragraphs.push(line);
    }
  }

  return { metrics, paragraphs };
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

  const title = localizeText(alert.title, locale) || alert.title.en;
  const description = localizeText(alert.description, locale);
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
    !Number.isNaN(alert.location.lng) &&
    (alert.location.lat !== 0 || alert.location.lng !== 0);

  const readouts = getReadouts(alert);
  const { metrics: situationMetrics, paragraphs: situationParagraphs } = parseSituationDetails(description);
  const hazardGuide = LEARN_CONTENT[alert.hazard] ?? LEARN_CONTENT.flood;
  const duringSteps = (hazardGuide?.during ?? []).slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-hidden sm:items-center sm:p-5 md:p-6"
      role="presentation"
    >
      <div className="dialog-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Centered Modal Window */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        className="dialog-panel z-10 max-w-2xl focus:outline-none md:max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Severity colour along the top edge, matching the card's left edge */}
        <div className={cn("h-1.5 w-full shrink-0", SEVERITY_BAR[alert.severity])} aria-hidden="true" />

        <div className="dialog-header items-center">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <SeverityBadge severity={alert.severity} />
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
              <HazardGlyph hazard={alert.hazard} width={15} height={15} className="shrink-0" />
              <span>{th(`${alert.hazard}.name`)}</span>
            </span>
            <span className="text-sm text-faint">{tf(alert.timeframe)}</span>
          </div>

          <button type="button" onClick={onClose} aria-label={tact("close")} className="icon-btn -mr-2">
            <CloseIcon width={22} height={22} />
          </button>
        </div>

        <div className="dialog-body custom-scrollbar space-y-6">
          {/* Stale / Historical context banner if record is > 48 hours old */}
          {(() => {
            const issuedMs = alert.issuedAt ? Date.parse(alert.issuedAt) : null;
            const isStale = issuedMs ? Date.now() - issuedMs > 48 * 3600_000 : false;
            if (!isStale) return null;
            return (
              <div className="flex items-start gap-2.5 rounded-card bg-surface-2 px-4 py-3 text-sm text-muted">
                <span className="mt-1 size-2 rounded-full bg-watch shrink-0" aria-hidden="true" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-text">
                    {locale === "ne" ? "विगतको रेकर्ड (प्रत्यक्ष आकस्मिक चेतावनी होइन)" : "Recent Incident Record (Not an Active Flash Alert)"}
                  </p>
                  <p className="text-muted leading-relaxed" suppressHydrationWarning>
                    {locale === "ne"
                      ? `यो विवरण ${timeAgo(alert.issuedAt, locale)} अद्यावधिक गरिएको थियो। यो पूर्वतयारी र सन्दर्भका लागि मात्र देखाइएको हो।`
                      : `This report was recorded ${timeAgo(alert.issuedAt, locale)}. Maintained for historical reference and risk context.`}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Plain-language "should I act?" verdict */}
          <div
            role={alert.severity === "danger" ? "alert" : undefined}
            className={cn("flex items-start gap-4 rounded-card border-l-[6px] border-current p-4 sm:p-5", SEVERITY_CHIP[alert.severity], SEVERITY_TEXT[alert.severity])}
          >
            <SeverityGlyph severity={alert.severity} width={30} height={30} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xl font-bold">{tv(`${alert.severity}.title`)}</p>
              <p className="mt-1 text-lg leading-relaxed text-text">{tv(`${alert.severity}.body`)}</p>
            </div>
          </div>

          {/* Title & place with MapPin */}
          <div className="space-y-2">
            <h2
              id="alert-modal-title"
              className={cn(
                "text-xl sm:text-2xl md:text-3xl font-bold leading-snug break-words text-text",
                locale === "ne" ? "tracking-normal" : "tracking-tight"
              )}
            >
              {title}
            </h2>
            {place ? (
              <div className="flex items-start gap-1.5 text-base text-muted break-words">
                <MapPinIcon width={17} height={17} className="mt-1 shrink-0 text-faint" />
                <span>{place}</span>
                {alert.location?.district && alert.location.name && alert.location.district !== alert.location.name ? (
                  <span className="text-muted font-normal">({alert.location.district})</span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* What to do now — act-now steps pulled from the hazard guide */}
          {duringSteps.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{talerts("whatToDoNow")}</h3>
              <div className="rounded-card bg-surface-2 p-4 sm:p-5">
                <ol className="space-y-3">
                  {duringSteps.map((item, i) => (
                    <li key={i} className="flex gap-3 items-start">
                      <span
                        className="tabular inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-brand-fg"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <p className="text-lg leading-relaxed text-text font-medium">{localizeText(item, locale)}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 border-t border-border pt-3 text-base text-muted">{talerts("whatToDoNowNote")}</p>
              </div>
            </div>
          ) : null}

          {/* River Gauge Level Meter (when hydrological water level data exists) */}
          {typeof alert.meta?.waterLevel === "number" &&
          (alert.meta?.warningLevel != null || alert.meta?.dangerLevel != null) ? (
            <>
              <RiverGaugeMeter
                waterLevel={alert.meta.waterLevel as number}
                warningLevel={typeof alert.meta.warningLevel === "number" ? alert.meta.warningLevel : undefined}
                dangerLevel={typeof alert.meta.dangerLevel === "number" ? alert.meta.dangerLevel : undefined}
                trend={typeof alert.meta.trend === "string" ? alert.meta.trend : undefined}
              />
              <RiverGaugeChart stationId={alert.id} />
            </>
          ) : null}

          {/* Instrument Readouts grid */}
          {readouts.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{talerts("readingsTitle")}</h3>
              <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 rounded-card bg-surface-2 p-4">
                {readouts.map((d) => (
                  <div key={d.label} className="min-w-0">
                    <dt className="text-sm font-medium text-muted">
                      {d.label}
                    </dt>
                    <dd className="tabular mt-0.5 text-lg font-bold text-text break-words">
                      {d.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {/* Situation Details: Clean Metrics Grid */}
          {situationMetrics.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{talerts("situationTitle")}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-card bg-surface-2 p-4">
                {situationMetrics.map((m, idx) => (
                  <div key={idx} className="min-w-0">
                    <p className="text-sm font-medium text-muted">
                      {m.label}
                    </p>
                    <p className="tabular mt-0.5 text-lg font-bold text-text break-words">
                      {m.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Situation Paragraphs (Prose) */}
          {situationParagraphs.length > 0 ? (
            <div className="space-y-2">
              {situationMetrics.length === 0 ? <h3 className="text-lg font-bold">{talerts("situationTitle")}</h3> : null}
              <div className="text-base leading-relaxed text-text break-words whitespace-pre-line rounded-card bg-surface-2 p-4">
                {situationParagraphs.join("\n\n")}
              </div>
            </div>
          ) : null}

          {/* Interactive AlertMiniMap */}
          {hasCoords ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <h3 className="text-lg font-bold">{talerts("locationDetails")}</h3>
                <span className="tabular text-sm text-muted">
                  {alert.location!.lat!.toFixed(4)}°N, {alert.location!.lng!.toFixed(4)}°E
                </span>
              </div>
              <div className="overflow-hidden rounded-card border border-border aspect-[16/9] sm:aspect-[21/9] max-h-56">
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

          {/* Preparedness Quick Link Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-brand/30 bg-brand-soft p-4 sm:p-5">
            <div className="flex items-center gap-3 min-w-0">
              <HazardGlyph hazard={alert.hazard} width={26} height={26} className="shrink-0 text-brand" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-text">
                  {locale === "ne"
                    ? `${th(`${alert.hazard}.name`)} सम्बन्धी सुरक्षा सावधानीहरू`
                    : `Safety Action Guide: ${th(`${alert.hazard}.name`)}`}
                </p>
                <p className="text-sm text-muted">
                  {locale === "ne"
                    ? "जोखिमको बेला गर्नुपर्ने र गर्न नहुने कामहरू"
                    : "Steps to take before, during, and after this hazard"}
                </p>
              </div>
            </div>
            <Link
              href={`/learn/${alert.hazard}`}
              onClick={onClose}
              className="btn btn-secondary shrink-0"
            >
              <span>{tact("learnMore")}</span>
              <ArrowIcon width={12} height={12} />
            </Link>
          </div>

          {/* Source provenance & StatusBadge & timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border pt-4 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-muted">
              <span className="font-semibold text-text">{alert.source.name}</span>
              <span className="h-3 w-px bg-border" aria-hidden />
              <StatusBadge status={alert.source.status} />
              <span className="h-3 w-px bg-border" aria-hidden />
              <span className="capitalize">{alert.provenance === "official" ? tc("official") : tc("community")}</span>
            </div>
            <div className="tabular text-sm text-muted">
              <span suppressHydrationWarning>{tc("updatedAgo", { time: timeAgo(alert.issuedAt, locale) })}</span>
              <span className="hidden sm:inline"> · {formatDateTime(alert.issuedAt, locale)}</span>
            </div>
          </div>
        </div>

        {/* Actions: where to go next from this alert. Closing is the X or Escape. */}
        <div className="dialog-footer flex-col-reverse sm:flex-row-reverse sm:items-center sm:justify-start">
          {hasCoords ? (
            <Link
              href={`/map?lat=${alert.location!.lat}&lng=${alert.location!.lng}&zoom=12&title=${encodeURIComponent(title)}`}
              onClick={onClose}
              className="btn btn-primary"
            >
              <MapPinIcon width={18} height={18} />
              <span>{talerts("openFullMap")}</span>
            </Link>
          ) : null}

          <a href={detailUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
            <span>{tact("viewSource")}</span>
            <ExternalIcon width={16} height={16} />
          </a>

          <button
            type="button"
            onClick={async () => {
              const url = typeof window !== "undefined"
                ? `${window.location.origin}/${locale}/alerts/${encodeURIComponent(alert.id)}`
                : "";
              const text = `${title} - Satarka Nepal`;
              const copied = locale === "ne" ? "लिङ्क कपी भयो!" : "Link copied!";
              const copyPrompt = locale === "ne" ? "यो लिङ्क कपी गर्नुहोस्:" : "Copy this link:";
              if (navigator.share) {
                try {
                  await navigator.share({ title: text, text, url });
                } catch (e) {
                  // Ignore cancel/abort
                }
              } else if (navigator.clipboard) {
                try {
                  await navigator.clipboard.writeText(url);
                  window.alert(copied);
                } catch {
                  window.prompt(copyPrompt, url);
                }
              } else {
                window.prompt(copyPrompt, url);
              }
            }}
            className="btn btn-secondary"
          >
            <span>{locale === "ne" ? "साझा गर्नुहोस्" : "Share"}</span>
          </button>

          {!hasCoords ? (
            <button type="button" onClick={onClose} className="btn btn-primary">
              {tact("close")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AlertDetailModal;
