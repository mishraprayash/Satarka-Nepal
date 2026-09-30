import { setRequestLocale, getTranslations } from "next-intl/server";
import type { SourceStatus } from "@/lib/types";
import { SectionHeader } from "@/components/section";
import { STATUS_KEY } from "@/lib/ui";
import { ExternalIcon, PhoneIcon } from "@/components/icons";
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
    <div className="shell space-y-10 py-10 sm:py-14">
      <SectionHeader title={t("title")} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Mission */}
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-xl font-bold tracking-tight">{t("missionTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("missionBody")}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("honestyBody")}</p>
        </section>

        {/* Emergency contacts — always visible */}
        <section className="card border-warning/40 bg-warning-soft/30 p-6">
          <h2 className="text-xl font-bold tracking-tight">{t("emergencyTitle")}</h2>
          <ul className="mt-4 space-y-2.5">
            {EMERGENCY.map((c) => (
              <li key={c.key}>
                <a
                  href={`tel:${c.number}`}
                  aria-label={te("call", { number: c.number })}
                  className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-surface/80 p-3 text-sm font-medium transition-all hover:bg-surface hover:border-warning/60 hover:shadow-xs active:scale-[0.98]"
                >
                  <span className="inline-flex items-center gap-2 font-semibold text-text">
                    <PhoneIcon width={16} height={16} className="text-warning shrink-0" />
                    <span>{te(c.key)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular rounded-chip bg-warning/15 px-3 py-1 text-sm font-bold text-warning">
                    <span>{c.number}</span>
                    <span className="text-[11px] font-normal text-warning/80">
                      ({c.tollFree ? te("tollFree") : te("callAction")})
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted leading-relaxed">{te("emergencyNote")}</p>
        </section>
      </div>

      {/* Rasuwa case study */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="contour-field decor absolute inset-0 -z-10 opacity-40" aria-hidden />
        <h2 className="text-xl font-bold tracking-tight">{t("rasuwaTitle")}</h2>
        <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-muted">
          <p>{t("rasuwaBody1")}</p>
          <p>{t("rasuwaBody2")}</p>
          <p>{t("rasuwaBody3")}</p>
        </div>
      </section>

      {/* Data sources */}
      <section>
        <SectionHeader title={t("sourcesTitle")} className="mb-4" />
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s.url} className="card flex items-center gap-3 p-4">
              <span
                className="inline-flex h-2 w-2 shrink-0 rounded-full"
                style={{ background: "var(--sev-info-fg)" }}
                aria-hidden
              />
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold hover:text-brand"
              >
                {locale === "ne" ? s.nameNe : s.nameEn}
                <ExternalIcon width={12} height={12} />
              </a>
              <span className="eyebrow ml-auto shrink-0">{ts(`${STATUS_KEY[s.status]}.label`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Methodology + licenses */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-xl font-bold tracking-tight">{t("methodologyTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("methodologyBody")}</p>
        </section>
        <section className="card p-6">
          <h2 className="text-xl font-bold tracking-tight">{t("licensesTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{t("licensesBody")}</p>
        </section>
      </div>

      {/* Disclaimer */}
      <section className="rounded-card border border-warning/30 bg-warning-soft/40 p-6">
        <h2 className="text-lg font-bold tracking-tight">{t("disclaimerTitle")}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{t("disclaimerBody")}</p>
        <div className="mt-4 max-w-md">
          <DisclaimerTrigger
            label={t("disclaimerTitle")}
            actionText={tf("readFullDisclaimer")}
          />
        </div>
      </section>
    </div>
  );
}

