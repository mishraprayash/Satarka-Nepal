"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { HazardType } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { HAZARD_ORDER } from "@/lib/ui";
import { HazardGlyph, SearchIcon, CloseIcon } from "@/components/icons";
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
          <p className="mt-1 text-sm text-muted max-w-2xl">
            {tl("scienceSub")}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {HARD_SCIENTIFIC_FACTS.map((fact) => (
            <div
              key={fact.id}
              className="card relative overflow-hidden flex flex-col justify-between p-5 sm:p-6 border-border hover:border-border-strong transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow !text-brand font-bold uppercase tracking-wider">
                    {locale === "ne" ? fact.topic.ne : fact.topic.en}
                  </span>
                  <span className="text-[11px] rounded bg-surface-2 px-2 py-0.5 text-faint font-semibold">
                    Geological Insight
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold leading-snug text-text">
                  {locale === "ne" ? fact.headline.ne : fact.headline.en}
                </h3>

                <p className="text-sm leading-relaxed text-muted">
                  {locale === "ne" ? fact.explanation.ne : fact.explanation.en}
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-3 text-xs">
                <span className="font-bold text-brand block mb-0.5">
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
          <p className="mt-1 text-sm text-muted max-w-3xl">
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
                "rounded-chip border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
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
                  "inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                  activeHazard === h
                    ? "border-brand bg-brand text-brand-fg"
                    : "border-border text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <HazardGlyph hazard={h} width={13} height={13} />
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
              className="w-full rounded-chip border border-border bg-surface py-1.5 pl-8 pr-8 text-xs text-text placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
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
                  className="card flex flex-col justify-between p-5 sm:p-6 transition-all hover:border-border-strong shadow-xs"
                >
                  <div className="space-y-3.5">
                    {/* Top Row: Year badge & Hazard badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="tabular rounded bg-brand/10 border border-brand/30 px-2 py-0.5 text-xs font-bold text-brand">
                          {item.year} ({item.bsYear})
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                          <HazardGlyph hazard={item.hazard} width={13} height={13} />
                          <span>{th(`${item.hazard}.name`)}</span>
                        </span>
                      </div>
                      <span className="rounded-chip border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold tabular text-text">
                        {metric}
                      </span>
                    </div>

                    {/* Title & Location */}
                    <div>
                      <h3 className="text-base sm:text-lg font-bold leading-snug text-text">
                        {title}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-muted">
                        📍 {locationStr}
                      </p>
                    </div>

                    {/* Casualties / Impact headline */}
                    <div className="rounded-lg border border-danger/25 bg-danger-soft/20 px-3 py-2 text-xs">
                      <span className="font-bold text-danger mr-1.5">
                        {tl("fatalitiesLabel")}:
                      </span>
                      <span className="font-semibold text-text tabular">
                        {item.fatalities}
                      </span>
                    </div>

                    {/* Impact description */}
                    <p className="text-xs sm:text-sm leading-relaxed text-muted">
                      {impact}
                    </p>

                    {/* Expandable Scientific Details */}
                    {isExpanded ? (
                      <div className="mt-3.5 space-y-3 border-t border-border pt-3.5 text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-brand uppercase tracking-wider text-[10px]">
                            {tl("scientificCauseLabel")}
                          </span>
                          <p className="leading-relaxed text-muted bg-surface-2/60 p-2.5 rounded border border-border/60">
                            {cause}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="font-bold text-warning uppercase tracking-wider text-[10px]">
                            {tl("lessonsLabel")}
                          </span>
                          <p className="leading-relaxed text-muted bg-warning-soft/20 p-2.5 rounded border border-warning/30">
                            {lesson}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Toggle Accordion footer button */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="inline-flex items-center gap-1 rounded-chip border border-border bg-surface-2/60 px-3 py-1.5 font-semibold text-brand hover:border-brand hover:bg-brand-soft/40 transition-colors cursor-pointer"
                    >
                      {isExpanded ? "▲ Hide scientific details" : "▼ Read scientific cause & lessons"}
                    </button>
                    <span className="text-[11px] text-faint">
                      Verified Historical Record
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card border-dashed p-8 text-center text-sm text-muted">
            No historical disaster found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </section>
    </div>
  );
}
