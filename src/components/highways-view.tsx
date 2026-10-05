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
  HazardGlyph,
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

      {/* Plain-language answer first */}
      <div
        role="status"
        className={cn(
          "flex items-start gap-4 rounded-card border-2 p-5 sm:p-6",
          blocked.length > 0 ? "border-danger bg-danger-soft" : "border-advisory bg-advisory-soft",
        )}
      >
        <span aria-hidden className="text-3xl leading-none">{blocked.length > 0 ? "🚧" : "✅"}</span>
        <div>
          <p className="text-xl font-bold">
            {blocked.length > 0
              ? locale === "ne"
                ? `${blocked.length} सडक अहिले अवरुद्ध छन्`
                : `${blocked.length} ${blocked.length === 1 ? "road is" : "roads are"} blocked right now`
              : locale === "ne"
                ? "कुनै सडक अवरुद्ध भएको रिपोर्ट छैन"
                : "No blocked roads reported"}
          </p>
          <p className="mt-1 text-lg text-text">
            {locale === "ne"
              ? `${partial.length} एकतर्फी, ${open.length} सुचारु। यात्रा गर्नुअघि सडक विभागसँग पुष्टि गर्नुहोस्।`
              : `${partial.length} one-way, ${open.length} fully open. Confirm with the Department of Roads before you travel.`}
          </p>
        </div>
      </div>

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
          className="h-14 w-full rounded-chip border-2 border-border-strong bg-surface pl-12 pr-12 text-lg placeholder:text-muted focus:border-brand focus:outline-none"
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
              "min-h-11 rounded-chip border-2 px-4 py-2 text-base font-medium transition-all cursor-pointer active:scale-95",
              statusFilter === f.st
                ? "border-brand bg-brand text-brand-fg font-semibold"
                : "border-border text-text hover:bg-surface-2",
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

      {/* Highway Cards Grid */}
      {filtered.length === 0 ? (
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

  const statusBadgeClass = isBlocked
    ? "border-danger/40 bg-danger/10 text-danger font-semibold"
    : isPartial
      ? "border-warning/40 bg-warning/10 text-warning font-semibold"
      : "border-brand/30 bg-brand/10 text-brand font-medium";

  const statusText = isBlocked
    ? locale === "ne" ? "सडक अवरुद्ध" : "Road Blocked"
    : isPartial
      ? locale === "ne" ? "एकतर्फी सञ्चालन" : "One-Way Open"
      : locale === "ne" ? "द्वितर्फी सुचारु" : "Fully Open";

  return (
    <div
      className="card group relative flex flex-col justify-between p-5 sm:p-5.5 transition-all duration-200 hover:border-border-strong hover:shadow-md hover:-translate-y-0.5"
    >
      <div>
        {/* Top Header: Code & Status */}
        <div className="flex items-start justify-between gap-2">
          <span className="rounded bg-surface-2 px-2 py-0.5 text-sm font-bold tracking-wider text-text border border-border">
            {item.roadRefno}
          </span>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-sm", statusBadgeClass)}>
            {statusText}
          </span>
        </div>

        {/* Highway Title & Section */}
        <h3 className="mt-3 text-lg font-bold text-text leading-snug">
          {item.title}
        </h3>

        {/* Exact Location */}
        {item.location && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <span className="shrink-0 text-brand">
              <MapPinIcon width={16} height={16} />
            </span>
            <span>{item.location}</span>
            {item.chainage && (
              <span className="text-sm text-muted">({item.chainage})</span>
            )}
          </p>
        )}

        {/* Disruptive Details Block */}
        <div className="mt-3 rounded-lg border border-border/80 bg-surface-2/60 p-3 text-sm space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-muted">{locale === "ne" ? "कारण" : "Cause"}:</span>
            <span className="font-semibold text-text">{localizeClosureReason(item.closureReason, locale)}</span>
          </div>

          {item.repairEta && (
            <div className="flex justify-between gap-2">
              <span className="text-muted">{locale === "ne" ? "खुल्ने अनुमान" : "Repair ETA"}:</span>
              <span className="font-medium text-warning">{localizeRepairEta(item.repairEta, locale)}</span>
            </div>
          )}

          {item.effortsBeingMade && (
            <p className="pt-1 text-sm leading-relaxed text-muted border-t border-border/60">
              <strong className="text-text">{locale === "ne" ? "प्रयास" : "Effort"}:</strong>{" "}
              {item.effortsBeingMade}
            </p>
          )}

          {item.remarks && (
            <p className="text-sm leading-relaxed text-muted italic">
              &ldquo;{item.remarks}&rdquo;
            </p>
          )}
        </div>

        {/* Contact info if available */}
        {item.contactPerson && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-muted">
            <PhoneIcon width={12} height={12} className="shrink-0 text-brand" />
            <span>{item.contactPerson}</span>
          </div>
        )}

        {/* Demographic headcounts if available */}
        {item.affectedDemography?.householdCount ? (
          <p className="mt-2 text-sm text-muted">
            {locale === "ne" ? "प्रभावित जनसंख्या" : "Affected area"}: ~
            {item.affectedDemography.householdCount.toLocaleString()} {locale === "ne" ? "घरधुरी" : "households"}
          </p>
        ) : null}
      </div>

      {/* Footer action buttons */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-sm">
        <span className="text-muted text-sm" suppressHydrationWarning>
          {item.startedAt ? timeAgo(item.startedAt, locale) : ""}
        </span>

        {item.lat != null && item.lng != null ? (
          <Link
            href={`/map?lat=${item.lat}&lng=${item.lng}&zoom=14&title=${encodeURIComponent(item.roadRefno + ": " + (item.location || item.title))}`}
            className="inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-brand hover:text-brand-strong transition-colors"
          >
            <span>{locale === "ne" ? "नक्सामा हेर्नुहोस्" : "View on Map"}</span>
            <ArrowIcon width={16} height={16} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
