import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/section";
import { LiveSummary } from "@/components/live-summary";
import { AreaCheck } from "@/components/area-check";
import { ReportsList } from "@/components/reports-list";
import { HazardGlyph, SeverityGlyph, ArrowIcon } from "@/components/icons";
import { HAZARD_ORDER } from "@/lib/ui";
import { StatusHero } from "@/components/status-hero";
import { loadReports, RELIEFWEB_PUBLIC_URL } from "@/lib/sources";
import { getAlerts } from "@/lib/alerts-service";
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
    getAlerts().then((r) => r.data),
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
      {/* First, the answer: how serious is it in Nepal right now, and is it safe where I live? */}
      <div className="border-b border-border bg-surface">
        <div className="shell grid items-start gap-10 py-10 sm:py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <StatusHero initialData={initialAlerts} />
          <AreaCheck initialData={initialAlerts} />
        </div>
      </div>

      <div className="shell space-y-16 py-12 sm:space-y-20 sm:py-16">
        {/* Then the detail: what is active, by hazard */}
        <section>
          <SectionHeader title={t("statusTitle")} sub={t("summarySub")} className="mb-6" />
          <LiveSummary initialData={initialAlerts} />
        </section>

        {/* Preparedness, in plain language */}
        <section>
          <SectionHeader title={t("prepareTitle")} sub={t("prepareSub")} className="mb-6" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HAZARD_ORDER.map((h) => (
              <li key={h}>
                <Link
                  href={`/learn/${h}`}
                  className="card card-link group flex h-full flex-col justify-between gap-4 p-5 sm:p-6"
                >
                  <div className="space-y-3">
                    <HazardGlyph hazard={h} width={28} height={28} className="text-brand" aria-hidden />
                    <div>
                      <h3 className="text-xl font-bold">{th(`${h}.name`)}</h3>
                      <p className="mt-1 text-base leading-relaxed text-muted">{th(`${h}.short`)}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-base font-semibold text-brand">
                    {ta("learnMore")}
                    <ArrowIcon width={16} height={16} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Background reading — clearly secondary */}
        <section>
          <SectionHeader title={t("moreTitle")} sub={t("reportsSub")} className="mb-6" />
          <ReportsList initialData={initialReports} />
        </section>

        <p className="flex items-start gap-2.5 text-base text-muted">
          <SeverityGlyph severity="info" width={20} height={20} className="mt-0.5 shrink-0" />
          <span>{t("disclaimer")}</span>
        </p>
      </div>
    </>
  );
}
