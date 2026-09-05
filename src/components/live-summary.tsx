"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Alert, AlertsResponse, HazardType, Severity } from "@/lib/types";
import { SEVERITY_RANK } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { HAZARD_ORDER, SEVERITY_BAR } from "@/lib/ui";
import { useAlerts } from "@/lib/use-alerts";
import { AlertCard } from "@/components/alert-card";
import { HazardGlyph } from "@/components/icons";
import { Link } from "@/i18n/navigation";

const TOP_N = 3;

function maxSeverity(items: Alert[]): Severity | null {
  let top: Severity | null = null;
  for (const a of items) {
    if (!top || SEVERITY_RANK[a.severity] > SEVERITY_RANK[top]) top = a.severity;
  }
  return top;
}

/** Compact by-hazard tally: glyph, name, count, and the worst severity present. */
function HazardTally({ alerts }: { alerts: Alert[] }) {
  const th = useTranslations("hazards");
  const tc = useTranslations("common");
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {HAZARD_ORDER.map((h: HazardType) => {
        const items = alerts.filter((a) => a.hazard === h);
        const worst = maxSeverity(items);
        const active = items.length > 0;
        return (
          <li key={h}>
            <Link
              href={`/alerts?hazard=${h}`}
              className={cn(
                "card group flex items-center gap-3 p-3.5 transition-all hover:border-brand hover:shadow-xs cursor-pointer active:scale-98",
                active ? "border-border-strong bg-surface" : "opacity-75 bg-surface/60",
              )}
            >
              <span className={cn("text-muted transition-colors group-hover:text-brand", active && "text-brand")} aria-hidden>
                <HazardGlyph hazard={h} width={22} height={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-muted group-hover:text-text transition-colors">
                  {th(`${h}.name`)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="tabular text-lg font-bold leading-none text-text">{items.length}</span>
                  {worst ? (
                    <span
                      className={cn("size-2 rounded-full", SEVERITY_BAR[worst])}
                      aria-hidden
                    />
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
      <li className="sr-only">{tc("official")}</li>
    </ul>
  );
}

export function LiveSummary({ initialData }: { initialData?: AlertsResponse }) {
  const locale = useLocale() as Locale;
  const { response, fromCache, cachedAt, isLoading, isError, refetch } = useAlerts(120_000, initialData);
  const tc = useTranslations("common");
  const ta = useTranslations("alerts");
  const th = useTranslations("home");
  const to = useTranslations("offline");
  const tact = useTranslations("actions");

  if (isLoading) {
    return (
      <div className="card grid place-items-center p-10 text-sm text-muted" aria-busy>
        {tc("loading")}
      </div>
    );
  }

  if (isError || !response) {
    return (
      <div className="card flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-muted">{tc("error")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
        >
          {tact("retry")}
        </button>
      </div>
    );
  }

  const alerts = response.alerts;
  const top = alerts.slice(0, TOP_N);
  const okCount = response.sources.filter((s) => s.ok).length;
  const total = response.sources.length;

  return (
    <div className="flex flex-col gap-5">
      {fromCache ? (
        <p
          role="status"
          className="rounded-card border border-watch/40 bg-watch-soft px-4 py-2.5 text-sm text-watch"
        >
          {to("banner", { time: timeAgo(new Date(cachedAt ?? Date.now()).toISOString(), locale) })}
        </p>
      ) : null}

      <HazardTally alerts={alerts} />

      {top.length > 0 ? (
        <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
          {top.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      ) : (
        <div className="card border-dashed p-6">
          <p className="text-sm font-medium">{ta("empty")}</p>
          <p className="mt-1 text-sm text-muted">{ta("emptyNote")}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-faint">
        <span className="tabular">
          {tc("updatedAgo", { time: timeAgo(response.generatedAt, locale) })} ·{" "}
          {th("reachable", { ok: okCount, total })}
        </span>
        <Link
          href="/alerts"
          className="inline-flex items-center gap-1 font-medium text-brand hover:text-brand-strong"
        >
          {ta("title")}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
