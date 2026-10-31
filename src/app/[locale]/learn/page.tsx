import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DisasterHistorySection } from "@/components/disaster-history-section";
import { SectionHeader } from "@/components/section";
import { HazardGlyph, ArrowIcon } from "@/components/icons";
import { HAZARD_ORDER } from "@/lib/ui";
import { LEARN_IMAGES } from "@/lib/learn-images";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "learn" });
  return { title: t("title") };
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("learn");
  const th = await getTranslations("hazards");

  return (
    <div className="shell space-y-12 py-10 sm:py-14">
      {/* Breadcrumb navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-base text-muted">
        <Link href="/" className="hover:text-text transition-colors">
          {locale === "ne" ? "गृह" : "Home"}
        </Link>
        <span>/</span>
        <span className="text-text font-medium">{t("title")}</span>
      </nav>

      {/* Hazard Guides Hero Section */}
      <div className="space-y-8">
        <SectionHeader title={t("title")} sub={t("subtitle")} />

        <ul className="grid gap-4 sm:grid-cols-2">
          {HAZARD_ORDER.map((h) => {
            const hero = LEARN_IMAGES[h].hero;
            return (
              <li key={h}>
                <Link
                  href={`/learn/${h}`}
                  className="card card-link group flex h-full flex-col overflow-hidden"
                >
                  <div className="relative aspect-[16/8] w-full overflow-hidden bg-surface-2">
                    <Image
                      src={hero.src}
                      alt={locale === "ne" ? hero.alt.ne : hero.alt.en}
                      fill
                      loading="lazy"
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-center gap-2">
                      <span className="text-brand" aria-hidden>
                        <HazardGlyph hazard={h} width={20} height={20} />
                      </span>
                      <h2 className="text-xl font-bold group-hover:text-brand">{th(`${h}.name`)}</h2>
                    </div>
                    <p className="text-base leading-relaxed text-muted">{th(`${h}.short`)}</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-2 text-base font-semibold text-brand">
                      {t("readGuide")}
                      <ArrowIcon width={14} height={14} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Historical Disasters Archive & Scientific Realities */}
      <div className="border-t border-border pt-12">
        <DisasterHistorySection />
      </div>
    </div>
  );
}
