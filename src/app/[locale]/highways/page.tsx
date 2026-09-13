import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/section";
import { HighwaysView } from "@/components/highways-view";
import { loadHighways } from "@/lib/sources/highway";
import type { HighwaysResponse } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "highways" });
  return { title: t("title") };
}

export default async function HighwaysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, highways] = await Promise.all([
    getTranslations("highways"),
    loadHighways(),
  ]);

  const blockedCount = highways.filter((h) => h.status === "BLOCKED").length;
  const partialCount = highways.filter((h) => h.status === "PARTIAL_OPEN").length;
  const openCount = highways.filter((h) => h.status === "OPEN").length;

  const initialData: HighwaysResponse = {
    generatedAt: new Date().toISOString(),
    highways,
    blockedCount,
    partialCount,
    openCount,
    ok: true,
  };

  return (
    <div className="shell space-y-8 py-10 sm:py-14">
      <SectionHeader title={t("title")} sub={t("subtitle")} />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-card bg-surface-2" />}>
        <HighwaysView initialData={initialData} />
      </Suspense>
    </div>
  );
}
