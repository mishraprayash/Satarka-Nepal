import { useState, memo } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import type { Alert } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { SEVERITY_BAR, STATUS_DOT, STATUS_KEY } from "@/lib/ui";
import { SeverityBadge } from "@/components/badges";
import { HazardGlyph, ArrowIcon, MapPinIcon } from "@/components/icons";
import { localizeText } from "@/lib/format";

const AlertDetailModal = dynamic(
  () => import("@/components/alert-detail-modal").then((m) => m.AlertDetailModal),
  { ssr: false }
);

function getHighlightMetric(alert: Alert): { label: "magnitude" | "waterLevel" | "rainfall"; value: string } | null {
  const m = alert.meta ?? {};
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  if (n(m.magnitude) !== null) {
    return { label: "magnitude", value: `M ${(m.magnitude as number).toFixed(1)}` };
  }
  if (n(m.waterLevel) !== null) {
    return { label: "waterLevel", value: `${(m.waterLevel as number).toFixed(2)} m` };
  }
  if (n(m.rainfall) !== null) {
    return { label: "rainfall", value: `${(m.rainfall as number).toFixed(1)} mm` };
  }
  return null;
}

type Trend = "rising" | "falling" | "steady";
function getTrend(alert: Alert): Trend | null {
  const raw = typeof alert.meta?.trend === "string" ? alert.meta.trend.trim().toUpperCase() : "";
  if (!raw) return null;
  return raw === "RISING" ? "rising" : raw === "FALLING" ? "falling" : "steady";
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
  const th = useTranslations("hazards");
  const ta = useTranslations("alerts");
  const tst = useTranslations("status");
  const tr = useTranslations("reading");

  const title = localizeText(alert.title, locale) || alert.title.en;
  const place =
    alert.location?.name ??
    alert.location?.district ??
    (alert.location?.basin ? `${alert.location.basin} basin` : undefined);
  const highlight = getHighlightMetric(alert);
  const trend = getTrend(alert);

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
        className="card card-link group relative flex h-full cursor-pointer flex-col overflow-hidden"
      >
        {/* Severity colour runs down the left edge, so a list can be scanned by colour alone */}
        <span className={cn("absolute inset-y-0 left-0 w-1.5", SEVERITY_BAR[alert.severity])} aria-hidden />

        <div className="flex flex-1 flex-col gap-3 p-5 pl-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
              <SeverityBadge severity={alert.severity} />
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted">
                <HazardGlyph hazard={alert.hazard} width={15} height={15} className="shrink-0" />
                {th(`${alert.hazard}.name`)}
              </span>
            </div>
            <span className="shrink-0 text-sm text-faint" suppressHydrationWarning>
              {timeAgo(alert.issuedAt, locale)}
            </span>
          </div>

          <div className="space-y-1">
            <h3
              className={cn(
                "text-lg font-bold leading-snug break-words group-hover:text-brand",
                locale === "ne" ? "tracking-normal" : "tracking-tight",
              )}
            >
              {title}
            </h3>
            {place ? (
              <p className="flex items-start gap-1.5 text-base text-muted break-words">
                <MapPinIcon width={16} height={16} className="mt-1 shrink-0 text-faint" />
                <span>{place}</span>
              </p>
            ) : null}
          </div>

          {highlight || trend ? (
            <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              {highlight ? (
                <div className="flex items-baseline gap-1.5">
                  <dt className="text-sm text-muted">{tr(highlight.label)}</dt>
                  <dd className="tabular text-lg font-bold">{highlight.value}</dd>
                </div>
              ) : null}
              {trend ? (
                <div className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{tr("trend")}</dt>
                  <dd
                    className={cn(
                      "text-base font-semibold",
                      trend === "rising" ? "text-danger" : trend === "falling" ? "text-advisory" : "text-muted",
                    )}
                  >
                    <span aria-hidden>{trend === "rising" ? "↑ " : trend === "falling" ? "↓ " : "→ "}</span>
                    {tr(trend)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 pl-6 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-muted" title={tst(`${STATUS_KEY[alert.source.status]}.desc`)}>
            <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[alert.source.status])} aria-hidden />
            <span className="truncate">
              {alert.source.name}
              <span className="sr-only">, {tst(`${STATUS_KEY[alert.source.status]}.label`)}</span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand">
            {ta("viewDetails")}
            <ArrowIcon width={13} height={13} />
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

