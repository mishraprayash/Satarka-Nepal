import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/section";
import { LiveSummary } from "@/components/live-summary";
import { AreaCheck } from "@/components/area-check";
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

  const quick = [
    { href: "/alerts", title: t("quick.alerts"), hint: t("quick.alertsHint"), icon: "🔔" },
    { href: "/map", title: t("quick.map"), hint: t("quick.mapHint"), icon: "🗺️" },
    { href: "/learn", title: t("quick.learn"), hint: t("quick.learnHint"), icon: "📘" },
    { href: "/report", title: t("quick.report"), hint: t("quick.reportHint"), icon: "📣" },
  ];

  return (
    <>
      <EmergencyBanner initialData={initialAlerts} />

      {/* Step 1 — one question, one answer: is it safe where I live? */}
      <section className="border-b border-border bg-gradient-to-b from-surface to-bg py-10 sm:py-14">
        <div className="shell grid items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div className="max-w-xl lg:pt-4">
            <h1 className="text-3xl font-extrabold sm:text-4xl lg:text-5xl">{t("title")}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted sm:text-xl">{t("body")}</p>
          </div>
          <AreaCheck initialData={initialAlerts} />
        </div>
      </section>

      <div className="shell space-y-14 py-10 sm:space-y-20 sm:py-14">
        {/* Step 2 — four big, obvious things to do */}
        <section aria-label={t("statusTitle")}>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {quick.map((q) => (
              <li key={q.href}>
                <Link
                  href={q.href}
                  className="card flex h-full flex-col gap-2 p-5 transition-all hover:-translate-y-0.5 hover:border-brand sm:p-6"
                >
                  <span className="text-4xl" aria-hidden>
                    {q.icon}
                  </span>
                  <span className="text-lg font-bold sm:text-xl">{q.title}</span>
                  <span className="text-base text-muted">{q.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Step 3 — latest alerts across Nepal */}
        <section>
          <SectionHeader title={t("statusTitle")} sub={t("summarySub")} className="mb-6" />
          <LiveSummary initialData={initialAlerts} />
        </section>

        {/* Step 4 — preparedness, in plain language */}
        <section>
          <SectionHeader title={t("prepareTitle")} sub={t("prepareSub")} className="mb-6" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HAZARD_ORDER.map((h) => (
              <li key={h}>
                <Link
                  href={`/learn/${h}`}
                  className="card group flex h-full flex-col justify-between gap-4 p-6 transition-all hover:-translate-y-0.5 hover:border-brand"
                >
                  <div className="space-y-3">
                    <span className="inline-flex size-12 items-center justify-center rounded-chip bg-brand-soft text-brand" aria-hidden>
                      <HazardGlyph hazard={h} width={26} height={26} />
                    </span>
                    <div>
                      <h3 className="text-xl font-bold">{th(`${h}.name`)}</h3>
                      <p className="mt-1 text-base leading-relaxed text-muted">{th(`${h}.short`)}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-base font-semibold text-brand">
                    {ta("learnMore")}
                    <ArrowIcon width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
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
