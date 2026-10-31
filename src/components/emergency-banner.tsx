"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { localizeDigits } from "@/lib/format";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useAlerts } from "@/lib/use-alerts";
import { nationalLevel } from "@/lib/national-level";
import { ArrowIcon, SeverityGlyph } from "@/components/icons";

/**
 * Site-wide band under the header, shown only while a warning or danger alert
 * is active, so a serious situation is visible from every page. Quiet days
 * show nothing here; the home page carries the full status.
 */
export function EmergencyBanner() {
  const tb = useTranslations("emergencyBanner");
  const t = useTranslations("levels");
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const { response } = useAlerts(120_000);

  const { level, count } = nationalLevel(response?.alerts ?? []);
  if (level !== "danger" && level !== "warning") return null;
  // The home page and the alerts list already lead with this information.
  if (pathname === "/" || pathname === "/alerts") return null;

  const isDanger = level === "danger";

  return (
    <aside
      role={isDanger ? "alert" : "status"}
      aria-live={isDanger ? "assertive" : "polite"}
      className={cn(
        isDanger ? "bg-danger-solid text-danger-on" : "bg-warning-solid text-warning-on",
      )}
    >
      <div className="shell flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
        <p className="flex min-w-0 items-center gap-2.5 font-semibold">
          <SeverityGlyph severity={level} width={20} height={20} className="shrink-0" />
          <span>{tb(`${level}.title`, { count, shown: localizeDigits(count, locale) })}</span>
        </p>
        <Link
          href="/alerts"
          className="inline-flex shrink-0 items-center gap-1.5 font-bold underline underline-offset-4"
        >
          {t("bandMore")}
          <ArrowIcon width={14} height={14} />
        </Link>
      </div>
    </aside>
  );
}
