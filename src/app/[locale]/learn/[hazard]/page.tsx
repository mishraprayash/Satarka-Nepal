import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HAZARD_TYPES, type HazardType } from "@/lib/types";
import { HAZARD_ORDER } from "@/lib/ui";
import { cn } from "@/lib/cn";
import { LearnGuide } from "@/components/learn-guide";
import { HazardGlyph } from "@/components/icons";
import { TabScroller } from "@/components/tab-scroller";

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
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-base text-muted">
        <Link href="/" className="hover:text-text transition-colors">
          {locale === "ne" ? "गृह" : "Home"}
        </Link>
        <span>/</span>
        <Link href="/learn" className="truncate hover:text-text transition-colors">
          {t("title")}
        </Link>
        <span>/</span>
        <span className="text-text font-medium truncate max-w-[200px] sm:max-w-xs">
          {th(`${normalizedHazard}.name`)}
        </span>
      </nav>

      {/* Switch hazard like tabs; the breadcrumb already leads back to all guides.
          On phones the row scrolls sideways instead of wrapping onto several lines. */}
      <TabScroller label={t("title")} className="no-scrollbar -mx-5 overflow-x-auto border-b border-border px-5 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max gap-1">
          {HAZARD_ORDER.map((h) => {
            const isActive = h === normalizedHazard;
            return (
              <li key={h}>
                <Link
                  href={`/learn/${h}`}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-12 items-center gap-2 px-3 text-base whitespace-nowrap transition-colors",
                    "after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-full",
                    isActive
                      ? "font-bold text-text after:bg-brand"
                      : "font-medium text-muted hover:text-text after:bg-transparent",
                  )}
                >
                  <HazardGlyph hazard={h} width={20} height={20} />
                  {th(`${h}.name`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </TabScroller>

      <LearnGuide hazard={normalizedHazard} locale={locale} />
    </div>
  );
}
