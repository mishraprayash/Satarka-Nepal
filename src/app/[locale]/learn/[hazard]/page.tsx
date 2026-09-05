import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HAZARD_TYPES, type HazardType } from "@/lib/types";
import { LearnGuide } from "@/components/learn-guide";
import { ArrowIcon } from "@/components/icons";

export function generateStaticParams() {
  return HAZARD_TYPES.map((hazard) => ({ hazard }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; hazard: string }>;
}) {
  const { locale, hazard } = await params;
  const th = await getTranslations({ locale, namespace: "hazards" });
  if (!HAZARD_TYPES.includes(hazard as HazardType)) return { title: "Satarka" };
  return { title: th(`${hazard as HazardType}.name`) };
}

export default async function HazardGuidePage({
  params,
}: {
  params: Promise<{ locale: string; hazard: string }>;
}) {
  const { locale, hazard } = await params;
  setRequestLocale(locale);
  const hazardType = hazard as HazardType;
  if (!HAZARD_TYPES.includes(hazardType)) notFound();

  const t = await getTranslations("learn");
  const ta = await getTranslations("actions");

  return (
    <div className="shell space-y-6 py-10 sm:py-14">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1 rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowIcon width={14} height={14} className="rotate-180" />
          {ta("back")}
        </Link>
        <Link
          href="/learn"
          className="text-sm font-medium text-brand hover:text-brand-strong"
        >
          {t("allHazards")}
        </Link>
      </div>

      <LearnGuide hazard={hazardType} />
    </div>
  );
}
