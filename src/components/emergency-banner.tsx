"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useAlerts } from "@/lib/use-alerts";
import { ArrowIcon, SeverityGlyph } from "@/components/icons";
import type { AlertsResponse } from "@/lib/types";

export function EmergencyBanner({ initialData }: { initialData?: AlertsResponse }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("home");
  const ta = useTranslations("alerts");
  const { response } = useAlerts(120_000, initialData);

  const status = useMemo(() => {
    if (!response) return null;
    const alerts = response.alerts ?? [];
    const dangerCount = alerts.filter((a) => a.severity === "danger").length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;

    if (dangerCount > 0) {
      return {
        level: "danger" as const,
        title:
          locale === "ne"
            ? `⚠️ आपतकालीन चेतावनी: ${dangerCount} स्थानमा उच्च जोखिम अलर्ट सक्रिय छ`
            : `Critical Warning: ${dangerCount} life-threatening danger alert${dangerCount > 1 ? "s" : ""} active in Nepal`,
        sub:
          locale === "ne"
            ? "स्थानीय प्रशासन र बाढी पूर्वसूचनाको निर्देशन तत्काल पालना गर्नुहोस्।"
            : "Follow evacuation directives and warnings from local authorities immediately.",
        badge: locale === "ne" ? "आपतकालीन" : "CRITICAL",
        containerClass: "border-danger/50 bg-danger/10 text-danger",
        badgeClass: "bg-danger text-white animate-pulse",
      };
    }

    if (warningCount > 0) {
      return {
        level: "warning" as const,
        title:
          locale === "ne"
            ? `सतर्कता सूचना: ${warningCount} स्थानमा जलसतह वा विपद् जोखिम चेतावनी जारी`
            : `Active Advisory: ${warningCount} hazard warning${warningCount > 1 ? "s" : ""} active across monitored basins`,
        sub:
          locale === "ne"
            ? "जोखिम क्षेत्रका नागरिकहरू सुरक्षित स्थानमा सतर्क रहनुहोस्।"
            : "Residents in floodplains and steep slopes should exercise heightened vigilance.",
        badge: locale === "ne" ? "सतर्कता" : "WARNING",
        containerClass: "border-warning/50 bg-warning/10 text-warning",
        badgeClass: "bg-warning text-white",
      };
    }

    return {
      level: "normal" as const,
      title:
        locale === "ne"
          ? "सबै प्रत्यक्ष फिडहरू सामान्य: हाल कुनै पनि नदीमा खतराको तह पार भएको छैन"
          : "All monitored hydrological stations & feeds operating within safe thresholds",
      sub:
        locale === "ne"
          ? "मौसम र नदीको बहाव निरन्तर निगरानीमा छ।"
          : "Real-time feeds from DHM, NDRRMA, and USGS are continuously monitored.",
      badge: locale === "ne" ? "सामान्य" : "NORMAL",
      containerClass: "border-border bg-surface-2/60 text-muted",
      badgeClass: "bg-advisory-soft text-advisory border border-advisory/30",
    };
  }, [response, locale]);

  if (!status) return null;

  return (
    <aside
      role="alert"
      className={cn(
        "border-b transition-colors px-4 py-2.5 sm:py-3",
        status.containerClass,
      )}
    >
      <div className="shell flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0" aria-hidden="true">
            <SeverityGlyph
              severity={
                status.level === "danger"
                  ? "danger"
                  : status.level === "warning"
                    ? "warning"
                    : "advisory"
              }
              width={18}
              height={18}
            />
          </span>
          <span
            className={cn(
              "rounded-chip px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0",
              status.badgeClass,
            )}
          >
            {status.badge}
          </span>
          <div className="min-w-0">
            <p className="font-semibold leading-snug text-text truncate">
              {status.title}
            </p>
            <p className="hidden md:block text-xs text-muted leading-tight mt-0.5">
              {status.sub}
            </p>
          </div>
        </div>

        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline shrink-0 text-xs sm:text-sm self-end sm:self-auto cursor-pointer"
        >
          <span>{ta("title")}</span>
          <ArrowIcon width={12} height={12} />
        </Link>
      </div>
    </aside>
  );
}
