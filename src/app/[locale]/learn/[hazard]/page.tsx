import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HAZARD_TYPES, type HazardType } from "@/lib/types";
import { HAZARD_ORDER } from "@/lib/ui";
import { cn } from "@/lib/cn";
import { LearnGuide } from "@/components/learn-guide";
import { ArrowIcon, HazardGlyph } from "@/components/icons";

export function generateStaticParams() {
  return HAZARD_TYPES.map((hazard) => ({ hazard }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; hazard: string }>;
}) {
  const { locale, hazard } = await params;
  const normalizedHazard = (hazard?.toLowerCase()?.trim() || "") as HazardType;
  if (!HAZARD_TYPES.includes(normalizedHazard)) {
    return {
      title: locale === "ne" ? "पृष्ठ फेला परेन · सतर्क" : "Page Not Found · Satarka",
    };
  }
  const th = await getTranslations({ locale, namespace: "hazards" });
  return { title: th(`${normalizedHazard}.name`) };
}

export default async function HazardGuidePage({
  params,
}: {
  params: Promise<{ locale: string; hazard: string }>;
}) {
  const { locale, hazard } = await params;
  setRequestLocale(locale);
  const normalizedHazard = (hazard?.toLowerCase()?.trim() || "") as HazardType;
  if (!HAZARD_TYPES.includes(normalizedHazard)) {
    notFound();
  }

  const t = await getTranslations("learn");
  const th = await getTranslations("hazards");

  return (
    <div className="shell space-y-6 py-10 sm:py-14">
      {/* Accessible semantic breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-text transition-colors">
          {locale === "ne" ? "गृह" : "Home"}
        </Link>
        <span>/</span>
        <Link href="/learn" className="hover:text-text transition-colors">
          {t("title")}
        </Link>
        <span>/</span>
        <span className="text-text font-medium truncate max-w-[200px] sm:max-w-xs">
          {th(`${normalizedHazard}.name`)}
        </span>
      </nav>

      {/* Hazard Quick-Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 rounded-chip border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:border-brand hover:text-text transition-colors"
          >
            <ArrowIcon width={12} height={12} className="rotate-180" />
            <span>{t("allHazards")}</span>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" aria-hidden />
          {HAZARD_ORDER.map((h) => {
            const isActive = h === normalizedHazard;
            return (
              <Link
                key={h}
                href={`/learn/${h}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-xs font-semibold transition-all",
                  isActive
                    ? "border-brand bg-brand text-brand-fg shadow-xs"
                    : "border-border text-muted hover:bg-surface-2 hover:text-text",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <HazardGlyph hazard={h} width={13} height={13} />
                <span>{th(`${h}.name`)}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <LearnGuide hazard={normalizedHazard} locale={locale} />
    </div>
  );
}
