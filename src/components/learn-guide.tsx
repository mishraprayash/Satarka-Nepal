import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { HazardType } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { LEARN_CONTENT, type LocalizedItem } from "@/lib/learn-content";
import { LEARN_IMAGES, type GuideImage } from "@/lib/learn-images";
import { HISTORIC_DISASTERS } from "@/lib/disaster-history";
import { formatNumber, localizeText } from "@/lib/format";
import {
  ExternalIcon,
  PhoneIcon,
  HazardGlyph,
  MapPinIcon,
  SignalIcon,
} from "@/components/icons";

/** Verified emergency hotline registry for Nepal */
interface EmergencyContact {
  key: string;
  number: string;
  nameEn: string;
  nameNe: string;
  roleEn: string;
  roleNe: string;
  tollFree?: boolean;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    key: "police",
    number: "100",
    nameEn: "Nepal Police",
    nameNe: "नेपाल प्रहरी",
    roleEn: "Emergency Rescue & Crime",
    roleNe: "आपत्कालीन उद्धार तथा सुरक्षा",
  },
  {
    key: "fire",
    number: "101",
    nameEn: "Fire Brigade",
    nameNe: "दमकल सेवा",
    roleEn: "Fire & Rapid Response",
    roleNe: "आगो तथा तत्काल उद्धार",
  },
  {
    key: "ambulance",
    number: "102",
    nameEn: "Ambulance",
    nameNe: "एम्बुलेन्स सेवा",
    roleEn: "Emergency Medical Transport",
    roleNe: "उपचार तथा अस्पताल ढुवानी",
  },
  {
    key: "dhm",
    number: "1155",
    nameEn: "DHM Flood Watch",
    nameNe: "बाढी सूचना (DHM)",
    roleEn: "Toll-Free River Warnings",
    roleNe: "निःशुल्क बाढी तथा नदी जानकारी",
    tollFree: true,
  },
  {
    key: "ndrrma",
    number: "1149",
    nameEn: "NDRRMA Helpline",
    nameNe: "विपद् हटलाइन (NDRRMA)",
    roleEn: "Disaster Response Center",
    roleNe: "राष्ट्रिय विपद् कार्य सञ्चालन",
    tollFree: true,
  },
];

/** Map of Devanagari numerals to standard digits for tel: links */
const DEVANAGARI_TO_LATIN: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

function normalizeToDigits(numStr: string): string {
  return numStr
    .split("")
    .map((char) => DEVANAGARI_TO_LATIN[char] ?? char)
    .join("");
}

/**
 * Parses plain text containing official emergency numbers (100, 101, 102, 1155, 1149
 * in Arabic or Devanagari numerals) and wraps them into clickable `tel:` links.
 */
function renderWithEmergencyLinks(text: string, locale: Locale): React.ReactNode {
  const pattern = /(1155|1149|100|101|102|११५५|११४९|१००|१०१|१०२)/g;
  const parts = text.split(pattern);

  if (parts.length <= 1) {
    return text;
  }

  return parts.map((part, idx) => {
    if (pattern.test(part)) {
      const standardNumber = normalizeToDigits(part);
      return (
        <a
          key={idx}
          href={`tel:${standardNumber}`}
          className="inline-flex items-center gap-1 rounded bg-brand/10 px-1.5 py-0.5 font-bold text-brand hover:bg-brand hover:text-brand-fg transition-colors tabular underline underline-offset-2"
          title={
            locale === "ne"
              ? `${part} मा फोन कल गर्नुहोस्`
              : `Tap to call ${standardNumber}`
          }
        >
          <PhoneIcon width={11} height={11} className="inline shrink-0" />
          <span>{part}</span>
        </a>
      );
    }
    return part;
  });
}

function StepList({ items, locale }: { items: LocalizedItem[]; locale: Locale }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span
            className="tabular inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-base font-bold text-brand"
            aria-hidden
          >
            {formatNumber(i + 1, locale)}
          </span>
          <div className="text-lg leading-relaxed text-text">
            {renderWithEmergencyLinks(localizeText(item, locale), locale)}
          </div>
        </li>
      ))}
    </ol>
  );
}

function PlainList({ items, locale }: { items: LocalizedItem[]; locale: Locale }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2.5 size-2.5 shrink-0 rounded-full bg-brand" aria-hidden />
          <div className="text-lg leading-relaxed text-text">
            {renderWithEmergencyLinks(localizeText(item, locale), locale)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Credit({ image }: { image: GuideImage }) {
  return (
    <p className="mt-2 text-base text-muted">
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

export async function LearnGuide({
  hazard,
  locale: propLocale,
}: {
  hazard: HazardType;
  locale?: string;
}) {
  const locale = (propLocale || (await getLocale())) as Locale;
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
            alt={locale === "ne" ? images.hero.alt.ne : images.hero.alt.en}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="eyebrow !text-white/80">{t("nepal")}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {th(`${hazard}.name`)}
            </h1>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="max-w-3xl text-base leading-relaxed text-muted">
            {localizeText(guide.intro, locale)}
          </p>
          <Credit image={images.hero} />
        </div>
      </section>

      {/* Live Monitoring Quick Links */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2/40 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="text-brand shrink-0">
            <HazardGlyph hazard={hazard} width={24} height={24} />
          </span>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-text">
              {locale === "ne"
                ? `${th(`${hazard}.name`)} सम्बन्धी प्रत्यक्ष अनुगमन तथा चेतावनीहरू`
                : `Active Telemetry & Verified Warnings: ${th(`${hazard}.name`)}`}
            </h2>
            <p className="text-base text-muted">
              {locale === "ne"
                ? "यस प्रकोपका लागि हाल सक्रिय चेतावनीहरू र प्रत्यक्ष नक्सा हेर्नुहोस्।"
                : "Inspect active alerts, telemetry gauges, and geographical risk overlays."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/alerts"
            className="inline-flex items-center gap-1.5 inline-flex min-h-11 rounded-chip border-2 border-border bg-surface px-4 py-2 text-base font-semibold text-text hover:border-brand hover:text-brand transition-colors"
          >
            <SignalIcon width={13} height={13} className="text-brand" />
            <span>{t("viewLiveAlerts", { hazard: th(`${hazard}.name`) })}</span>
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 inline-flex min-h-11 rounded-chip border-2 border-border bg-surface px-4 py-2 text-base font-semibold text-text hover:border-brand hover:text-brand transition-colors"
          >
            <MapPinIcon width={13} height={13} className="text-brand" />
            <span>{t("viewHazardMap")}</span>
          </Link>
        </div>
      </div>

      {/* Emergency Hotlines Quick-Dial Card */}
      <section className="rounded-2xl border border-warning/40 bg-warning-soft/20 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text flex items-center gap-2">
              <PhoneIcon width={18} height={18} className="text-warning shrink-0" />
              <span>{t("emergencyHotlinesTitle")}</span>
            </h2>
            <p className="mt-1 text-sm sm:text-base text-muted">
              {t("emergencyHotlinesSub")}
            </p>
          </div>
          <span className="rounded-chip border border-warning/40 bg-warning/15 px-2.5 py-0.5 text-sm font-bold text-warning">
            24/7 Verified
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {EMERGENCY_CONTACTS.map((c) => (
            <a
              key={c.number}
              href={`tel:${c.number}`}
              className="group flex flex-col justify-between rounded-card border-2 border-warning/40 bg-surface p-3.5 transition-all hover:border-warning hover:bg-surface hover:shadow-xs active:scale-[0.98]"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-warning/15 text-warning group-hover:bg-warning group-hover:text-white transition-colors">
                    <PhoneIcon width={16} height={16} />
                  </span>
                  {c.tollFree ? (
                    <span className="rounded bg-brand/10 px-1.5 py-0.5 text-sm font-bold text-brand">
                      {t("tollFree")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-base font-bold leading-snug text-text group-hover:text-warning transition-colors">
                  {locale === "ne" ? c.nameNe : c.nameEn}
                </p>
                <p className="text-base leading-snug text-muted">
                  {locale === "ne" ? c.roleNe : c.roleEn}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border/60 pt-2">
                <span className="text-xl font-bold tabular text-warning">
                  {c.number}
                </span>
                <span className="text-base font-semibold text-muted group-hover:text-warning group-hover:underline">
                  {locale === "ne" ? "कल गर्नुहोस्" : "Call"}
                </span>
              </div>
            </a>
          ))}
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

      {/* Before / During / After — the safety-critical core checklist */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            {t("emergencyChecklist")}
          </h2>
          <p className="mt-1 text-base text-muted">
            {t("emergencyChecklistSub")}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {phases.map((phase) => (
            <div
              key={phase.key}
              className={
                phase.key === "during"
                  ? "card border-warning/40 bg-warning-soft/30 p-5 shadow-xs"
                  : "card p-5 shadow-xs"
              }
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-3">
                <h3 className="text-base font-bold">{phase.title}</h3>
                <span className="text-sm font-semibold text-muted">
                  {phase.items.length} {locale === "ne" ? "चरणहरू" : "actions"}
                </span>
              </div>
              <StepList items={phase.items} locale={locale} />
            </div>
          ))}
        </div>
      </section>

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
              <p className="mt-1 text-base text-muted">
                {locale === "ne"
                  ? "यस प्रकोपबाट नेपालमा विगतमा भएका विनाशकारी विपद्हरू, तिनका वैज्ञानिक कारण र सिकिएका पाठहरू।"
                  : "Major recorded occurrences of this hazard in Nepal, the scientific causes, and hard lessons learned."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {hazardDisasters.map((item) => (
                <div key={item.id} className="card p-5 sm:p-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular rounded bg-brand/10 border border-brand/30 px-2 py-0.5 text-sm font-bold text-brand">
                      {item.year} ({item.bsYear})
                    </span>
                    <span className="rounded-chip border border-border bg-surface-2 px-2 py-0.5 text-sm font-semibold text-text">
                      {locale === "ne" ? item.metricHighlight.ne : item.metricHighlight.en}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-text">
                    {locale === "ne" ? item.title.ne : item.title.en}
                  </h3>

                  <p className="text-base text-muted">
                    📍 {locale === "ne" ? item.location.ne : item.location.en}
                  </p>

                  <div className="rounded border border-danger/25 bg-danger-soft/20 px-2.5 py-1.5 text-sm">
                    <span className="font-bold text-danger mr-1">
                      {t("fatalitiesLabel")}:
                    </span>
                    <span className="font-semibold text-text tabular">{item.fatalities}</span>
                  </div>

                  <p className="text-sm sm:text-base text-muted leading-relaxed">
                    {locale === "ne" ? item.impact.ne : item.impact.en}
                  </p>

                  <div className="space-y-2 border-t border-border pt-3 text-sm">
                    <div className="space-y-0.5">
                      <span className="font-bold text-brand text-sm">
                        {t("scientificCauseLabel")}
                      </span>
                      <p className="text-muted leading-relaxed bg-surface-2/60 p-2 rounded">
                        {locale === "ne" ? item.scientificCause.ne : item.scientificCause.en}
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-warning text-sm">
                        {t("lessonsLabel")}
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
                    alt={locale === "ne" ? img.alt.ne : img.alt.en}
                    fill
                    loading="lazy"
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="p-4">
                  <p className="text-base leading-relaxed text-muted">
                    {localizeText(img.caption, locale)}
                  </p>
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
                className="inline-flex items-center gap-1.5 inline-flex min-h-11 rounded-chip border-2 border-border-strong px-4 py-2 text-base font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
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
