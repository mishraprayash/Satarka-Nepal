import { Suspense } from "react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SectionHeader } from "@/components/section";
import { HazardMap } from "@/components/hazard-map";
import { loadMapData } from "@/lib/map-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "map" });
  return { title: t("title") };
}

export default async function MapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, initialMapData] = await Promise.all([
    getTranslations("map"),
    loadMapData(),
  ]);

  return (
    <div className="shell space-y-8 py-10 sm:py-14">
      <SectionHeader title={t("title")} sub={t("subtitle")} />
      <Suspense fallback={<div className="h-[70vh] min-h-[460px] animate-pulse rounded-card bg-surface-2" />}>
        <HazardMap initialData={initialMapData} />
      </Suspense>
    </div>
  );
}

