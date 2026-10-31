"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { SectionHeader } from "@/components/section";
import { usePagination, PaginationControl } from "@/components/pagination";
import { AlertCard } from "@/components/alert-card";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { ReportFormModal } from "@/components/report-form-modal";
import { filterCommunityReports } from "@/lib/community-reports";
import { useCommunityReports } from "@/lib/use-community-reports";
import type { Alert } from "@/lib/types";

const AlertDetailModal = dynamic(
  () => import("@/components/alert-detail-modal").then((m) => m.AlertDetailModal),
  { ssr: false },
);

export default function ReportPage() {
  const locale = useLocale();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const { reports, isLoading: fetchingReports, refetch: fetchReports } = useCommunityReports();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHazard, setFilterHazard] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterDate, setFilterDate] = useState("all"); // 'all', '24h', '7d', '30d'

  const filteredReports = useMemo(
    () =>
      filterCommunityReports(reports, {
        hazard: filterHazard,
        severity: filterSeverity,
        date: filterDate,
        query: searchQuery,
      }),
    [reports, filterHazard, filterSeverity, filterDate, searchQuery],
  );

  const {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
  } = usePagination(filteredReports, 9);

  // Reset pagination whenever filters or underlying reports change
  useEffect(() => {
    goToPage(1);
  }, [filterHazard, filterSeverity, filterDate, searchQuery, reports]);

  return (
    <div className="shell max-w-6xl py-8 sm:py-12 space-y-8">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-6">
        <div>
          <SectionHeader
            title={locale === "ne" ? "सामुदायिक विपद् रिपोर्टहरू" : "Community Hazard Reports"}
            sub={
              locale === "ne"
                ? "नागरिक तथा स्थानीय स्वयंसेवकहरूद्वारा दर्ता गरिएका स्थलगत रिपोर्टहरू।"
                : "Live ground reports submitted by citizens and local volunteers across Nepal."
            }
          />
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary shrink-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>{locale === "ne" ? "विपद् रिपोर्ट गर्नुहोस्" : "Report a Disaster"}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-2/40 border border-border p-3.5 rounded-card">
        <div className="relative flex-1 min-w-[200px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
            <SearchIcon width={20} height={20} />
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              locale === "ne"
                ? "जिल्ला वा स्थान खोज्नुहोस्…"
                : "Search by district, location or keywords…"
            }
            className="h-12 w-full rounded-chip border-2 border-border-strong bg-surface pl-11 pr-11 text-base text-text placeholder:text-muted focus:border-brand focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-text cursor-pointer"
              aria-label={locale === "ne" ? "खोजी हटाउनुहोस्" : "Clear search"}
            >
              <CloseIcon width={20} height={20} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={filterHazard}
            onChange={(e) => setFilterHazard(e.target.value)}
            className="min-h-12 rounded-chip border-2 border-border-strong bg-surface px-3 text-base text-text focus:border-brand focus:outline-none"
          >
            <option value="all">{locale === "ne" ? "सबै प्रकोप" : "All Hazards"}</option>
            <option value="flood">{locale === "ne" ? "बाढी (Flood)" : "Flood"}</option>
            <option value="landslide">{locale === "ne" ? "पहिरो (Landslide)" : "Landslide"}</option>
            <option value="earthquake">{locale === "ne" ? "भूकम्प (Earthquake)" : "Earthquake"}</option>
            <option value="glof">{locale === "ne" ? "ग्लोफ (GLOF)" : "GLOF"}</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="min-h-12 rounded-chip border-2 border-border-strong bg-surface px-3 text-base text-text focus:border-brand focus:outline-none"
          >
            <option value="all">{locale === "ne" ? "सबै स्तर" : "All Severities"}</option>
            <option value="danger">{locale === "ne" ? "खतरा (Danger)" : "Danger"}</option>
            <option value="warning">{locale === "ne" ? "चेतावनी (Warning)" : "Warning"}</option>
            <option value="watch">{locale === "ne" ? "सतर्कता (Watch)" : "Watch"}</option>
            <option value="advisory">{locale === "ne" ? "परामर्श (Advisory)" : "Advisory"}</option>
          </select>

          <select
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="min-h-12 rounded-chip border-2 border-border-strong bg-surface px-3 text-base text-text focus:border-brand focus:outline-none"
          >
            <option value="all">{locale === "ne" ? "सबै समय" : "All Time"}</option>
            <option value="24h">{locale === "ne" ? "पछिल्लो २४ घण्टा" : "Last 24 Hours"}</option>
            <option value="7d">{locale === "ne" ? "पछिल्लो ७ दिन" : "Last 7 Days"}</option>
            <option value="30d">{locale === "ne" ? "पछिल्लो ३० दिन" : "Last 30 Days"}</option>
          </select>
        </div>
      </div>

      {/* Reports Feed */}
      <div>
        {fetchingReports ? (
          <div className="py-20 text-center text-sm text-muted animate-pulse">
            {locale === "ne" ? "रिपोर्टहरू लोड हुँदैछन्…" : "Loading community reports…"}
          </div>
        ) : paginatedItems.length > 0 ? (
          <>
            <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedItems.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onSelect={(a) => setSelectedAlert(a)}
                />
              ))}
            </div>

            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              locale={locale}
              onPageChange={(page) => {
                goToPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </>
        ) : (
          <div className="card border-dashed py-16 text-center">
            <p className="text-base font-semibold text-text">
              {locale === "ne" ? "कुनै रिपोर्ट फेला परेन" : "No community reports found"}
            </p>
            <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
              {locale === "ne"
                ? "तपाईंको क्षेत्रमा कुनै सक्रिय प्रकोप भए पहिलो रिपोर्ट दर्ता गर्नुहोस्।"
                : "No reports match the selected filters. Be the first to report an incident in your area."}
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary mt-5"
            >
              + {locale === "ne" ? "नयाँ रिपोर्ट दर्ता गर्नुहोस्" : "Submit New Report"}
            </button>
          </div>
        )}
      </div>

      <ReportFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitted={() => void fetchReports()}
      />

      {/* Alert Detail Modal when a card is clicked */}
      {selectedAlert && (
        <AlertDetailModal
          alert={selectedAlert}
          isOpen={!!selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}
