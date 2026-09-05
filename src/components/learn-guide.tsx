import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import type { HazardType } from "@/lib/types";
import { LEARN_CONTENT, type LocalizedItem } from "@/lib/learn-content";
import { LEARN_IMAGES, type GuideImage } from "@/lib/learn-images";
import { HISTORIC_DISASTERS } from "@/lib/disaster-history";
import { ExternalIcon } from "@/components/icons";

function pick(v: { en: string; ne?: string } | undefined, locale: string): string {
  return v ? (locale === "ne" ? v.ne ?? v.en : v.en) : "";
}

function pickNe(v: { en: string; ne: string }, locale: string): string {
  return locale === "ne" ? v.ne : v.en;
}

function StepList({ items, locale }: { items: LocalizedItem[]; locale: string }) {
  return (
    <ol className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="tabular mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand"
            aria-hidden
          >
            {i + 1}
          </span>
          <p className="text-sm leading-relaxed">{pick(item, locale)}</p>
        </li>
      ))}
    </ol>
  );
}

function PlainList({ items, locale }: { items: LocalizedItem[]; locale: string }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
          <p className="text-sm leading-relaxed">{pick(item, locale)}</p>
        </li>
      ))}
    </ul>
  );
}

function Credit({ image }: { image: GuideImage }) {
  return (
    <p className="mt-2 text-xs text-faint">
      {image.credit} ·{" "}
      <a
        href={image.link}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline-offset-2 hover:underline"
      >
        Wikimedia
      </a>
    </p>
  );
}

export async function LearnGuide({ hazard }: { hazard: HazardType }) {
  const locale = await getLocale();
  const t = await getTranslations("learn");
  const th = await getTranslations("hazards");
  const guide = LEARN_CONTENT[hazard];
  const images = LEARN_IMAGES[hazard];

  const phases = [
    { key: "before", title: t("before"), items: guide.before },
    { key: "during", title: t("during"), items: guide.during },
    { key: "after", title: t("after"), items: guide.after },
  ] as const;

  return (
    <div className="space-y-10">
      {/* Hero photograph + title + intro */}
      <section className="card relative overflow-hidden">
        <div className="relative aspect-[16/8] w-full sm:aspect-[21/9]">
          <Image
            src={images.hero.src}
            alt={pickNe(images.hero.alt, locale)}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="eyebrow !text-white/80">Nepal</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {th(`${hazard}.name`)}
            </h1>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="max-w-3xl text-base leading-relaxed text-muted">{pick(guide.intro, locale)}</p>
          <Credit image={images.hero} />
        </div>
      </section>

      {/* Causes + signs */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-lg font-semibold">{t("causes")}</h2>
          <div className="mt-3">
            <PlainList items={guide.causes} locale={locale} />
          </div>
        </section>
        <section className="card border-watch/30 bg-watch-soft/30 p-5">
          <h2 className="text-lg font-semibold">{t("signs")}</h2>
          <div className="mt-3">
            <PlainList items={guide.signs} locale={locale} />
          </div>
        </section>
      </div>

      {/* Before / During / After — the safety-critical core */}
      <div className="grid gap-4 lg:grid-cols-3">
        {phases.map((phase) => (
          <section
            key={phase.key}
            className={
              phase.key === "during"
                ? "card border-warning/40 bg-warning-soft/30 p-5"
                : "card p-5"
            }
          >
            <h2 className="text-lg font-semibold">{phase.title}</h2>
            <div className="mt-3">
              <StepList items={phase.items} locale={locale} />
            </div>
          </section>
        ))}
      </div>

      {/* Historical Disasters in Nepal for this hazard */}
      {(() => {
        const hazardDisasters = HISTORIC_DISASTERS.filter((d) => d.hazard === hazard);
        if (hazardDisasters.length === 0) return null;
        return (
          <section className="space-y-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                {locale === "ne" ? "नेपालका प्रमुख ऐतिहासिक विपद्हरू" : "Documented Historical Disasters in Nepal"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {locale === "ne"
                  ? "यस प्रकोपबाट नेपालमा विगतमा भएका विनाशकारी विपद्हरू, तिनका वैज्ञानिक कारण र सिकिएका पाठहरू।"
                  : "Major recorded occurrences of this hazard in Nepal, the scientific causes, and hard lessons learned."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {hazardDisasters.map((item) => (
                <div key={item.id} className="card p-5 sm:p-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular rounded bg-brand/10 border border-brand/30 px-2 py-0.5 text-xs font-bold text-brand">
                      {item.year} ({item.bsYear})
                    </span>
                    <span className="rounded-chip border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text">
                      {locale === "ne" ? item.metricHighlight.ne : item.metricHighlight.en}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-text">
                    {locale === "ne" ? item.title.ne : item.title.en}
                  </h3>

                  <p className="text-xs text-muted">
                    📍 {locale === "ne" ? item.location.ne : item.location.en}
                  </p>

                  <div className="rounded border border-danger/25 bg-danger-soft/20 px-2.5 py-1.5 text-xs">
                    <span className="font-bold text-danger mr-1">
                      {locale === "ne" ? "मानवीय क्षति:" : "Casualties:"}
                    </span>
                    <span className="font-semibold text-text tabular">{item.fatalities}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {locale === "ne" ? item.impact.ne : item.impact.en}
                  </p>

                  <div className="space-y-2 border-t border-border pt-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-brand uppercase tracking-wider text-[10px]">
                        {locale === "ne" ? "वैज्ञानिक कारण" : "Scientific Cause"}
                      </span>
                      <p className="text-muted leading-relaxed bg-surface-2/60 p-2 rounded">
                        {locale === "ne" ? item.scientificCause.ne : item.scientificCause.en}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-warning uppercase tracking-wider text-[10px]">
                        {locale === "ne" ? "सिकेको पाठ" : "Key Takeaway"}
                      </span>
                      <p className="text-muted leading-relaxed bg-warning-soft/20 p-2 rounded border border-warning/20">
                        {locale === "ne" ? item.lessonLearned.ne : item.lessonLearned.en}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Photographs from real events */}
      {images.gallery.length > 0 ? (
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-bold tracking-tight">{t("inTheField")}</h2>
            <p className="mt-2 text-muted">{t("inTheFieldSub")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {images.gallery.map((img, i) => (
              <figure key={i} className="card overflow-hidden">
                <div className="relative aspect-[16/10] bg-surface-2">
                  <Image
                    src={img.src}
                    alt={pickNe(img.alt, locale)}
                    fill
                    loading="lazy"
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="p-4">
                  <p className="text-sm leading-relaxed text-muted">{pick(img.caption, locale)}</p>
                  <Credit image={img} />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Sources */}
      <section className="border-t border-border pt-6">
        <h2 className="text-lg font-semibold">{t("sourcesCited")}</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {guide.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                {s.name}
                <ExternalIcon width={13} height={13} />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
