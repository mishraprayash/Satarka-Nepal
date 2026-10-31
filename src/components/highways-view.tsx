"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { HighwayBlockage, HighwaysResponse, HighwayStatus } from "@/lib/types";
import { useHighways } from "@/lib/use-highways";
import { usePagination, PaginationControl } from "@/components/pagination";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { localizeClosureReason, localizeRepairEta } from "@/lib/highway-text";
import {
  SeverityGlyph,
  SearchIcon,
  CloseIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowIcon,
  ExternalIcon,
} from "@/components/icons";

type StatusFilter = "all" | HighwayStatus;

export function HighwaysView({ initialData }: { initialData?: HighwaysResponse }) {
  const locale = useLocale() as Locale;
  const tc = useTranslations("common");
  const ta = useTranslations("actions");

  const { data, isLoading, isError, refetch, isFetching, fromCache, cachedAt } = useHighways(initialData);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const highways = data?.highways ?? [];

  const blocked = useMemo(() => highways.filter((h) => h.status === "BLOCKED" || h.status === "CLOSED"), [highways]);
  const partial = useMemo(() => highways.filter((h) => h.status === "PARTIAL_OPEN"), [highways]);
  const open = useMemo(() => highways.filter((h) => h.status === "OPEN"), [highways]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return highways.filter((h) => {
      if (statusFilter === "BLOCKED" && !(h.status === "BLOCKED" || h.status === "CLOSED")) return false;
      if (statusFilter !== "all" && statusFilter !== "BLOCKED" && h.status !== statusFilter) return false;
      if (!q) return true;

      const title = h.title.toLowerCase();
      const code = h.roadRefno.toLowerCase();
      const loc = h.location.toLowerCase();
      const reason = h.closureReason.toLowerCase();
      const remarks = (h.remarks ?? "").toLowerCase();

      return (
        title.includes(q) ||
        code.includes(q) ||
        loc.includes(q) ||
        reason.includes(q) ||
        remarks.includes(q)
      );
    });
  }, [highways, statusFilter, search]);

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination(filtered, 12);

  useEffect(() => {
    goToPage(1);
  }, [search, statusFilter]);

  return (
    <div className="space-y-8">
      {fromCache ? (
        <p
          role="status"
          suppressHydrationWarning
          className="rounded-card border border-watch/40 bg-watch-soft px-4 py-2.5 text-sm text-watch"
        >
          {locale === "ne"
            ? `अफलाइन डाटा देखाइँदैछ (${timeAgo(new Date(cachedAt ?? Date.now()).toISOString(), locale)})`
            : `Showing offline cached data from ${timeAgo(new Date(cachedAt ?? Date.now()).toISOString(), locale)}`}
        </p>
      ) : null}

      {/* Plain-language answer first. "Feed unreachable" is never shown as "all clear". */}
      {(() => {
        const unreachable = data ? data.ok === false && highways.length === 0 : isError;
        const tone = unreachable ? "watch" : blocked.length > 0 ? "danger" : "advisory";
        const title = unreachable
          ? locale === "ne"
            ? "सडक विभागको जानकारी अहिले उपलब्ध छैन"
            : "Road status is unavailable right now"
          : blocked.length > 0
            ? locale === "ne"
              ? `${blocked.length} सडक अहिले अवरुद्ध छन्`
              : `${blocked.length} ${blocked.length === 1 ? "road is" : "roads are"} blocked right now`
            : locale === "ne"
              ? "कुनै सडक अवरुद्ध भएको रिपोर्ट छैन"
              : "No blocked roads reported";
        const body = unreachable
          ? locale === "ne"
            ? "हामी सडक विभागको फिडसम्म पुग्न सकेनौं। यात्रा गर्नुअघि सडक विभाग वा स्थानीय प्रहरीसँग सोध्नुहोस्।"
            : "We couldn't reach the Department of Roads feed. Check with the Department of Roads or local police before you travel."
          : partial.length + open.length > 0
            ? locale === "ne"
              ? `${partial.length} एकतर्फी, ${open.length} सुचारु। यात्रा गर्नुअघि सडक विभागसँग पुष्टि गर्नुहोस्।`
              : `${partial.length} one-way, ${open.length} fully open. Confirm with the Department of Roads before you travel.`
            : locale === "ne"
              ? "यात्रा गर्नुअघि सडक विभागसँग पुष्टि गर्नुहोस्।"
              : "Confirm with the Department of Roads before you travel."
        return (
          <div
            role="status"
            className={cn(
              "flex items-start gap-4 rounded-card border-l-[6px] border-current p-5 sm:p-6",
              tone === "danger" ? "bg-danger-soft text-danger" : tone === "watch" ? "bg-watch-soft text-watch" : "bg-advisory-soft text-advisory",
            )}
          >
            <SeverityGlyph severity={tone} width={30} height={30} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xl font-bold">{title}</p>
              <p className="mt-1 text-lg text-text">{body}</p>
            </div>
          </div>
        );
      })()}

      {/* Search and filters only make sense once there are roads to search */}
      {highways.length > 0 ? (
        <>
      {/* Search */}
      <div className="relative max-w-xl">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted">
          <SearchIcon width={20} height={20} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={locale === "ne" ? "सडक खोज्नुहोस्" : "Search roads"}
          placeholder={locale === "ne" ? "सडक वा ठाउँ खोज्नुहोस्…" : "Search road or place…"}
          className="h-14 w-full rounded-chip border border-border-strong bg-surface pl-12 pr-12 text-lg placeholder:text-muted focus:border-brand focus:outline-none"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label={locale === "ne" ? "खोजी हटाउनुहोस्" : "Clear search"}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-text cursor-pointer"
          >
            <CloseIcon width={20} height={20} />
          </button>
        ) : null}
      </div>

      {/* Status filters with counts */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={locale === "ne" ? "सडकको अवस्था" : "Road status"}>
        {(
          [
            { st: "all", n: highways.length, en: "All", ne: "सबै" },
            { st: "BLOCKED", n: blocked.length, en: "Blocked", ne: "अवरुद्ध" },
            { st: "PARTIAL_OPEN", n: partial.length, en: "One-way", ne: "एकतर्फी" },
            { st: "OPEN", n: open.length, en: "Open", ne: "खुल्ला" },
          ] as const
        ).map((f) => (
          <button
            key={f.st}
            type="button"
            aria-pressed={statusFilter === f.st}
            onClick={() => setStatusFilter(f.st)}
            className={cn(
              "min-h-11 rounded-full border px-4 py-2 text-base font-medium transition-colors cursor-pointer",
              statusFilter === f.st
                ? "border-brand bg-brand text-brand-fg font-semibold"
                : "border-border-strong bg-surface text-text hover:bg-surface-2",
            )}
          >
            {locale === "ne" ? f.ne : f.en} <span className="tabular opacity-80">({f.n})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn btn-secondary !min-h-11"
        >
          <span aria-hidden className={cn(isFetching && "animate-spin")}>↻</span>
          {ta("refresh")}
        </button>
      </div>
        </>
      ) : null}

      {/* Highway Cards Grid */}
      {highways.length === 0 ? null : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <p className="font-semibold text-text">
            {locale === "ne" ? "कुनै सडक भेटिएन" : "No matching road sections found"}
          </p>
          <p className="mt-1 text-sm text-muted max-w-sm">
            {locale === "ne"
              ? "खोज शब्द परिवर्तन गर्नुहोस् वा फिल्टर हटाउनुहोस्।"
              : "Try adjusting your search keywords or resetting status filters."}
          </p>
          {(search || statusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="btn btn-secondary mt-4"
            >
              {locale === "ne" ? "फिल्टर हटाउनुहोस्" : "Reset filters"}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((item) => (
              <HighwayCard key={item.id} item={item} locale={locale} />
            ))}
          </div>
          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              goToPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}
    </div>
  );
}

function HighwayCard({ item, locale }: { item: HighwayBlockage; locale: Locale }) {
  const isBlocked = item.status === "BLOCKED" || item.status === "CLOSED";
  const isPartial = item.status === "PARTIAL_OPEN";

  // Same scale as alerts: blocked is danger, one-way is warning, open is clear.
  const tone = isBlocked
    ? { edge: "bg-danger-solid", chip: "bg-danger-soft text-danger" }
    : isPartial
      ? { edge: "bg-warning-solid", chip: "bg-warning-soft text-warning" }
      : { edge: "bg-advisory-solid", chip: "bg-advisory-soft text-advisory" };

  const statusText = isBlocked
    ? locale === "ne" ? "सडक अवरुद्ध" : "Blocked"
    : isPartial
      ? locale === "ne" ? "एकतर्फी सञ्चालन" : "One-way only"
      : locale === "ne" ? "द्वितर्फी सुचारु" : "Open";

  return (
    <article className="card relative flex flex-col overflow-hidden">
      <span className={cn("absolute inset-y-0 left-0 w-1.5", tone.edge)} aria-hidden />

      <div className="flex flex-1 flex-col gap-3 p-5 pl-6">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-bold", tone.chip)}>{statusText}</span>
          <span className="tabular text-sm font-semibold text-muted">{item.roadRefno}</span>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-bold leading-snug">{item.title}</h3>
          {item.location ? (
            <p className="flex items-start gap-1.5 text-base text-muted">
              <MapPinIcon width={16} height={16} className="mt-1 shrink-0 text-faint" />
              <span>
                {item.location}
                {item.chainage ? <span className="text-faint"> ({item.chainage})</span> : null}
              </span>
            </p>
          ) : null}
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
          <dt className="text-muted">{locale === "ne" ? "कारण" : "Cause"}</dt>
          <dd className="font-semibold">{localizeClosureReason(item.closureReason, locale)}</dd>
          {item.repairEta ? (
            <>
              <dt className="text-muted">{locale === "ne" ? "खुल्ने अनुमान" : "Expected to open"}</dt>
              <dd className="font-semibold">{localizeRepairEta(item.repairEta, locale)}</dd>
            </>
          ) : null}
          {item.affectedDemography?.householdCount ? (
            <>
              <dt className="text-muted">{locale === "ne" ? "प्रभावित" : "Affected"}</dt>
              <dd>
                ~{item.affectedDemography.householdCount.toLocaleString()} {locale === "ne" ? "घरधुरी" : "households"}
              </dd>
            </>
          ) : null}
        </dl>

        {item.effortsBeingMade ? (
          <p className="text-base leading-relaxed text-muted">
            <strong className="font-semibold text-text">{locale === "ne" ? "प्रयास" : "Work underway"}:</strong>{" "}
            {item.effortsBeingMade}
          </p>
        ) : null}

        {item.remarks ? (
          <p className="border-l-2 border-border-strong pl-3 text-base leading-relaxed text-muted">{item.remarks}</p>
        ) : null}

        {item.contactPerson ? (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <PhoneIcon width={14} height={14} className="shrink-0" />
            <span>{item.contactPerson}</span>
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-2 pl-6 text-sm">
        <span className="text-faint" suppressHydrationWarning>
          {item.startedAt ? timeAgo(item.startedAt, locale) : ""}
        </span>
        {item.lat != null && item.lng != null ? (
          <Link
            href={`/map?lat=${item.lat}&lng=${item.lng}&zoom=14&title=${encodeURIComponent(item.roadRefno + ": " + (item.location || item.title))}`}
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand hover:underline underline-offset-4"
          >
            {locale === "ne" ? "नक्सामा हेर्नुहोस्" : "View on map"}
            <ArrowIcon width={14} height={14} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
