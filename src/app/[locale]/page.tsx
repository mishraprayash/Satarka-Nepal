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



      {/* Hero — the thesis, framed by the topographic-contour signature and the
          bilingual सतर्क / Satarka wordmark that states the mission in both scripts. */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface/50 to-bg">
        <div className="contour-field decor absolute inset-0 -z-10 opacity-70" aria-hidden />
        <div className="shell py-10 sm:py-16 lg:py-20">
          <div className="grid items-center gap-8 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                <span className="eyebrow !text-text">{t("eyebrow")}</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t("title")}
              </h1>
              <p className="mt-4 max-w-xl text-base sm:text-lg leading-relaxed text-muted">{t("body")}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href="/alerts"
                  className="inline-flex items-center gap-2 rounded-chip bg-brand px-5 py-2.5 font-semibold text-brand-fg transition-all hover:bg-brand-strong active:scale-95 shadow-xs"
                >
                  <span>{t("ctaAlerts")}</span>
                  <ArrowIcon width={16} height={16} />
                </Link>
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 rounded-chip border border-border-strong bg-surface px-5 py-2.5 font-semibold text-text transition-all hover:bg-surface-2 active:scale-95 shadow-xs"
                >
                  <span>{ta("openMap")}</span>
                </Link>
              </div>

              <p className="mt-6 flex max-w-lg items-start gap-2.5 rounded-xl border border-border/80 bg-surface/70 p-3 text-xs text-muted">
                <span className="mt-0.5 shrink-0 text-watch" aria-hidden>
                  <SeverityGlyph severity="info" width={15} height={15} />
                </span>
                <span>{t("disclaimer")}</span>
              </p>
            </div>

            {/* Bilingual wordmark as graphic — the Devanagari↔Latin pairing, decorative. */}
            <div
              className="decor relative hidden select-none justify-self-end lg:block"
              aria-hidden
            >
              <span
                lang="ne"
                className="block font-deva text-[8rem] font-bold leading-none text-brand/20 select-none"
              >
                सतर्क
              </span>
              <span className="eyebrow mt-2 block text-right !text-sm tracking-[0.3em] text-brand/50">
                Satarka
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="shell space-y-16 py-14 sm:py-16">
        {/* Near-you alerts — most prominent, at the very top */}
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
                  className="card group flex h-full flex-col gap-3 p-5 transition-colors hover:border-border-strong"
                >
                  <span className="text-brand" aria-hidden>
                    <HazardGlyph hazard={h} width={26} height={26} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{th(`${h}.name`)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{th(`${h}.short`)}</p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-brand">
                    {ta("learnMore")}
                    <ArrowIcon
                      width={14}
                      height={14}
                      className="transition-transform group-hover:translate-x-0.5"
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

        {/* Map + Learn teasers (Alerts + Prepare are the hero CTAs) */}
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
      className="card group relative flex flex-col gap-2 overflow-hidden p-6 transition-colors hover:border-border-strong"
    >
      <div className="contour-field decor absolute inset-0 -z-10 opacity-40" aria-hidden />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted">{body}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
        {cta}
        <ArrowIcon
          width={14}
          height={14}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  );
}
