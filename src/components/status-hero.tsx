"use client";

import { useLocale, useTranslations } from "next-intl";
import type { AlertsResponse } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { localizeDigits, timeAgo } from "@/lib/format";
import { useAlerts } from "@/lib/use-alerts";
import { LEVELS, nationalLevel, type NationalLevel } from "@/lib/national-level";
import { Link } from "@/i18n/navigation";
import { SeverityGlyph } from "@/components/icons";

/** Solid fill per level; "clear" uses the advisory green. */
const LEVEL_BAR: Record<NationalLevel, string> = {
  clear: "bg-advisory-solid",
  watch: "bg-watch-solid",
  warning: "bg-warning-solid",
  danger: "bg-danger-solid",
};
const LEVEL_TEXT: Record<NationalLevel, string> = {
  clear: "text-advisory",
  watch: "text-watch",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * The home page answers one question first: how serious is it in Nepal right
 * now? The verdict is the headline, and the ladder shows where it sits on the
 * four-step warning scale.
 */
export function StatusHero({ initialData }: { initialData?: AlertsResponse }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("levels");
  const tb = useTranslations("emergencyBanner");
  const ts = useTranslations("severity");
  const { response } = useAlerts(120_000, initialData);

  const { level, count } = nationalLevel(response?.alerts ?? []);
  const shown = localizeDigits(count, locale);
  const verdict =
    level === "danger"
      ? { title: tb("danger.title", { count, shown }), sub: tb("danger.sub") }
      : level === "warning"
        ? { title: tb("warning.title", { count, shown }), sub: tb("warning.sub") }
        : level === "watch"
          ? { title: t("watchTitle", { count, shown }), sub: t("watchSub") }
          : { title: tb("normal.title"), sub: tb("normal.sub") };

  const levelName = (l: NationalLevel) => (l === "clear" ? t("clear") : ts(`${l}.label`));
  const ok = response?.sources.filter((s) => s.ok).length ?? 0;
  const total = response?.sources.length ?? 0;

  return (
    <section aria-labelledby="status-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 id="status-heading" className="text-lg font-semibold text-muted">
          {t("heading")}
        </h1>
        <p
          role={level === "danger" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-3 text-[2rem] font-extrabold leading-[1.15] sm:text-5xl",
            // Only warning and danger colour the words; calmer levels colour just the icon.
            level === "warning" || level === "danger" ? LEVEL_TEXT[level] : "text-text",
          )}
        >
          <SeverityGlyph
            severity={level === "clear" ? "advisory" : level}
            width={40}
            height={40}
            className={cn("mt-0.5 shrink-0 sm:mt-1.5", LEVEL_TEXT[level])}
          />
          <span>{verdict.title}</span>
        </p>
        <p className="max-w-xl text-lg text-muted sm:text-xl">{verdict.sub}</p>
      </div>

      {/* The ladder is a real sequence: each step is one level of the public scale. */}
      <div role="img" aria-label={t("ladderLabel", { level: levelName(level) })}>
        <ol className="grid grid-cols-4 gap-1.5" aria-hidden>
          {LEVELS.map((l) => {
            const current = l === level;
            return (
              <li key={l} className="flex flex-col gap-1.5">
                <span
                  className={cn(
                    "h-2.5 rounded-full",
                    current ? LEVEL_BAR[l] : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "text-sm",
                    current ? cn("font-bold", LEVEL_TEXT[l]) : "text-faint",
                  )}
                >
                  {levelName(l)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/alerts" className="btn btn-primary">
          {t("seeAlerts")}
        </Link>
        <Link href="/report" className="btn btn-secondary">
          {t("report")}
        </Link>
      </div>

      {response ? (
        <p className="text-sm text-faint" suppressHydrationWarning>
          {t("sources", {
            time: timeAgo(response.generatedAt, locale),
            ok: localizeDigits(ok, locale),
            total: localizeDigits(total, locale),
          })}
        </p>
      ) : null}
    </section>
  );
}
