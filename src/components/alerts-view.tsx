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
        "inline-flex items-center gap-1.5 rounded-chip border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer active:scale-95",
        active
          ? "border-brand bg-brand text-brand-fg font-semibold shadow-xs"
          : "border-border text-muted hover:bg-surface-2 hover:text-text",
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

  // Sync state to URL params seamlessly
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (hazard !== "all") params.set("hazard", hazard);
    if (severity !== "all") params.set("severity", severity);
    if (sortMode !== "severity") params.set("sort", sortMode);
    if (selectedAlertId) params.set("alert", selectedAlertId);

    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    router.replace(target, { scroll: false });
  }, [searchQuery, hazard, severity, sortMode, selectedAlertId, pathname, router]);

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

  const handleSelectAlert = useCallback((a: Alert) => {
    setSelectedAlertId(a.id);
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
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
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted" aria-hidden>
            <SearchIcon width={16} height={16} />
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={ta("searchPlaceholder")}
            className="w-full rounded-chip border border-border-strong bg-surface py-2.5 pl-10 pr-10 text-sm text-text placeholder:text-muted transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={ta("clearSearch")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-text transition-colors"
            >
              <CloseIcon width={14} height={14} />
            </button>
          ) : null}
        </div>

        {/* Freshness & Refresh button group */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="text-left sm:text-right text-xs text-faint">
            <p className="tabular" suppressHydrationWarning>{tc("updatedAgo", { time: timeAgo(response.generatedAt, locale) })}</p>
            <p>{thome("reachable", { ok: okCount, total })}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-chip border border-border-strong bg-surface px-3.5 py-2.5 text-xs font-semibold text-text shadow-xs transition-all hover:bg-surface-2 hover:border-text active:scale-95",
              isFetching && "opacity-60 cursor-not-allowed",
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
              className={isFetching ? "animate-spin text-brand" : "text-muted"}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span>{tact("refresh")}</span>
          </button>
        </div>
      </div>

      {/* Filter and Sort Panel */}
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Hazard & Severity Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
            <fieldset className="flex flex-wrap items-center gap-1.5">
              <legend className="eyebrow mb-1 w-full">{ta("filterHazard")}</legend>
              <FilterChip active={hazard === "all"} onClick={() => setHazard("all")}>
                {ta("filterAll")}
              </FilterChip>
              {HAZARD_ORDER.map((h) => (
                <FilterChip key={h} active={hazard === h} onClick={() => setHazard(h)}>
                  <HazardGlyph hazard={h} width={13} height={13} />
                  {th(`${h}.name`)}
                </FilterChip>
              ))}
            </fieldset>

            <fieldset className="flex flex-wrap items-center gap-1.5">
              <legend className="eyebrow mb-1 w-full">{ta("filterSeverity")}</legend>
              <FilterChip active={severity === "all"} onClick={() => setSeverity("all")}>
                {ta("filterAll")}
              </FilterChip>
              {SEVERITY_ORDER.map((s) => (
                <FilterChip key={s} active={severity === s} onClick={() => setSeverity(s)}>
                  <SeverityGlyph severity={s} width={13} height={13} />
                  {tsev(`${s}.label`)}
                </FilterChip>
              ))}
            </fieldset>
          </div>

          {/* Right: Sort controls */}
          <fieldset className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5 shrink-0">
            <legend className="eyebrow mb-1 w-full">{ta("sortBy")}</legend>
            <FilterChip
              active={sortMode === "severity"}
              onClick={() => setSortMode("severity")}
            >
              {ta("sortSeverity")}
            </FilterChip>
            <FilterChip
              active={sortMode === "date"}
              onClick={() => setSortMode("date")}
            >
              {ta("sortDate")}
            </FilterChip>
            <FilterChip
              active={sortMode === "distance"}
              onClick={() => {
                if (userPos) {
                  setSortMode("distance");
                } else {
                  requestLocation();
                }
              }}
            >
              {locating ? tc("loading") : ta("sortDistance")}
            </FilterChip>
          </fieldset>
        </div>
      </div>

      {/* Plain-language "should I act?" verdict for the current feed */}
      <div
        role="status"
        className={cn("rounded-card px-4 py-3", SEVERITY_CHIP[verdictTone])}
      >
        <p className={cn("text-sm font-bold", SEVERITY_TEXT[verdictTone])}>
          {tv(`${verdictKey}.title`)}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-text/80">
          {tv(`${verdictKey}.body`)}
        </p>
      </div>

      {/* Result metrics bar */}
      <div className="flex items-center justify-between text-xs text-faint">
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
            className="text-xs text-brand hover:underline cursor-pointer"
          >
            {ta("resetFilters")}
          </button>
        ) : null}
      </div>

      {/* Results Grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a, idx) => (
            <AlertCard
              key={`${a.id}-${idx}`}
              alert={a}
              onSelect={handleSelectAlert}
            />
          ))}
        </div>

      ) : hasActiveFilters ? (
        <div className="card border-dashed p-8 text-center">
          <p className="text-sm font-semibold text-text">{ta("noMatches")}</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">{ta("noMatchesNote")}</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setHazard("all");
              setSeverity("all");
            }}
            className="mt-3 inline-flex items-center rounded-chip border border-border-strong px-3.5 py-1.5 text-xs font-medium text-text hover:bg-surface-2 transition-colors cursor-pointer"
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
