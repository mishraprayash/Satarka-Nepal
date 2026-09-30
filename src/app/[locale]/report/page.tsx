"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { SectionHeader } from "@/components/section";
import { usePagination, PaginationControl } from "@/components/pagination";
import { AlertCard } from "@/components/alert-card";
import { CloseIcon, MapPinIcon, SearchIcon } from "@/components/icons";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import type { Alert, HazardType, Severity, Timeframe } from "@/lib/types";

const AlertDetailModal = dynamic(
  () => import("@/components/alert-detail-modal").then((m) => m.AlertDetailModal),
  { ssr: false },
);

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
          className="inline-flex items-center justify-center gap-2 rounded-chip bg-brand px-5 py-2.5 text-sm font-bold text-brand-fg shadow-md transition-all hover:bg-brand-strong active:scale-95 shrink-0 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>{locale === "ne" ? "विपद् रिपोर्ट गर्नुहोस्" : "Report a Disaster"}</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-2/40 border border-border p-3.5 rounded-2xl">
        <div className="relative flex-1 min-w-[200px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
            <SearchIcon width={15} height={15} />
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
            className="w-full rounded-chip border border-border/80 bg-surface py-2 pl-9 pr-8 text-xs sm:text-sm text-text placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-text cursor-pointer"
            >
              <CloseIcon width={13} height={13} />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={filterHazard}
            onChange={(e) => setFilterHazard(e.target.value)}
            className="rounded-chip border border-border/80 bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-brand"
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
            className="rounded-chip border border-border/80 bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-brand"
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
            className="rounded-chip border border-border/80 bg-surface px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-brand"
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
            <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-chip border border-border-strong bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-2 cursor-pointer"
            >
              + {locale === "ne" ? "नयाँ रिपोर्ट दर्ता गर्नुहोस्" : "Submit New Report"}
            </button>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-surface p-6 sm:p-7 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-text">
                  {locale === "ne" ? "विपद् रिपोर्ट दर्ता गर्नुहोस्" : "Submit Disaster Report"}
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {locale === "ne" ? "स्थान तथा विवरण अनिवार्य छन्" : "District & address details are required"}
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-muted hover:bg-surface-2 hover:text-text transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>

            {/* Status alerts */}
            {success && (
              <div className="mt-4 rounded-xl bg-green-500/10 p-3.5 border border-green-500/30 text-xs font-medium text-green-700 dark:text-green-400">
                ✓{" "}
                {locale === "ne"
                  ? "रिपोर्ट सफलतापूर्वक दर्ता भयो! समुदायलाई सुरक्षित राख्न मद्दत गर्नुभएकोमा धन्यवाद।"
                  : "Report submitted successfully! Thank you for helping keep communities safe."}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-500/10 p-3.5 border border-red-500/30 text-xs font-medium text-red-700 dark:text-red-400">
                ⚠ {error}
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  {locale === "ne" ? "प्रकोपको प्रकार *" : "Hazard Type *"}
                </label>
                <select
                  name="hazard"
                  disabled={loading || success}
                  value={formData.hazard}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                >
                  <option value="flood">{locale === "ne" ? "बाढी (Flood)" : "Flood"}</option>
                  <option value="landslide">{locale === "ne" ? "पहिरो (Landslide)" : "Landslide"}</option>
                  <option value="earthquake">{locale === "ne" ? "भूकम्प (Earthquake)" : "Earthquake"}</option>
                  <option value="glof">{locale === "ne" ? "ग्लोफ (GLOF)" : "GLOF"}</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    {locale === "ne" ? "जिल्ला *" : "District *"}
                  </label>
                  <input
                    type="text"
                    name="district"
                    list="nepal-districts-list"
                    required
                    disabled={loading || success}
                    value={formData.district}
                    onChange={handleChange}
                    placeholder={
                      locale === "ne"
                        ? "उदा: काठमाडौं / सिन्धुपाल्चोक"
                        : "e.g. Kathmandu / Sindhupalchok"
                    }
                    className="w-full rounded-lg border border-border/80 bg-surface px-3.5 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                  />
                  <datalist id="nepal-districts-list">
                    {NEPAL_DISTRICTS.map((d) => {
                      const cleanEn = d.en.replace(/\s*\(.*?\)/, "").trim();
                      return (
                        <option key={d.id} value={cleanEn}>
                          {d.ne} ({d.en})
                        </option>
                      );
                    })}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    {locale === "ne" ? "ठेगाना / स्थान *" : "Address / Location *"}
                  </label>
                  <input
                    type="text"
                    name="address"
                    required
                    disabled={loading || success}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder={
                      locale === "ne"
                        ? "उदा: मेलम्ची बजार, वडा नं ४"
                        : "e.g. Melamchi Bazar, Ward 4"
                    }
                    className="w-full rounded-lg border border-border/80 bg-surface px-3.5 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1.5">
                  {locale === "ne" ? "घटनाको विवरण *" : "Description & Observations *"}
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  disabled={loading || success}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={
                    locale === "ne"
                      ? "पानीको सतह कति बढेको छ? बाटो अवरुद्ध भएको छ कि छैन? विवरण खुलाउनुहोस्…"
                      : "Describe current conditions, water levels, road blocks or damages observed…"
                  }
                  className="w-full rounded-lg border border-border/80 bg-surface px-3.5 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
                />
              </div>

              {/* Optional GPS Coordinates */}
              <div className="rounded-xl border border-border/80 bg-surface-2/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text">
                    {locale === "ne" ? "GPS निर्देशांक (ऐच्छिक)" : "GPS Coordinates (Optional)"}
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locating || loading || success}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    <MapPinIcon width={13} height={13} />
                    <span>
                      {locating
                        ? locale === "ne"
                          ? "पत्ता लगाउँदैछ…"
                          : "Detecting…"
                        : locale === "ne"
                          ? "GPS पत्ता लगाउनुहोस्"
                          : "Auto-detect GPS"}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      name="lat"
                      disabled={loading || success}
                      value={formData.lat}
                      onChange={handleChange}
                      placeholder={
                        locale === "ne"
                          ? "अक्षांश (जस्तै: २७.७१७२)"
                          : "Latitude (e.g. 27.7172)"
                      }
                      className="w-full rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      name="lng"
                      disabled={loading || success}
                      value={formData.lng}
                      onChange={handleChange}
                      placeholder={
                        locale === "ne"
                          ? "देशान्तर (जस्तै: ८५.३२४०)"
                          : "Longitude (e.g. 85.3240)"
                      }
                      className="w-full rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-xs text-text focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-chip border border-border bg-surface px-4 py-2 text-xs font-semibold text-text hover:bg-surface-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {locale === "ne" ? "रद्द गर्नुहोस्" : "Cancel"}
                </button>

                <button
                  type="submit"
                  disabled={loading || success}
                  className="rounded-chip bg-brand px-5 py-2 text-xs font-bold text-brand-fg hover:bg-brand-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  {loading
                    ? locale === "ne"
                      ? "पठाउँदैछ…"
                      : "Submitting…"
                    : success
                      ? locale === "ne"
                        ? "सम्पन्न भयो!"
                        : "Submitted!"
                      : locale === "ne"
                        ? "रिपोर्ट दर्ता गर्नुहोस्"
                        : "Submit Report"}
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
