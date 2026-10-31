import { setRequestLocale, getTranslations } from "next-intl/server";
import type { SourceStatus } from "@/lib/types";
import { SectionHeader } from "@/components/section";
import { STATUS_DOT, STATUS_KEY } from "@/lib/ui";
import { cn } from "@/lib/cn";
import { ExternalIcon } from "@/components/icons";
import { DisclaimerTrigger } from "@/components/disclaimer-trigger";

interface SourceLine {
  nameEn: string;
  nameNe: string;
  url: string;
  status: SourceStatus;
}

const SOURCES: SourceLine[] = [
  { nameEn: "NDRRMA — BIPAD Portal", nameNe: "NDRRMA — विपद् पोर्टल", url: "https://bipadportal.gov.np/", status: "live" },
  { nameEn: "DHM — River & Rain Watch (via BIPAD)", nameNe: "जल तथा मौसम विज्ञान विभाग — नदी तथा वर्षा मापन", url: "https://bipadportal.gov.np/realtime-monitoring", status: "live" },
  { nameEn: "USGS Earthquake Hazards Program", nameNe: "USGS भूकम्प जोखिम कार्यक्रम", url: "https://earthquake.usgs.gov/", status: "live" },
  { nameEn: "GDACS (JRC / United Nations)", nameNe: "GDACS (संयुक्त राष्ट्र संघ / JRC)", url: "https://www.gdacs.org/", status: "live" },
  { nameEn: "GEOGloWS v2 streamflow forecast (ECMWF)", nameNe: "GEOGloWS v2 नदी बहाव पूर्वानुमान (ECMWF)", url: "https://data.geoglows.org/", status: "no-feed" },
  { nameEn: "ICIMOD — glacial lake inventory", nameNe: "ICIMOD — हिमताल सूची", url: "https://www.icimod.org/", status: "reference" },
  { nameEn: "ReliefWeb (UN OCHA)", nameNe: "ReliefWeb (संयुक्त राष्ट्र सङ्घ OCHA)", url: "https://reliefweb.int/", status: "report-only" },
];

const EMERGENCY: { key: "police" | "ambulance" | "fire" | "dhm" | "ndrrma"; number: string; tollFree?: boolean }[] = [
  { key: "police", number: "100" },
  { key: "fire", number: "101" },
  { key: "ambulance", number: "102" },
  { key: "dhm", number: "1155", tollFree: true },
  { key: "ndrrma", number: "1149", tollFree: true },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const ts = await getTranslations("status");
  const te = await getTranslations("emergency");
  const tf = await getTranslations("footer");

  return (
    <div className="shell space-y-14 py-10 sm:py-14">
      <SectionHeader title={t("title")} />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,42rem)_1fr] lg:gap-16">
        {/* Long-form reading: one column at a comfortable line length, no boxes */}
        <article className="space-y-10 text-lg leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold">{t("missionTitle")}</h2>
            <p className="mt-3">{t("missionBody")}</p>
            <p className="mt-3">{t("honestyBody")}</p>
          </section>

          <section className="border-l-4 border-brand pl-5">
            <h2 className="text-2xl font-bold">{t("rasuwaTitle")}</h2>
            <div className="mt-3 space-y-3">
              <p>{t("rasuwaBody1")}</p>
              <p>{t("rasuwaBody2")}</p>
              <p className="font-semibold">{t("rasuwaBody3")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold">{t("methodologyTitle")}</h2>
            <p className="mt-3">{t("methodologyBody")}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">{t("licensesTitle")}</h2>
            <p className="mt-3 text-muted">{t("licensesBody")}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold">{t("disclaimerTitle")}</h2>
            <p className="mt-3 text-muted">{t("disclaimerBody")}</p>
            <DisclaimerTrigger label={t("disclaimerTitle")} actionText={tf("readFullDisclaimer")} />
          </section>
        </article>

        {/* Emergency numbers stay in view beside the reading on wide screens */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="text-xl font-bold">{t("emergencyTitle")}</h2>
          <ul className="mt-4 divide-y divide-border rounded-card border border-border bg-surface">
            {EMERGENCY.map((c) => (
              <li key={c.key}>
                <a
                  href={`tel:${c.number}`}
                  aria-label={te("call", { number: c.number })}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{te(c.key)}</span>
                    {c.tollFree ? <span className="text-sm text-muted">{te("tollFree")}</span> : null}
                  </span>
                  <span className="tabular text-2xl font-extrabold text-danger">{c.number}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-base leading-relaxed text-muted">{te("emergencyNote")}</p>
        </aside>
      </div>

      {/* Data sources, each with its honest status */}
      <section>
        <SectionHeader title={t("sourcesTitle")} className="mb-4" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s.url} className="card flex items-center gap-3 px-4 py-2">
              <span className={cn("size-2.5 shrink-0 rounded-full", STATUS_DOT[s.status])} aria-hidden />
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold hover:text-brand"
              >
                {locale === "ne" ? s.nameNe : s.nameEn}
                <ExternalIcon width={16} height={16} />
              </a>
              <span className="ml-auto shrink-0 text-sm font-semibold text-muted">{ts(`${STATUS_KEY[s.status]}.label`)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
