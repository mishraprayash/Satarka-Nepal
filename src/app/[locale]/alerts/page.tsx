import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/section";
import { AlertsView } from "@/components/alerts-view";
import { loadAllAlerts } from "@/lib/sources";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "alerts" });
  return { title: t("title") };
}

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, initialAlerts] = await Promise.all([
    getTranslations("alerts"),
    loadAllAlerts(),
  ]);

  return (
    <div className="shell space-y-8 py-10 sm:py-14">
      <SectionHeader title={t("title")} sub={t("subtitle")} />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-surface-2" />}>
        <AlertsView initialData={initialAlerts} />
      </Suspense>
    </div>
  );
}

