"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { HighwayBlockage, HighwaysResponse, HighwayStatus } from "@/lib/types";
import { useHighways } from "@/lib/use-highways";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
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

  const blocked = useMemo(() => highways.filter((h) => h.status === "BLOCKED"), [highways]);
  const partial = useMemo(() => highways.filter((h) => h.status === "PARTIAL_OPEN"), [highways]);
  const open = useMemo(() => highways.filter((h) => h.status === "OPEN"), [highways]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return highways.filter((h) => {
      if (statusFilter !== "all" && h.status !== statusFilter) return false;
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

      {/* Live Stat KPI Banners */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="card flex flex-col justify-between p-4 sm:p-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {locale === "ne" ? "कुल खण्डहरू" : "Monitored Sections"}
          </span>
          <span className="text-2xl sm:text-3xl font-bold tabular text-text mt-2">{highways.length}</span>
          <span className="text-[11px] text-faint mt-1">
            {locale === "ne" ? "सडक विभाग राष्ट्रिय नेटवर्क" : "DOR National Network"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === "BLOCKED" ? "all" : "BLOCKED"))}
          className={cn(
            "card flex flex-col justify-between p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer active:scale-98 hover:-translate-y-0.5",
            statusFilter === "BLOCKED"
              ? "ring-2 ring-danger bg-danger-soft/30 shadow-xs"
              : "hover:border-border-strong",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-danger">
              {locale === "ne" ? "पूर्ण अवरुद्ध" : "Blocked / Closed"}
            </span>
            <span className="size-2 rounded-full bg-danger animate-pulse" aria-hidden />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tabular text-danger mt-2">{blocked.length}</span>
          <span className="text-[11px] text-muted mt-1">
            {locale === "ne" ? "पहिरो / लेदो अवरोध" : "Landslide / Washout"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === "PARTIAL_OPEN" ? "all" : "PARTIAL_OPEN"))}
          className={cn(
            "card flex flex-col justify-between p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer active:scale-98 hover:-translate-y-0.5",
            statusFilter === "PARTIAL_OPEN"
              ? "ring-2 ring-warning bg-warning-soft/30 shadow-xs"
              : "hover:border-border-strong",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-warning">
              {locale === "ne" ? "एकतर्फी सुचारु" : "Partial / One-Way"}
            </span>
            <span className="size-2 rounded-full bg-warning" aria-hidden />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tabular text-warning mt-2">{partial.length}</span>
          <span className="text-[11px] text-muted mt-1">
            {locale === "ne" ? "सतर्कताका साथ सञ्चालन" : "Pass with caution"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter((prev) => (prev === "OPEN" ? "all" : "OPEN"))}
          className={cn(
            "card flex flex-col justify-between p-4 sm:p-5 text-left transition-all duration-200 cursor-pointer active:scale-98 hover:-translate-y-0.5",
            statusFilter === "OPEN"
              ? "ring-2 ring-brand bg-brand-soft/30 shadow-xs"
              : "hover:border-border-strong",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand">
              {locale === "ne" ? "सुचारु / खुल्ला" : "Fully Open"}
            </span>
            <span className="size-2 rounded-full bg-advisory" aria-hidden />
          </div>
          <span className="text-2xl sm:text-3xl font-bold tabular text-brand mt-2">{open.length}</span>
          <span className="text-[11px] text-muted mt-1">
            {locale === "ne" ? "द्वितर्फी आवागमन" : "Two-way traffic"}
          </span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              locale === "ne"
                ? "राजमार्ग कोड वा स्थान खोज्नुहोस् (जस्तै NH44, मुग्लिङ, चितवन)…"
                : "Search road (e.g., NH44, Mugling, Prithvi Highway)…"
            }
            className="w-full rounded-full border border-border/80 bg-surface py-2 pl-9 pr-8 text-sm placeholder:text-muted focus:border-brand focus:outline-none shadow-2xs"
          />
          <span className="pointer-events-none absolute left-3 top-2.5 text-muted">
            <SearchIcon width={15} height={15} />
          </span>
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted hover:text-text cursor-pointer"
            >
              <CloseIcon width={14} height={14} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "BLOCKED", "PARTIAL_OPEN", "OPEN"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all cursor-pointer active:scale-95",
                statusFilter === st
                  ? "bg-text text-bg font-semibold shadow-2xs"
                  : "border border-border/80 text-muted hover:bg-surface-2 hover:text-text",
              )}
            >
              {st === "all"
                ? locale === "ne" ? "सबै" : "All"
                : st === "BLOCKED"
                  ? locale === "ne" ? "अवरुद्ध" : "Blocked"
                  : st === "PARTIAL_OPEN"
                    ? locale === "ne" ? "एकतर्फी" : "Partial"
                    : locale === "ne" ? "खुल्ला" : "Open"}
            </button>
          ))}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="rounded-full border border-border/80 p-2 text-muted hover:bg-surface-2 hover:text-text transition-colors cursor-pointer"
            title={ta("refresh")}
          >
            <span className={cn("block", isFetching && "animate-spin")}>↻</span>
          </button>
        </div>
      </div>

      {/* Highway Cards Grid */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center">
          <p className="font-semibold text-text">
            {locale === "ne" ? "कुनै सडक भेटिएन" : "No matching road sections found"}
          </p>
          <p className="mt-1 text-xs text-muted max-w-sm">
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
              className="mt-4 rounded-chip border border-border-strong px-4 py-1.5 text-xs font-medium hover:bg-surface-2 cursor-pointer"
            >
              {locale === "ne" ? "फिल्टर हटाउनुहोस्" : "Reset filters"}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <HighwayCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}

function HighwayCard({ item, locale }: { item: HighwayBlockage; locale: Locale }) {
  const isBlocked = item.status === "BLOCKED";
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
          <span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-bold tracking-wider text-text border border-border">
            {item.roadRefno}
          </span>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", statusBadgeClass)}>
            {statusText}
          </span>
        </div>

        {/* Highway Title & Section */}
        <h3 className="mt-3 text-base font-semibold text-text leading-snug line-clamp-2">
          {item.title}
        </h3>

        {/* Exact Location */}
        {item.location && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <span className="shrink-0 text-brand">
              <MapPinIcon width={13} height={13} />
            </span>
            <span className="truncate">{item.location}</span>
            {item.chainage && (
              <span className="text-[11px] text-faint">({item.chainage})</span>
            )}
          </p>
        )}

        {/* Disruptive Details Block */}
        <div className="mt-3 rounded-lg border border-border/80 bg-surface-2/60 p-3 text-xs space-y-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-muted">{locale === "ne" ? "कारण" : "Cause"}:</span>
            <span className="font-semibold text-text">{item.closureReason}</span>
          </div>

          {item.repairEta && (
            <div className="flex justify-between gap-2">
              <span className="text-muted">{locale === "ne" ? "खुल्ने अनुमान" : "Repair ETA"}:</span>
              <span className="font-medium text-warning">{item.repairEta}</span>
            </div>
          )}

          {item.effortsBeingMade && (
            <p className="pt-1 text-[11.5px] leading-relaxed text-muted border-t border-border/60">
              <strong className="text-text">{locale === "ne" ? "प्रयास" : "Effort"}:</strong>{" "}
              {item.effortsBeingMade}
            </p>
          )}

          {item.remarks && (
            <p className="text-[11.5px] leading-relaxed text-faint italic">
              &ldquo;{item.remarks}&rdquo;
            </p>
          )}
        </div>

        {/* Contact info if available */}
        {item.contactPerson && (
          <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
            <PhoneIcon width={12} height={12} className="shrink-0 text-brand" />
            <span className="truncate">{item.contactPerson}</span>
          </div>
        )}

        {/* Demographic headcounts if available */}
        {item.affectedDemography?.householdCount ? (
          <p className="mt-2 text-[11px] text-faint">
            {locale === "ne" ? "प्रभावित जनसंख्या" : "Affected area"}: ~
            {item.affectedDemography.householdCount.toLocaleString()} {locale === "ne" ? "घरधुरी" : "households"}
          </p>
        ) : null}
      </div>

      {/* Footer action buttons */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
        <span className="text-faint text-[11px]" suppressHydrationWarning>
          {item.startedAt ? timeAgo(item.startedAt, locale) : ""}
        </span>

        {item.lat != null && item.lng != null ? (
          <Link
            href={`/map?lat=${item.lat}&lng=${item.lng}&zoom=14&title=${encodeURIComponent(item.roadRefno + ": " + (item.location || item.title))}`}
            className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-strong transition-colors"
          >
            <span>{locale === "ne" ? "नक्सामा हेर्नुहोस्" : "View on Map"}</span>
            <ArrowIcon width={13} height={13} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
