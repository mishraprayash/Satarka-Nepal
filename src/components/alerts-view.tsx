"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { Alert, AlertsResponse, HazardType, Severity } from "@/lib/types";

import { SEVERITY_RANK } from "@/lib/types";
import type { Locale } from "@/i18n/routing";
import dynamic from "next/dynamic";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { HAZARD_ORDER, SEVERITY_ORDER, SEVERITY_CHIP, SEVERITY_TEXT } from "@/lib/ui";
import { haversineKm, type LatLng } from "@/lib/distance";
import { useAlerts } from "@/lib/use-alerts";
import { useUserLocation } from "@/lib/use-user-location";
import { AlertCard } from "@/components/alert-card";
import { SourceHealthList } from "@/components/source-health-list";
import { SectionHeader } from "@/components/section";
import { HazardGlyph, SeverityGlyph, SearchIcon, CloseIcon } from "@/components/icons";
import { usePagination, PaginationControl } from "@/components/pagination";


const AlertDetailModal = dynamic(

  () => import("@/components/alert-detail-modal").then((m) => m.AlertDetailModal),
  { ssr: false }
);


type HazardFilter = HazardType | "all";
type SeverityFilter = Severity | "all";
type SortMode = "severity" | "date" | "distance";

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 min-h-11 rounded-chip border-2 px-4 py-2 text-base font-medium transition-all cursor-pointer active:scale-95",
        active
          ? "border-brand bg-brand text-brand-fg font-semibold shadow-xs"
          : "border-border text-text hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

export function AlertsView({ initialData }: { initialData?: AlertsResponse }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { response, fromCache, cachedAt, isLoading, isError, refetch, isFetching } = useAlerts(120_000, initialData);

  const tc = useTranslations("common");
  const ta = useTranslations("alerts");
  const th = useTranslations("hazards");
  const tsev = useTranslations("severity");
  const to = useTranslations("offline");
  const thome = useTranslations("home");
  const tact = useTranslations("actions");
  const tv = useTranslations("verdict");

  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get("q") ?? "");
  const [hazard, setHazard] = useState<HazardFilter>(() => {
    const h = searchParams?.get("hazard");
    return h && HAZARD_ORDER.includes(h as HazardType) ? (h as HazardType) : "all";
  });
  const [severity, setSeverity] = useState<SeverityFilter>(() => {
    const s = searchParams?.get("severity");
    return s && SEVERITY_ORDER.includes(s as Severity) ? (s as Severity) : "all";
  });
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const s = searchParams?.get("sort");
    return s === "date" || s === "distance" ? s : "severity";
  });
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(() => searchParams?.get("alert") ?? null);
  const { coords: userPos, locating, requestLocation: triggerLocation } = useUserLocation();

  const requestLocation = useCallback(() => {
    triggerLocation(() => {
      setSortMode("distance");
    });
  }, [triggerLocation]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const showFetching = mounted && isFetching;

  // Sync state to URL params seamlessly without unnecessary router transitions on mount
  useEffect(() => {
    if (!mounted) return;
    const currentQs = searchParams?.toString() ?? "";
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (hazard !== "all") params.set("hazard", hazard);
    if (severity !== "all") params.set("severity", severity);
    if (sortMode !== "severity") params.set("sort", sortMode);
    if (selectedAlertId) params.set("alert", selectedAlertId);

    const qs = params.toString();
    if (qs !== currentQs) {
      const target = qs ? `${pathname}?${qs}` : pathname;
      router.replace(target, { scroll: false });
    }
  }, [searchQuery, hazard, severity, sortMode, selectedAlertId, pathname, router, mounted, searchParams]);

  const alerts = response?.alerts ?? [];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let result = alerts.filter((a) => {
      if (hazard !== "all" && a.hazard !== hazard) return false;
      if (severity !== "all" && a.severity !== severity) return false;
      if (!q) return true;

      const titleEn = a.title?.en?.toLowerCase() ?? "";
      const titleNe = a.title?.ne?.toLowerCase() ?? "";
      const descEn = a.description?.en?.toLowerCase() ?? "";
      const descNe = a.description?.ne?.toLowerCase() ?? "";
      const place = (a.location?.name ?? "").toLowerCase();
      const district = (a.location?.district ?? "").toLowerCase();
      const basin = (a.location?.basin ?? "").toLowerCase();
      const sourceName = a.source?.name?.toLowerCase() ?? "";
      const hazardName = a.hazard.toLowerCase();

      return (
        titleEn.includes(q) ||
        titleNe.includes(q) ||
        descEn.includes(q) ||
        descNe.includes(q) ||
        place.includes(q) ||
        district.includes(q) ||
        basin.includes(q) ||
        sourceName.includes(q) ||
        hazardName.includes(q)
      );
    });

    if (sortMode === "date") {
      result = [...result].sort(
        (a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt),
      );
    } else if (sortMode === "distance" && userPos) {
      result = [...result].sort((a, b) => {
        const distA =
          a.location?.lat != null && a.location?.lng != null
            ? haversineKm(userPos, { lat: a.location.lat, lng: a.location.lng })
            : Infinity;
        const distB =
          b.location?.lat != null && b.location?.lng != null
            ? haversineKm(userPos, { lat: b.location.lat, lng: b.location.lng })
            : Infinity;
        return distA - distB;
      });
    } else {
      // Default: sort by severity (highest first), then time
      result = [...result].sort(
        (a, b) =>
          SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
          Date.parse(b.issuedAt) - Date.parse(a.issuedAt),
      );
    }

    return result;
  }, [alerts, hazard, severity, sortMode, userPos, searchQuery]);

  const activeAlert = useMemo(
    () => (selectedAlertId ? alerts.find((a) => a.id === selectedAlertId) ?? null : null),
    [alerts, selectedAlertId],
  );

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage
  } = usePagination(filtered, 12);

  useEffect(() => {
    goToPage(1);
  }, [searchQuery, hazard, severity, sortMode]);

  const handleSelectAlert = useCallback((a: Alert) => {
    setSelectedAlertId(a.id);
  }, []);

  if (isLoading) {
    return (
      <div className="card grid place-items-center p-12 text-sm text-muted" aria-busy>
        {tc("loading")}
      </div>
    );
  }

  if (isError || !response) {
    return (
      <div className="card flex flex-col items-start gap-3 p-6">
        <p className="text-sm text-muted">{tc("error")}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
        >
          {tact("retry")}
        </button>
      </div>
    );
  }

  const okCount = response.sources.filter((s) => s.ok).length;
  const total = response.sources.length;
  const degraded = okCount < total;
  const hasActiveFilters = hazard !== "all" || severity !== "all" || searchQuery.trim().length > 0;

  // Aggregate "should I act?" verdict, driven by the most severe active alert.
  const worstSeverity = alerts.reduce<Severity | null>(
    (worst, a) =>
      worst === null || SEVERITY_RANK[a.severity] > SEVERITY_RANK[worst] ? a.severity : worst,
    null,
  );
  const verdictKey =
    worstSeverity && SEVERITY_RANK[worstSeverity] >= SEVERITY_RANK.watch ? worstSeverity : "none";
  const verdictTone: Severity = verdictKey === "none" ? "info" : (verdictKey as Severity);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Plain-language "should I act?" answer comes first */}
      <div
        role={verdictKey === "danger" ? "alert" : "status"}
        className={cn("flex items-start gap-4 rounded-card border-2 p-5 sm:p-6", SEVERITY_CHIP[verdictTone], verdictKey === "none" ? "border-border" : "border-current")}
      >
        <SeverityGlyph severity={verdictTone} width={32} height={32} className={cn("mt-0.5 shrink-0", SEVERITY_TEXT[verdictTone])} />
        <div>
          <p className={cn("text-xl font-bold", SEVERITY_TEXT[verdictTone])}>{tv(`${verdictKey}.title`)}</p>
          <p className="mt-1 text-lg leading-relaxed text-text">{tv(`${verdictKey}.body`)}</p>
        </div>
      </div>

      {/* Honest state banners */}
      {fromCache ? (
        <p
          role="status"
          suppressHydrationWarning
          className="rounded-card border border-watch/40 bg-watch-soft px-4 py-2.5 text-sm text-watch"
        >
          {to("banner", { time: timeAgo(new Date(cachedAt ?? Date.now()).toISOString(), locale) })}
        </p>
      ) : null}

      {degraded ? (
        <div className="rounded-card border border-border-strong bg-surface-2 px-4 py-3">
          <p className="text-sm font-semibold">{ta("degradedTitle")}</p>
          <p className="mt-1 text-sm text-muted">{ta("degradedBody")}</p>
        </div>
      ) : null}

      {/* Top Search & Refresh Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search input with icons */}
        <div className="relative flex-1 max-w-lg">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted" aria-hidden>
            <SearchIcon width={20} height={20} />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ta("searchPlaceholder")}
            className="w-full h-14 rounded-chip border-2 border-border-strong bg-surface pl-12 pr-12 text-lg text-text placeholder:text-muted transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={ta("clearSearch")}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-text transition-colors"
            >
              <CloseIcon width={20} height={20} />
            </button>
          ) : null}
        </div>

        {/* Freshness & Refresh button group */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="text-left sm:text-right text-sm text-faint">
            <p className="tabular" suppressHydrationWarning>{tc("updatedAgo", { time: timeAgo(response.generatedAt, locale) })}</p>
            <p>{thome("reachable", { ok: okCount, total })}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={showFetching}
            className={cn(
              "btn btn-secondary",
              showFetching && "opacity-60 cursor-not-allowed",
            )}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={showFetching ? "animate-spin text-brand" : "text-muted"}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>{tact("refresh")}</span>
          </button>
        </div>
      </div>

      {/* Filters: hazard type is always visible; the rest lives under "More filters" */}
      <div className="space-y-4">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="mb-2 w-full text-base font-semibold">{ta("filterHazard")}</legend>
          <FilterChip active={hazard === "all"} onClick={() => setHazard("all")}>
            {ta("filterAll")}
          </FilterChip>
          {HAZARD_ORDER.map((h) => (
            <FilterChip key={h} active={hazard === h} onClick={() => setHazard(h)}>
              <HazardGlyph hazard={h} width={18} height={18} />
              {th(`${h}.name`)}
            </FilterChip>
          ))}
        </fieldset>

        <details className="group rounded-card border border-border bg-surface" open={severity !== "all" || sortMode !== "severity"}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-base font-semibold [&::-webkit-details-marker]:hidden">
            {ta("moreFilters")}
            <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="space-y-5 border-t border-border p-4">
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="mb-2 w-full text-base font-semibold">{ta("filterSeverity")}</legend>
              <FilterChip active={severity === "all"} onClick={() => setSeverity("all")}>
                {ta("filterAll")}
              </FilterChip>
              {SEVERITY_ORDER.map((s) => (
                <FilterChip key={s} active={severity === s} onClick={() => setSeverity(s)}>
                  <SeverityGlyph severity={s} width={18} height={18} />
                  {tsev(`${s}.label`)}
                </FilterChip>
              ))}
            </fieldset>
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="mb-2 w-full text-base font-semibold">{ta("sortBy")}</legend>
              <FilterChip active={sortMode === "severity"} onClick={() => setSortMode("severity")}>
                {ta("sortSeverity")}
              </FilterChip>
              <FilterChip active={sortMode === "date"} onClick={() => setSortMode("date")}>
                {ta("sortDate")}
              </FilterChip>
              <FilterChip
                active={sortMode === "distance"}
                onClick={() => (userPos ? setSortMode("distance") : requestLocation())}
              >
                {locating ? tc("loading") : ta("sortDistance")}
              </FilterChip>
            </fieldset>
          </div>
        </details>
      </div>

      {/* Result metrics bar */}
      <div className="flex items-center justify-between text-sm text-faint">
        <span>
          {searchQuery.trim() ? (
            <span>
              {ta("resultsCount", { count: filtered.length })} (filtered from {alerts.length})
            </span>
          ) : (
            <span>{ta("resultsCount", { count: filtered.length })}</span>
          )}
        </span>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setHazard("all");
              setSeverity("all");
            }}
            className="text-sm text-brand hover:underline cursor-pointer"
          >
            {ta("resetFilters")}
          </button>
        ) : null}
      </div>

      {/* Results Grid */}
      {filtered.length > 0 ? (
        <>
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paginatedItems.map((a, idx) => (
              <AlertCard
                key={`${a.id}-${idx}`}
                alert={a}
                onSelect={handleSelectAlert}
              />
            ))}
          </div>
          <PaginationControl
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              goToPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      ) : hasActiveFilters ? (
        <div className="card border-dashed p-8 text-center">
          <p className="text-sm font-semibold text-text">{ta("noMatches")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{ta("noMatchesNote")}</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setHazard("all");
              setSeverity("all");
            }}
            className="mt-3 inline-flex items-center rounded-chip border border-border-strong px-3.5 py-1.5 text-sm font-medium text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            {ta("resetFilters")}
          </button>
        </div>
      ) : (
        <div className="card border-dashed p-8 text-center">
          <p className="text-sm font-medium">{ta("empty")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">{ta("emptyNote")}</p>
        </div>
      )}

      {/* Source health — exactly where each number comes from */}
      <section className="border-t border-border pt-8">
        <SectionHeader title={ta("healthTitle")} sub={ta("healthSub")} className="mb-5" />
        <SourceHealthList sources={response.sources} />
      </section>

      {activeAlert ? (
        <AlertDetailModal
          alert={activeAlert}
          isOpen={!!activeAlert}
          onClose={() => setSelectedAlertId(null)}
        />
      ) : null}
    </div>
  );
}
