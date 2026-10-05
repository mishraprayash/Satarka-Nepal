"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { SectionHeader } from "@/components/section";
import { usePagination, PaginationControl } from "@/components/pagination";
import { AlertCard } from "@/components/alert-card";
import { CloseIcon, MapPinIcon, SearchIcon, HazardGlyph } from "@/components/icons";
import { cn } from "@/lib/cn";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import type { Alert, HazardType, Severity, Timeframe } from "@/lib/types";

const AlertDetailModal = dynamic(
  () => import("@/components/alert-detail-modal").then((m) => m.AlertDetailModal),
  { ssr: false },
);

const INPUT =
  "w-full min-h-12 rounded-chip border-2 border-border-strong bg-surface px-4 py-2.5 text-base text-text focus:border-brand focus:outline-none disabled:opacity-50";
const HAZARD_CHOICES: { value: HazardType; en: string; ne: string }[] = [
  { value: "flood", en: "Flood", ne: "बाढी" },
  { value: "landslide", en: "Landslide", ne: "पहिरो" },
  { value: "earthquake", en: "Earthquake", ne: "भूकम्प" },
  { value: "glof", en: "Glacial lake flood", ne: "हिमताल विस्फोट" },
];

export default function ReportPage() {
  const locale = useLocale();

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const [formData, setFormData] = useState({
    hazard: "flood",
    district: "",
    address: "",
    description: "",
    lat: "",
    lng: "",
  });

  // Reports List State
  const [reports, setReports] = useState<any[]>([]);
  const [fetchingReports, setFetchingReports] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHazard, setFilterHazard] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterDate, setFilterDate] = useState("all"); // 'all', '24h', '7d', '30d'

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setFetchingReports(true);
    try {
      const res = await fetch("/api/report/list");
      if (!res.ok) {
        throw new Error("Failed to fetch reports");
      }
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) {
      console.error("[report-page] error fetching reports", e);
    } finally {
      setFetchingReports(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setError(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError(
        locale === "ne"
          ? "तपाईंको ब्राउजरमा जीपीएस समर्थित छैन।"
          : "Geolocation is not supported by your browser."
      );
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
        }));
        setLocating(false);
      },
      (err) => {
        console.warn("[report-page] geolocation error", err);
        setError(
          locale === "ne"
            ? "जीपीएस पत्ता लगाउन सकिएन। तपाईं जिल्ला र ठेगाना भरेर रिपोर्ट दर्ता गर्न सक्नुहुन्छ।"
            : "Unable to retrieve your GPS location. You can still submit district & address."
        );
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedDistrict = formData.district.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedDescription = formData.description.trim();

    if (trimmedDistrict.length < 2) {
      setError(
        locale === "ne"
          ? "कृपया मान्य जिल्ला उल्लेख गर्नुहोस्।"
          : "Please enter a valid district."
      );
      return;
    }

    if (trimmedAddress.length < 2) {
      setError(
        locale === "ne"
          ? "कृपया स्पष्ट ठेगाना वा स्थान खुलाउनुहोस्।"
          : "Please provide a specific address or location."
      );
      return;
    }

    if (trimmedDescription.length < 4) {
      setError(
        locale === "ne"
          ? "विवरण कम्तीमा ४ अक्षरको हुनुपर्छ।"
          : "Description must be at least 4 characters long."
      );
      return;
    }

    // Process coordinates
    let latNum: number | null = null;
    let lngNum: number | null = null;

    const latRaw = formData.lat.trim();
    const lngRaw = formData.lng.trim();

    if (latRaw || lngRaw) {
      if (!latRaw || !lngRaw) {
        setError(
          locale === "ne"
            ? "कृपया अक्षांश र देशान्तर दुवै भर्नुहोस् वा दुवै खाली छोड्नुहोस्।"
            : "Please provide both latitude and longitude, or leave both empty."
        );
        return;
      }

      latNum = parseFloat(latRaw);
      lngNum = parseFloat(lngRaw);

      if (Number.isNaN(latNum) || !Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
        setError(
          locale === "ne"
            ? "अक्षांश -९० देखि ९० डिग्रीको बीचमा मान्य संख्या हुनुपर्छ।"
            : "Latitude must be a valid number between -90 and 90 degrees."
        );
        return;
      }

      if (Number.isNaN(lngNum) || !Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
        setError(
          locale === "ne"
            ? "देशान्तर -१८० देखि १८० डिग्रीको बीचमा मान्य संख्या हुनुपर्छ।"
            : "Longitude must be a valid number between -180 and 180 degrees."
        );
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazard: formData.hazard,
          district: trimmedDistrict,
          address: trimmedAddress,
          description: trimmedDescription,
          lat: latNum,
          lng: lngNum,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        if (Array.isArray(errorData?.details) && errorData.details.length > 0) {
          const detailedMsg = errorData.details.map((d: any) => d.message).join(". ");
          throw new Error(detailedMsg);
        }
        throw new Error(
          errorData?.error ||
            (locale === "ne"
              ? "रिपोर्ट दर्ता गर्न असफल भयो। कृपया पुन: प्रयास गर्नुहोस्।"
              : "Failed to submit report. Please try again.")
        );
      }

      setSuccess(true);
      setFormData({
        hazard: "flood",
        district: "",
        address: "",
        description: "",
        lat: "",
        lng: "",
      });
      fetchReports();
      setTimeout(() => {
        setSuccess(false);
        setIsModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setError(
        err.message ||
          (locale === "ne"
            ? "इन्टरनेट वा नेटवर्कमा समस्या आयो।"
            : "Network error occurred. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  // Convert raw DB reports to standard Alert types
  const formattedReports: Alert[] = useMemo(() => {
    return reports.map((r) => {
      const canonicalDistrict = r.district || "Nepal";
      const titleEn = r.title_en || `Community Report: ${String(r.hazard || "").toUpperCase()} in ${canonicalDistrict}`;
      const titleNe = r.title_ne || `सामुदायिक रिपोर्ट: ${canonicalDistrict}मा ${r.hazard || "प्रकोप"}`;
      const descEn = r.description_en || r.description || "";
      const descNe = r.description_ne || descEn;

      const numLat = r.lat != null && r.lat !== "" ? Number(r.lat) : null;
      const numLng = r.lng != null && r.lng !== "" ? Number(r.lng) : null;
      const hasCoords =
        numLat !== null &&
        numLng !== null &&
        Number.isFinite(numLat) &&
        Number.isFinite(numLng) &&
        (numLat !== 0 || numLng !== 0);

      const validHazards: HazardType[] = ["flood", "earthquake", "landslide", "glof"];
      const rawHazard = (r.hazard || "flood").toLowerCase();
      const hazard: HazardType = validHazards.includes(rawHazard as HazardType)
        ? (rawHazard as HazardType)
        : "flood";

      const validSeverities: Severity[] = ["danger", "warning", "watch", "advisory"];
      const rawSeverity = (r.severity || "advisory").toLowerCase();
      const severity: Severity = validSeverities.includes(rawSeverity as Severity)
        ? (rawSeverity as Severity)
        : "advisory";

      const timeframe: Timeframe = (r.timeframe || "now").toLowerCase() as Timeframe;

      return {
        id: r.id,
        hazard,
        severity,
        timeframe,
        title: { en: titleEn, ne: titleNe },
        description: { en: descEn, ne: descNe },
        issuedAt: r.issued_at || r.created_at || new Date().toISOString(),
        location: {
          lat: hasCoords ? numLat! : undefined,
          lng: hasCoords ? numLng! : undefined,
          name: r.location_name || r.district || "Nepal",
          district: r.district || undefined,
        },
        source: {
          id: r.source_id || "community",
          name: r.source_name || "Community Reports",
          url: r.source_url || "/report",
          status: r.source_status || "recent",
          fetchedAt: r.issued_at || r.created_at || new Date().toISOString(),
        },
        provenance: "community",
        meta: typeof r.meta === "object" && r.meta !== null ? r.meta : {},
      };
    });
  }, [reports]);

  // Apply filters
  const filteredReports = useMemo(() => {
    return formattedReports.filter((r) => {
      if (filterHazard !== "all" && r.hazard.toLowerCase() !== filterHazard.toLowerCase()) {
        return false;
      }
      if (filterSeverity !== "all" && r.severity.toLowerCase() !== filterSeverity.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const titleEn = r.title?.en?.toLowerCase() || "";
        const titleNe = r.title?.ne?.toLowerCase() || "";
        const descEn = r.description?.en?.toLowerCase() || "";
        const descNe = r.description?.ne?.toLowerCase() || "";
        const locName = r.location?.name?.toLowerCase() || "";
        const locDist = r.location?.district?.toLowerCase() || "";

        // Also check Nepali district lookup
        const matchedDist = NEPAL_DISTRICTS.find(
          (d) =>
            d.id.toLowerCase() === locDist ||
            d.en.toLowerCase().includes(locDist)
        );
        const distNe = matchedDist?.ne.toLowerCase() || "";

        const match =
          titleEn.includes(q) ||
          titleNe.includes(q) ||
          descEn.includes(q) ||
          descNe.includes(q) ||
          locName.includes(q) ||
          locDist.includes(q) ||
          distNe.includes(q);

        if (!match) return false;
      }
      if (filterDate !== "all") {
        const reportDate = new Date(r.issuedAt).getTime();
        const now = Date.now();
        if (Number.isNaN(reportDate)) return false;
        if (filterDate === "24h" && now - reportDate > 24 * 60 * 60 * 1000) return false;
        if (filterDate === "7d" && now - reportDate > 7 * 24 * 60 * 60 * 1000) return false;
        if (filterDate === "30d" && now - reportDate > 30 * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [formattedReports, filterHazard, filterSeverity, filterDate, searchQuery]);

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
          onClick={() => {
            setError(null);
            setSuccess(false);
            setIsModalOpen(true);
          }}
          className="btn btn-primary shrink-0"
        >
          <span className="text-lg leading-none">+</span>
          <span>{locale === "ne" ? "विपद् रिपोर्ट गर्नुहोस्" : "Report a Disaster"}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-2/40 border border-border p-3.5 rounded-2xl">
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
              onClick={() => {
                setError(null);
                setSuccess(false);
                setIsModalOpen(true);
              }}
              className="btn btn-primary mt-5"
            >
              + {locale === "ne" ? "नयाँ रिपोर्ट दर्ता गर्नुहोस्" : "Submit New Report"}
            </button>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
          <div className="relative max-h-[95dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-7">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-2xl font-bold text-text">
                  {locale === "ne" ? "विपद् रिपोर्ट दर्ता गर्नुहोस्" : "Submit Disaster Report"}
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  {locale === "ne" ? "स्थान तथा विवरण अनिवार्य छन्" : "District & address details are required"}
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsModalOpen(false)}
                className="grid size-12 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text transition-colors disabled:opacity-50 cursor-pointer"
                aria-label={locale === "ne" ? "बन्द गर्नुहोस्" : "Close"}
              >
                <CloseIcon width={22} height={22} />
              </button>
            </div>

            {/* Status alerts */}
            {success && (
              <div className="mt-4 rounded-chip bg-green-500/10 p-4 border-2 border-green-500/40 text-base font-medium text-green-700 dark:text-green-400">
                ✓{" "}
                {locale === "ne"
                  ? "रिपोर्ट सफलतापूर्वक दर्ता भयो! समुदायलाई सुरक्षित राख्न मद्दत गर्नुभएकोमा धन्यवाद।"
                  : "Report submitted successfully! Thank you for helping keep communities safe."}
              </div>
            )}

            {error && (
              <div role="alert" className="mt-4 rounded-chip bg-red-500/10 p-4 border-2 border-red-500/40 text-base font-medium text-red-700 dark:text-red-400">
                ⚠ {error}
              </div>
            )}

            {/* Modal Form */}
            {/* Safety first */}
            <p className="mt-4 rounded-chip border-2 border-danger/40 bg-danger-soft p-3.5 text-base">
              <strong>{locale === "ne" ? "कसैलाई तत्काल खतरा छ?" : "Is someone in immediate danger?"}</strong>{" "}
              {locale === "ne" ? "पहिले १०० वा १०२ मा फोन गर्नुहोस्।" : "Call 100 or 102 first."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              <fieldset>
                <legend className="mb-2 text-lg font-semibold">
                  {locale === "ne" ? "१. के भएको छ?" : "1. What is happening?"}
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {HAZARD_CHOICES.map((h) => {
                    const on = formData.hazard === h.value;
                    return (
                      <label
                        key={h.value}
                        className={cn(
                          "flex min-h-16 cursor-pointer items-center gap-3 rounded-chip border-2 p-3 text-base font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                          on ? "border-brand bg-brand-soft text-brand" : "border-border hover:bg-surface-2",
                          (loading || success) && "opacity-50",
                        )}
                      >
                        <input
                          type="radio"
                          name="hazard"
                          value={h.value}
                          checked={on}
                          disabled={loading || success}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <HazardGlyph hazard={h.value} width={26} height={26} />
                        <span>{locale === "ne" ? h.ne : h.en}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="space-y-4">
                <legend className="mb-2 text-lg font-semibold">
                  {locale === "ne" ? "२. कहाँ?" : "2. Where?"}
                </legend>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating || loading || success}
                  className="btn btn-secondary w-full disabled:opacity-50"
                >
                  <MapPinIcon width={20} height={20} />
                  {locating
                    ? locale === "ne" ? "स्थान खोज्दै…" : "Finding location…"
                    : formData.lat && formData.lng
                      ? locale === "ne" ? "✓ स्थान थपियो" : "✓ Location added"
                      : locale === "ne" ? "मेरो हालको स्थान प्रयोग गर्नुहोस्" : "Use my current location"}
                </button>
                <div>
                  <label htmlFor="rep-district" className="mb-1.5 block text-base font-medium">
                    {locale === "ne" ? "जिल्ला (अनिवार्य)" : "District (required)"}
                  </label>
                  <select
                    id="rep-district"
                    name="district"
                    required
                    disabled={loading || success}
                    value={formData.district}
                    onChange={handleChange}
                    className={INPUT}
                  >
                    <option value="" disabled>
                      {locale === "ne" ? "जिल्ला छान्नुहोस्…" : "Choose district…"}
                    </option>
                    {NEPAL_DISTRICTS.map((d) => {
                      const cleanEn = d.en.replace(/\s*\(.*?\)/, "").trim();
                      return (
                        <option key={d.id} value={cleanEn}>
                          {locale === "ne" ? d.ne : d.en}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label htmlFor="rep-address" className="mb-1.5 block text-base font-medium">
                    {locale === "ne" ? "ठाउँको नाम (अनिवार्य)" : "Place name (required)"}
                  </label>
                  <input
                    id="rep-address"
                    type="text"
                    name="address"
                    required
                    disabled={loading || success}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder={locale === "ne" ? "उदा: मेलम्ची बजार, वडा नं ४" : "e.g. Melamchi Bazar, Ward 4"}
                    className={INPUT}
                  />
                </div>
                <details className="text-base">
                  <summary className="cursor-pointer font-medium text-brand">
                    {locale === "ne" ? "निर्देशांक आफैं हाल्नुहोस् (ऐच्छिक)" : "Enter coordinates yourself (optional)"}
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      step="any"
                      name="lat"
                      aria-label={locale === "ne" ? "अक्षांश" : "Latitude"}
                      disabled={loading || success}
                      value={formData.lat}
                      onChange={handleChange}
                      placeholder={locale === "ne" ? "अक्षांश" : "Latitude"}
                      className={INPUT}
                    />
                    <input
                      type="number"
                      step="any"
                      name="lng"
                      aria-label={locale === "ne" ? "देशान्तर" : "Longitude"}
                      disabled={loading || success}
                      value={formData.lng}
                      onChange={handleChange}
                      placeholder={locale === "ne" ? "देशान्तर" : "Longitude"}
                      className={INPUT}
                    />
                  </div>
                </details>
              </fieldset>

              <div>
                <label htmlFor="rep-desc" className="mb-2 block text-lg font-semibold">
                  {locale === "ne" ? "३. तपाईंले के देख्नुभयो?" : "3. What did you see?"}
                </label>
                <textarea
                  id="rep-desc"
                  name="description"
                  required
                  rows={4}
                  disabled={loading || success}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={
                    locale === "ne"
                      ? "पानीको सतह कति बढेको छ? बाटो अवरुद्ध छ? छोटकरीमा लेख्नुहोस्…"
                      : "For example: river is rising fast, road is blocked…"
                  }
                  className={INPUT}
                />
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" disabled={loading} onClick={() => setIsModalOpen(false)} className="btn btn-secondary disabled:opacity-50">
                  {locale === "ne" ? "रद्द गर्नुहोस्" : "Cancel"}
                </button>
                <button type="submit" disabled={loading || success} className="btn btn-primary disabled:opacity-50">
                  {loading
                    ? locale === "ne" ? "पठाउँदैछ…" : "Sending…"
                    : success
                      ? locale === "ne" ? "सम्पन्न भयो!" : "Sent!"
                      : locale === "ne" ? "रिपोर्ट पठाउनुहोस्" : "Send report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
