"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAlerts } from "@/lib/use-alerts";
import { ArrowIcon, SeverityGlyph } from "@/components/icons";
import type { AlertsResponse } from "@/lib/types";

export function EmergencyBanner({ initialData }: { initialData?: AlertsResponse }) {
  const ta = useTranslations("alerts");
  const tb = useTranslations("emergencyBanner");
  const { response } = useAlerts(120_000, initialData);

  const status = useMemo(() => {
    if (!response) return null;
    const alerts = response.alerts ?? [];
    const dangerCount = alerts.filter((a) => a.severity === "danger").length;
    const warningCount = alerts.filter((a) => a.severity === "warning").length;

    if (dangerCount > 0) {
      return {
        level: "danger" as const,
        title: tb("danger.title", { count: dangerCount }),
        sub: tb("danger.sub"),
        badge: tb("danger.badge"),
        containerClass: "border-b border-danger/30 bg-danger/10 text-danger backdrop-blur-sm",
        badgeClass: "bg-danger text-white font-semibold",
      };
    }

    if (warningCount > 0) {
      return {
        level: "warning" as const,
        title: tb("warning.title", { count: warningCount }),
        sub: tb("warning.sub"),
        badge: tb("warning.badge"),
        containerClass: "border-b border-warning/30 bg-warning/10 text-warning backdrop-blur-sm",
        badgeClass: "bg-warning text-white font-semibold",
      };
    }

    return {
      level: "normal" as const,
      title: tb("normal.title"),
      sub: tb("normal.sub"),
      badge: tb("normal.badge"),
      containerClass: "border-b border-border/40 bg-surface-2/40 text-muted",
      badgeClass: "bg-advisory-soft text-advisory border border-advisory/30 font-semibold",
    };
  }, [response, tb]);

  if (!status) return null;

  const isDanger = status.level === "danger";

  return (
    <aside
      role={isDanger ? "alert" : "status"}
      aria-live={isDanger ? "assertive" : "polite"}
      className={cn(
        "transition-colors px-4 py-2.5",
        status.containerClass,
      )}
    >
      <div className="shell flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs sm:text-sm">
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
              width={16}
              height={16}
            />
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider shrink-0",
              status.badgeClass,
            )}
          >
            {status.badge}
          </span>
          <div className="min-w-0 flex items-baseline gap-2">
            <p className="font-semibold text-text truncate">
              {status.title}
            </p>
            <p className="hidden md:inline text-xs text-muted truncate">
              {status.sub}
            </p>
          </div>
        </div>

        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline shrink-0 text-xs sm:text-sm self-end sm:self-auto cursor-pointer transition-colors"
        >
          <span>{ta("title")}</span>
          <ArrowIcon width={12} height={12} />
        </Link>
      </div>
    </aside>
  );
}
