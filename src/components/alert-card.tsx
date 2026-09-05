import { useState, memo } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import type { Alert } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { SEVERITY_BAR, SEVERITY_TEXT } from "@/lib/ui";
import { StatusBadge } from "@/components/badges";
import { SeverityGlyph, HazardGlyph, ArrowIcon } from "@/components/icons";

const AlertDetailModal = dynamic(
  () => import("@/components/alert-detail-modal").then((m) => m.AlertDetailModal),
  { ssr: false }
);


function loc(v: { en: string; ne?: string } | undefined, locale: Locale): string {
  if (!v) return "";
  return locale === "ne" ? v.ne ?? v.en : v.en;
}

function getHighlightMetric(alert: Alert): { label: string; value: string } | null {
  const m = alert.meta ?? {};
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  if (n(m.magnitude) !== null) {
    return { label: "Magnitude", value: `M ${(m.magnitude as number).toFixed(1)}` };
  }
  if (n(m.waterLevel) !== null) {
    return { label: "Water Level", value: `${(m.waterLevel as number).toFixed(2)} m` };
  }
  if (n(m.rainfall) !== null) {
    return { label: "Rainfall", value: `${(m.rainfall as number).toFixed(1)} mm` };
  }
  return null;
}

export const AlertCard = memo(function AlertCard({
  alert,
  onSelect,
}: {
  alert: Alert;
  onSelect?: (alert: Alert) => void;
}) {

  const [isOpen, setIsOpen] = useState(false);
  const locale = useLocale() as Locale;
  const tf = useTranslations("timeframe");
  const tc = useTranslations("common");
  const tsev = useTranslations("severity");
  const th = useTranslations("hazards");
  const ta = useTranslations("alerts");

  const title = loc(alert.title, locale) || alert.title.en;
  const place =
    alert.location?.name ??
    alert.location?.district ??
    (alert.location?.basin ? `${alert.location.basin} basin` : undefined);
  const highlight = getHighlightMetric(alert);

  const handleOpen = () => {
    if (onSelect) {
      onSelect(alert);
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
          }
        }}
        className="card group relative flex h-full cursor-pointer flex-col justify-between overflow-hidden p-5 sm:p-6 transition-all hover:border-border-strong hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {/* Severity accent bar */}
        <span className={cn("absolute inset-y-0 left-0 w-1", SEVERITY_BAR[alert.severity])} aria-hidden />

        <div className="flex flex-col gap-3">
          {/* Top bar: Severity + Hazard + Timeframe */}
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-sm font-bold", SEVERITY_TEXT[alert.severity])}>
                <SeverityGlyph severity={alert.severity} width={15} height={15} />
                {tsev(`${alert.severity}.label`)}
              </span>
              <span className="h-3.5 w-px shrink-0 bg-border" aria-hidden />
              <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-muted">
                <HazardGlyph hazard={alert.hazard} width={15} height={15} className="shrink-0" />
                <span className="truncate">{th(`${alert.hazard}.name`)}</span>
              </span>
            </div>
            <span className="eyebrow shrink-0">{tf(alert.timeframe)}</span>
          </div>

          {/* Headline title & place */}
          <div className="space-y-1 pt-0.5">
            <h3
              className={cn(
                "h3 font-bold text-[15px] leading-snug break-words transition-colors group-hover:text-brand",
                locale === "ne" ? "tracking-normal" : "tracking-tight"
              )}
            >
              {title}
            </h3>
            {place ? <p className="text-sm font-medium text-muted break-words">{place}</p> : null}
          </div>

          {/* Key highlight metric chip & trend */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {highlight ? (
              <span className="inline-flex items-center gap-1.5 rounded-chip border border-border/80 bg-surface-2/60 px-2.5 py-1 text-xs font-semibold tabular text-text">
                <span className="text-[10px] uppercase tracking-wider text-muted">{highlight.label}:</span>
                <span>{highlight.value}</span>
              </span>
            ) : null}
            {typeof alert.meta?.trend === "string" && alert.meta.trend.trim().length > 0 ? (
              <span className={cn(
                "inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-[11px] font-bold uppercase tabular",
                alert.meta.trend.trim().toUpperCase() === "RISING"
                  ? "bg-danger-soft text-danger border border-danger/20"
                  : alert.meta.trend.trim().toUpperCase() === "FALLING"
                    ? "bg-advisory-soft text-advisory border border-advisory/20"
                    : "bg-surface-2 text-muted border border-border",
              )}>
                <span>{alert.meta.trend.trim().toUpperCase() === "RISING" ? "↑" : alert.meta.trend.trim().toUpperCase() === "FALLING" ? "↓" : "→"}</span>
                <span>{alert.meta.trend.trim().toUpperCase()}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Footer: Updated time + "View details" with ArrowIcon */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border pt-3.5 text-xs">
          <div className="flex min-w-0 items-center gap-2 text-muted">
            <StatusBadge status={alert.source.status} className="shrink-0" />
            <span className="tabular truncate">{tc("updatedAgo", { time: timeAgo(alert.issuedAt, locale) })}</span>
          </div>
          <span className="inline-flex items-center gap-1 font-semibold text-brand transition-colors group-hover:text-brand-strong">
            <span>{ta("viewDetails")}</span>
            <ArrowIcon width={12} height={12} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>

      {isOpen && !onSelect ? (
        <AlertDetailModal alert={alert} isOpen={isOpen} onClose={() => setIsOpen(false)} />
      ) : null}
    </>
  );
});

export default AlertCard;

