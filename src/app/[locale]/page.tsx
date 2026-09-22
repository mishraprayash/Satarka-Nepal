import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/section";
import { LiveSummary } from "@/components/live-summary";
import { NearYou } from "@/components/near-you";
import { ReportsList } from "@/components/reports-list";
import { HazardGlyph, SeverityGlyph, ArrowIcon } from "@/components/icons";
import { HAZARD_ORDER } from "@/lib/ui";
import { EmergencyBanner } from "@/components/emergency-banner";
import { loadAllAlerts, loadReports, RELIEFWEB_PUBLIC_URL } from "@/lib/sources";
import type { ReportsResponse } from "@/lib/types";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, th, ta, initialAlerts, reportItems] = await Promise.all([
    getTranslations("home"),
    getTranslations("hazards"),
    getTranslations("actions"),
    loadAllAlerts(),
    loadReports(),
  ]);

  const initialReports: ReportsResponse = {
    generatedAt: new Date().toISOString(),
    status: "report-only",
    source: { name: "ReliefWeb (UN OCHA)", url: RELIEFWEB_PUBLIC_URL },
    reports: reportItems,
    ok: true,
  };

  return (
    <>
      {/* Situational Emergency Ribbon */}
      <EmergencyBanner initialData={initialAlerts} />



      {/* Hero — Simple. Calm. Precise. Premium. Intentional. */}
      <section className="relative border-b border-border/60 bg-gradient-to-b from-surface/60 via-bg to-bg py-12 sm:py-16 lg:py-20">
        <div className="shell">
          <div className="max-w-3xl">
            {/* Live Operational Status Tag */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface px-3 py-1 text-xs shadow-2xs">
              <span className="size-2 rounded-full bg-advisory animate-pulse" aria-hidden />
              <span className="font-semibold text-text">{t("eyebrow")}</span>
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-text leading-[1.12]">
              {t("title")}
            </h1>

            <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-muted">
              {t("body")}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/alerts"
                className="inline-flex items-center gap-2 rounded-chip bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition-all hover:bg-brand-strong active:scale-98 shadow-sm"
              >
                <span>{t("ctaAlerts")}</span>
                <ArrowIcon width={16} height={16} />
              </Link>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-chip border border-border/80 bg-surface px-5 py-2.5 text-sm font-semibold text-text transition-all hover:bg-surface-2 hover:border-border-strong active:scale-98 shadow-2xs"
              >
                <span>{ta("openMap")}</span>
              </Link>
            </div>

            {/* Quiet official disclaimer */}
            <div className="mt-7 flex items-center gap-2 text-xs text-faint">
              <SeverityGlyph severity="info" width={14} height={14} className="shrink-0 text-muted" />
              <span>{t("disclaimer")}</span>
            </div>
          </div>

          {/* Operational Pulse Bar — Live Telemetry at a glance */}
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 pt-8 border-t border-border/60">
            <div className="card p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("stats.activeThreats")}</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular text-text">
                  {initialAlerts.alerts.filter((a) => a.severity === "danger" || a.severity === "warning").length}
                </span>
                <span className="text-xs text-muted">{t("stats.dangerWarning")}</span>
              </div>
            </div>

            <div className="card p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("stats.telemetryGauges")}</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular text-text">
                  {initialAlerts.alerts.filter((a) => a.hazard === "flood" || a.hazard === "glof").length}
                </span>
                <span className="text-xs text-muted">{t("stats.riverStations")}</span>
              </div>
            </div>

            <div className="card p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("stats.seismicStorm")}</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular text-text">
                  {initialAlerts.alerts.filter((a) => a.hazard === "earthquake" || a.hazard === "landslide").length}
                </span>
                <span className="text-xs text-muted">{t("stats.trackedEvents")}</span>
              </div>
            </div>

            <div className="card p-4 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("stats.dataSources")}</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular text-brand">
                  {initialAlerts.sources.filter((s) => s.ok).length} / {initialAlerts.sources.length}
                </span>
                <span className="text-xs text-muted">{t("stats.operational")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="shell space-y-16 py-12 sm:py-16">
        {/* Near-you alerts — most prominent contextual module */}
        <NearYou initialData={initialAlerts} />

        {/* Live dashboard summary */}
        <section>
          <SectionHeader
            title={t("summaryTitle")}
            sub={t("summarySub")}
            className="mb-6"
          />
          <LiveSummary initialData={initialAlerts} />
        </section>

        {/* By hazard type → education deep-links */}
        <section>
          <SectionHeader title={t("byHazardTitle")} className="mb-6" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HAZARD_ORDER.map((h) => (
              <li key={h}>
                <Link
                  href={`/learn/${h}`}
                  className="card group flex h-full flex-col justify-between gap-4 p-5 transition-all duration-200 hover:border-border-strong hover:shadow-md hover:-translate-y-0.5 active:scale-98"
                >
                  <div className="space-y-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-chip bg-surface-2 text-brand group-hover:bg-brand group-hover:text-brand-fg transition-colors" aria-hidden>
                      <HazardGlyph hazard={h} width={22} height={22} />
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-text group-hover:text-brand transition-colors">{th(`${h}.name`)}</h3>
                      <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted">{th(`${h}.short`)}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                    {ta("learnMore")}
                    <ArrowIcon
                      width={12}
                      height={12}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Latest situation reports — background, not active warnings */}
        <section>
          <SectionHeader
            title={t("reportsTitle")}
            sub={t("reportsSub")}
            className="mb-6"
          />
          <ReportsList initialData={initialReports} />
        </section>

        {/* Map + Learn teasers */}
        <section className="grid gap-4 md:grid-cols-2">
          <TeaserCard
            href="/map"
            title={t("mapTeaserTitle")}
            body={t("mapTeaserBody")}
            cta={ta("openMap")}
          />
          <TeaserCard
            href="/learn"
            title={t("learnTeaserTitle")}
            body={t("learnTeaserBody")}
            cta={ta("learnMore")}
          />
        </section>
      </div>
    </>
  );
}

function TeaserCard({
  href,
  title,
  body,
  cta,
}: {
  href: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="card group relative flex flex-col justify-between gap-3 overflow-hidden p-6 sm:p-7 transition-all duration-200 hover:border-border-strong hover:shadow-md hover:-translate-y-0.5 active:scale-98"
    >
      <div>
        <h3 className="text-lg font-bold text-text group-hover:text-brand transition-colors">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
        <span>{cta}</span>
        <ArrowIcon
          width={14}
          height={14}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
