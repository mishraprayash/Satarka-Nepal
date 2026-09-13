import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadAllAlerts } from "@/lib/sources";
import type { Alert } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { formatDateTime, timeAgo, formatNumber } from "@/lib/format";
import { SEVERITY_CHIP, SEVERITY_TEXT } from "@/lib/ui";
import { SeverityBadge, StatusBadge, HazardChip } from "@/components/badges";
import {
  HazardGlyph,
  MapPinIcon,
  PhoneIcon,
  ExternalIcon,
  ArrowIcon,
} from "@/components/icons";
import { AlertMiniMap } from "@/components/alert-mini-map";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const data = await loadAllAlerts();
  const alert = data.alerts.find((a) => a.id === id || a.id === decodeURIComponent(id));

  if (!alert) {
    return { title: "Alert Not Found — Satarka" };
  }

  const title = locale === "ne" ? alert.title.ne || alert.title.en : alert.title.en;
  return {
    title: `${title} | Satarka Nepal`,
    description: alert.description?.en || "Official disaster hazard alert for Nepal.",
    openGraph: {
      title: `${title} | Satarka Nepal`,
      description: alert.description?.en || "Official disaster hazard alert for Nepal.",
    },
  };
}

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [t, th, tc, data] = await Promise.all([
    getTranslations("alerts"),
    getTranslations("hazards"),
    getTranslations("common"),
    loadAllAlerts(),
  ]);

  const alert = data.alerts.find((a) => a.id === id || a.id === decodeURIComponent(id));

  if (!alert) {
    return (
      <div className="shell py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-text">
          {locale === "ne" ? "चेतावनी फेला परेन वा निष्क्रिय भइसकेको छ" : "Alert Not Found or Expired"}
        </h1>
        <p className="text-sm text-muted max-w-md mx-auto">
          {locale === "ne"
            ? "यो चेतावनी पुरानो भइसकेको वा हटाइएको हुन सक्छ। कृपया प्रत्यक्ष चेतावनी सूची हेर्नुहोस्।"
            : "This hazard alert may have expired, cleared, or been superseded. Please check the active alerts feed."}
        </p>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-2 rounded-chip bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg hover:bg-brand-strong transition-all"
        >
          <ArrowIcon width={14} height={14} className="rotate-180" />
          <span>{locale === "ne" ? "प्रत्यक्ष चेतावनीमा फर्कनुहोस्" : "Back to Live Alerts"}</span>
        </Link>
      </div>
    );
  }

  const title = locale === "ne" ? alert.title.ne || alert.title.en : alert.title.en;
  const description = locale === "ne" ? alert.description?.ne || alert.description?.en : alert.description?.en;
  const place =
    alert.location?.name ??
    alert.location?.district ??
    (alert.location?.basin ? `${alert.location.basin} basin` : undefined);

  const hasCoords =
    alert.location?.lat != null &&
    alert.location?.lng != null &&
    !Number.isNaN(alert.location.lat) &&
    !Number.isNaN(alert.location.lng);

  const detailUrl =
    (typeof alert.meta?.detailUrl === "string" && alert.meta.detailUrl) || alert.source.url;

  return (
    <div className="shell max-w-3xl py-10 sm:py-14 space-y-8">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-text">
          {locale === "ne" ? "गृह" : "Home"}
        </Link>
        <span>/</span>
        <Link href="/alerts" className="hover:text-text">
          {locale === "ne" ? "चेतावनीहरू" : "Alerts"}
        </Link>
        <span>/</span>
        <span className="text-text font-medium truncate max-w-[200px] sm:max-w-xs">{title}</span>
      </nav>

      {/* Main Alert Card */}
      <article className="card p-6 sm:p-8 space-y-6 border-t-4 border-t-brand shadow-card">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HazardChip hazard={alert.hazard} />
            <SeverityBadge severity={alert.severity} />
          </div>
          <span className="text-xs text-faint tabular" suppressHydrationWarning>
            {timeAgo(alert.issuedAt, locale as Locale)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text leading-snug">
          {title}
        </h1>

        {/* Location banner */}
        {place && (
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface-2/50 px-3.5 py-2.5 text-xs text-muted">
            <MapPinIcon width={16} height={16} className="text-brand shrink-0" />
            <span className="font-medium text-text">{place}</span>
            {alert.location?.district && alert.location.district !== place && (
              <span>· {alert.location.district}</span>
            )}
            {alert.location?.basin && <span>· {alert.location.basin} basin</span>}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="text-base sm:text-lg leading-relaxed text-text">
            {description}
          </p>
        )}

        {/* Map Preview if coordinates present */}
        {hasCoords && (
          <div className="space-y-2">
            <h2 className="eyebrow !text-xs text-muted">
              {locale === "ne" ? "घटना स्थान नक्सा" : "Event Location Coordinates"}
            </h2>
            <div className="overflow-hidden rounded-card border border-border">
              <AlertMiniMap
                lat={alert.location!.lat!}
                lng={alert.location!.lng!}
                severity={alert.severity}
                title={title}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-muted pt-1">
              <span className="font-mono tabular">
                {alert.location!.lat!.toFixed(4)}°N, {alert.location!.lng!.toFixed(4)}°E
              </span>
              <Link
                href={`/map?lat=${alert.location!.lat}&lng=${alert.location!.lng}&zoom=12&title=${encodeURIComponent(title)}`}
                className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-strong"
              >
                <span>{locale === "ne" ? "पूर्ण नक्सामा खोल्नुहोस्" : "Open in Full Interactive Map"}</span>
                <ArrowIcon width={13} height={13} />
              </Link>
            </div>
          </div>
        )}

        {/* Meta / Readouts block */}
        {alert.meta && Object.keys(alert.meta).length > 0 && (
          <div className="rounded-xl border border-border/80 bg-surface-2/40 p-4 space-y-2">
            <h2 className="eyebrow !text-xs text-muted">
              {locale === "ne" ? "मापन विवरण तथा प्राविधिक डेटा" : "Telemetry Readouts & Meta"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
              {typeof alert.meta.waterLevel === "number" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "जलस्तर" : "Water Level"}</span>
                  <span className="font-bold tabular text-sm">{alert.meta.waterLevel} m</span>
                </div>
              )}
              {typeof alert.meta.warningLevel === "number" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "चेतावनी स्तर" : "Warning Level"}</span>
                  <span className="font-bold tabular text-sm">{alert.meta.warningLevel} m</span>
                </div>
              )}
              {typeof alert.meta.dangerLevel === "number" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "खतरा स्तर" : "Danger Level"}</span>
                  <span className="font-bold tabular text-sm text-danger">{alert.meta.dangerLevel} m</span>
                </div>
              )}
              {typeof alert.meta.rainfall === "number" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "वर्षा" : "Rainfall (24h)"}</span>
                  <span className="font-bold tabular text-sm">{alert.meta.rainfall} mm</span>
                </div>
              )}
              {typeof alert.meta.magnitude === "number" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "तीव्रता" : "Magnitude"}</span>
                  <span className="font-bold tabular text-sm">M {alert.meta.magnitude}</span>
                </div>
              )}
              {typeof alert.meta.depthKm === "number" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "गहिराइ" : "Depth"}</span>
                  <span className="font-bold tabular text-sm">{alert.meta.depthKm} km</span>
                </div>
              )}
              {typeof alert.meta.trend === "string" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "प्रवृत्ति" : "Trend"}</span>
                  <span className="font-semibold">{alert.meta.trend}</span>
                </div>
              )}
              {typeof alert.meta.repairEta === "string" && (
                <div>
                  <span className="text-muted block">{locale === "ne" ? "खुल्ने समय" : "Clearance ETA"}</span>
                  <span className="font-semibold text-warning">{alert.meta.repairEta}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Safety Guide Deep Link */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-brand/30 bg-brand/5 p-4">
          <div>
            <h3 className="text-sm font-semibold text-text">
              {locale === "ne"
                ? `${th(`${alert.hazard}.name`)} सुरक्षा मार्गदर्शन पढ्नुहोस्`
                : `Preparedness Guide: ${th(`${alert.hazard}.name`)}`}
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {locale === "ne"
                ? "जोखिमको समयमा तत्काल के गर्ने र के नगर्ने"
                : "Actionable steps to take before, during, and after this hazard."}
            </p>
          </div>
          <Link
            href={`/learn/${alert.hazard}`}
            className="inline-flex items-center gap-1.5 rounded-chip bg-brand px-3.5 py-2 text-xs font-semibold text-brand-fg hover:bg-brand-strong transition-all shrink-0"
          >
            <span>{locale === "ne" ? "मार्गदर्शन" : "Read Guide"}</span>
            <ArrowIcon width={13} height={13} />
          </Link>
        </div>

        {/* Provenance and Official Source footer */}
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text">{alert.source.name}</span>
            <span>·</span>
            <StatusBadge status={alert.source.status} />
            <span>·</span>
            <span>{formatDateTime(alert.issuedAt, locale as Locale)}</span>
          </div>

          <a
            href={detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-strong"
          >
            <span>{locale === "ne" ? "मूल सरकारी स्रोत" : "Official Source"}</span>
            <ExternalIcon width={13} height={13} />
          </a>
        </div>
      </article>
    </div>
  );
}
