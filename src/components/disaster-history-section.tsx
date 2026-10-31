"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HazardType } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { HAZARD_ORDER } from "@/lib/ui";
import { MapPinIcon, HazardGlyph, SearchIcon, CloseIcon } from "@/components/icons";
import {
  HISTORIC_DISASTERS,
  HARD_SCIENTIFIC_FACTS,
  type HistoricDisaster,
} from "@/lib/disaster-history";

export function DisasterHistorySection() {
  const locale = useLocale() as Locale;
  const tl = useTranslations("learn");
  const th = useTranslations("hazards");

  const [activeHazard, setActiveHazard] = useState<HazardType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredDisasters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return HISTORIC_DISASTERS.filter((d) => {
      if (activeHazard !== "all" && d.hazard !== activeHazard) return false;
      if (!q) return true;

      const titleEn = d.title.en.toLowerCase();
      const titleNe = d.title.ne.toLowerCase();
      const locEn = d.location.en.toLowerCase();
      const locNe = d.location.ne.toLowerCase();
      const dist = d.location.district.toLowerCase();
      const yearStr = d.year.toString();
      const bsStr = d.bsYear.toLowerCase();

      return (
        titleEn.includes(q) ||
        titleNe.includes(q) ||
        locEn.includes(q) ||
        locNe.includes(q) ||
        dist.includes(q) ||
        yearStr.includes(q) ||
        bsStr.includes(q)
      );
    });
  }, [activeHazard, searchQuery]);

  return (
    <div className="space-y-12">
      {/* ── Section 1: Hard Scientific Realities ───────────────────────────── */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            {tl("scienceTitle")}
          </h2>
          <p className="mt-1 text-base text-muted max-w-2xl">
            {tl("scienceSub")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {HARD_SCIENTIFIC_FACTS.map((fact) => (
            <div
              key={fact.id}
              className="card flex flex-col justify-between p-5 sm:p-6"
            >
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted">
                  {locale === "ne" ? fact.topic.ne : fact.topic.en}
                </p>

                <h3 className="text-lg font-bold leading-snug text-text">
                  {locale === "ne" ? fact.headline.ne : fact.headline.en}
                </h3>

                <p className="text-base leading-relaxed text-muted">
                  {locale === "ne" ? fact.explanation.ne : fact.explanation.en}
                </p>
              </div>

              <div className="mt-4 rounded-chip border-l-4 border-brand bg-surface-2 p-3 text-base">
                <span className="mb-0.5 block font-bold">
                  {locale === "ne" ? "जीवन रक्षा नियम:" : "Life-Safety Rule:"}
                </span>
                <span className="text-text leading-relaxed">
                  {locale === "ne" ? fact.takeaway.ne : fact.takeaway.en}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Historical Disasters Archive ────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
            {tl("historyTitle")}
          </h2>
          <p className="mt-1 text-base text-muted max-w-3xl">
            {tl("historySub")}
          </p>
        </div>

        {/* Toolbar: Hazard filter chips & Search input */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Hazard chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveHazard("all")}
              className={cn(
                "inline-flex min-h-11 rounded-chip border-2 px-4 py-2 text-base font-semibold transition-colors cursor-pointer",
                activeHazard === "all"
                  ? "border-brand bg-brand text-brand-fg"
                  : "border-border text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              {tl("filterAll")}
            </button>
            {HAZARD_ORDER.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setActiveHazard(h)}
                className={cn(
                  "inline-flex items-center gap-1.5 inline-flex min-h-11 rounded-chip border-2 px-4 py-2 text-base font-semibold transition-colors cursor-pointer",
                  activeHazard === h
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-border text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <HazardGlyph hazard={h} width={20} height={20} />
                <span>{th(`${h}.name`)}</span>
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
              <SearchIcon width={14} height={14} />
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tl("searchDisasters")}
              className="w-full rounded-chip border border-border bg-surface py-1.5 pl-8 pr-8 text-sm text-text placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted hover:text-text"
              >
                <CloseIcon width={12} height={12} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Disaster Cards Grid */}
        {filteredDisasters.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {filteredDisasters.map((item) => {
              const isExpanded = expandedId === item.id;
              const title = locale === "ne" ? item.title.ne : item.title.en;
              const locationStr = locale === "ne" ? item.location.ne : item.location.en;
              const metric = locale === "ne" ? item.metricHighlight.ne : item.metricHighlight.en;
              const impact = locale === "ne" ? item.impact.ne : item.impact.en;
              const cause = locale === "ne" ? item.scientificCause.ne : item.scientificCause.en;
              const lesson = locale === "ne" ? item.lessonLearned.ne : item.lessonLearned.en;

              return (
                <article
                  key={item.id}
                  className="card flex flex-col justify-between p-5 sm:p-6"
                >
                  <div className="space-y-3">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span className="tabular font-bold text-text">
                        {item.year} ({item.bsYear})
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <HazardGlyph hazard={item.hazard} width={14} height={14} />
                        {th(`${item.hazard}.name`)}
                      </span>
                    </p>

                    <div>
                      <h3 className="text-lg font-bold leading-snug text-text">{title}</h3>
                      <p className="mt-1 flex items-start gap-1.5 text-base text-muted">
                        <MapPinIcon width={16} height={16} className="mt-1 shrink-0 text-faint" />
                        {locationStr}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-base">
                      <p>
                        <span className="text-muted">{tl("fatalitiesLabel")}: </span>
                        <span className="tabular font-bold text-danger">{item.fatalities}</span>
                      </p>
                      <p className="tabular font-semibold">{metric}</p>
                    </div>

                    <p className="text-base leading-relaxed text-muted">{impact}</p>

                    {/* Expandable Scientific Details */}
                    {isExpanded ? (
                      <div className="space-y-4 border-t border-border pt-4 text-base">
                        <div>
                          <h4 className="font-bold">{tl("scientificCauseLabel")}</h4>
                          <p className="mt-1 leading-relaxed text-muted">{cause}</p>
                        </div>
                        <div className="rounded-chip border-l-4 border-brand bg-surface-2 p-3">
                          <h4 className="font-bold">{tl("lessonsLabel")}</h4>
                          <p className="mt-1 leading-relaxed">{lesson}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Toggle Accordion footer button */}
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline underline-offset-4 cursor-pointer"
                    >
                      <span aria-hidden className={cn("inline-block transition-transform", isExpanded && "rotate-180")}>▾</span>
                      {isExpanded ? tl("hideCauseLessons") : tl("readCauseLessons")}
                    </button>
                    <span className="text-faint">{tl("verifiedRecord")}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card border-dashed p-8 text-center text-base text-muted">
            {tl("noDisastersFound", { query: searchQuery })}
          </div>
        )}
      </section>
    </div>
  );
}
