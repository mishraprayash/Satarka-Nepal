"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/format";
import { useReports } from "@/lib/use-reports";
import { ArrowIcon, ExternalIcon } from "@/components/icons";
import type { ReportsResponse } from "@/lib/types";

export function ReportsList({ initialData }: { initialData?: ReportsResponse }) {
  const locale = useLocale() as Locale;
  const tc = useTranslations("common");
  const to = useTranslations("offline");
  const tact = useTranslations("actions");
  const { data, fromCache, isLoading, isError, refetch } = useReports(initialData);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="card animate-pulse p-4 space-y-2.5 bg-surface"
          >
            <div className="h-3 w-24 rounded bg-surface-2" />
            <div className="h-4 w-3/4 rounded bg-surface-2" />
            <div className="h-3 w-1/3 rounded bg-surface-2" />
          </div>
        ))}
      </div>
    );
  }

  const reports = data?.ok && data.reports.length > 0 ? data.reports : [];

  return (
    <div className="space-y-4">
      {fromCache ? (
        <p className="rounded-card border border-watch/40 bg-watch-soft/40 px-3.5 py-2 text-xs text-watch font-medium">
          {to("cachedNote")}
        </p>
      ) : null}

      {reports.length > 0 ? (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {reports.map((r) => (
            <article
              key={r.id}
              className="card group relative flex flex-col justify-between p-4 sm:p-5 transition-all hover:border-brand/60 hover:shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-chip border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {r.sourceName}
                  </span>
                  {r.date ? (
                    <span className="text-[11px] tabular text-faint">
                      {formatDateTime(r.date, locale)}
                    </span>
                  ) : null}
                </div>

                <h3 className="text-sm font-semibold leading-snug text-text group-hover:text-brand transition-colors">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 focus:outline-none"
                  >
                    <span>{r.title}</span>
                    <ExternalIcon
                      width={13}
                      height={13}
                      className="mt-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity text-brand"
                    />
                  </a>
                </h3>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
                <span className="text-faint text-[11px]">
                  {locale === "ne" ? "आधिकारिक प्रतिवेदन" : "Official Briefing"}
                </span>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  <span>{locale === "ne" ? "हेर्नुहोस्" : "Read report"}</span>
                  <ArrowIcon width={11} height={11} />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Rich Fallback Directory */
        <div className="card border-dashed p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-text">
                {locale === "ne"
                  ? "मानवीय तथा विपद् स्थिति प्रतिवेदन पोर्टलहरू"
                  : "Humanitarian & Disaster Situation Portals"}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted max-w-xl">
                {locale === "ne"
                  ? "प्रत्यक्ष स्वचालित फिड लोड हुन नसकेको अवस्थामा आधिकारिक निकायहरूका स्थिति प्रतिवेदनहरू तलका पोर्टलहरूबाट हेर्न सकिन्छ।"
                  : "Automated situation reports feed is currently in fallback mode. Official agency bulletins and ground updates are available via the portals below."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-chip border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text hover:bg-surface-2 transition-colors shrink-0 cursor-pointer"
            >
              {tact("retry")}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 pt-2">
            <a
              href="https://reliefweb.int/country/npl"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface-2/40 p-3.5 hover:border-brand hover:bg-surface-2 transition-colors"
            >
              <div>
                <span className="eyebrow !text-brand font-bold">UN OCHA</span>
                <p className="mt-1 text-xs font-semibold text-text group-hover:text-brand">
                  ReliefWeb Nepal Hub
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {locale === "ne" ? "नेपालका सम्पूर्ण मानवीय प्रतिवेदनहरू" : "Consolidated humanitarian situation updates"}
                </p>
              </div>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                <span>reliefweb.int</span>
                <ExternalIcon width={10} height={10} />
              </span>
            </a>

            <a
              href="https://bipadportal.gov.np/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface-2/40 p-3.5 hover:border-brand hover:bg-surface-2 transition-colors"
            >
              <div>
                <span className="eyebrow !text-warning font-bold">Government</span>
                <p className="mt-1 text-xs font-semibold text-text group-hover:text-brand">
                  NDRRMA BIPAD Portal
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {locale === "ne" ? "राष्ट्रिय विपद् क्षति तथा घटना विवरण" : "Daily incident & national loss assessments"}
                </p>
              </div>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                <span>bipadportal.gov.np</span>
                <ExternalIcon width={10} height={10} />
              </span>
            </a>

            <a
              href="https://nrcs.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface-2/40 p-3.5 hover:border-brand hover:bg-surface-2 transition-colors"
            >
              <div>
                <span className="eyebrow !text-danger font-bold">Red Cross</span>
                <p className="mt-1 text-xs font-semibold text-text group-hover:text-brand">
                  Nepal Red Cross Bulletins
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {locale === "ne" ? "राहत वितरण तथा उद्धार बुलेटिन" : "Emergency shelter & relief distribution logs"}
                </p>
              </div>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                <span>nrcs.org</span>
                <ExternalIcon width={10} height={10} />
              </span>
            </a>
          </div>
        </div>
      )}

      {/* Direct Portal Link Footer Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-faint px-1">
        <span>
          {locale === "ne"
            ? "प्रतिवेदनहरू पृष्ठभूमि जानकारी हुन् — तत्काल निकासीका लागि सक्रिय चेतावनी हेर्नुहोस्।"
            : "Reports provide background context — consult live alerts for active hazard warnings."}
        </span>
        <a
          href="https://reliefweb.int/country/npl"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          <span>
            {locale === "ne"
              ? "ReliefWeb नेपाल पोर्टल खोल्नुहोस्"
              : "Explore all updates on ReliefWeb (UN OCHA)"}
          </span>
          <ExternalIcon width={11} height={11} />
        </a>
      </div>
    </div>
  );
}
