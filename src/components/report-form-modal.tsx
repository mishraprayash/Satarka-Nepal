"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { CloseIcon, MapPinIcon, HazardGlyph } from "@/components/icons";
import { cn } from "@/lib/cn";
import { NEPAL_DISTRICTS } from "@/lib/districts";
import type { HazardType } from "@/lib/types";

const INPUT =
  "w-full min-h-12 rounded-chip border-2 border-border-strong bg-surface px-4 py-2.5 text-base text-text focus:border-brand focus:outline-none disabled:opacity-50";
const HAZARD_CHOICES: { value: HazardType; en: string; ne: string }[] = [
  { value: "flood", en: "Flood", ne: "बाढी" },
  { value: "landslide", en: "Landslide", ne: "पहिरो" },
  { value: "earthquake", en: "Earthquake", ne: "भूकम्प" },
  { value: "glof", en: "Glacial lake flood", ne: "हिमताल विस्फोट" },
];

/**
 * Community report submission dialog. Stays mounted while closed so a
 * half-written report survives closing and reopening.
 */
export function ReportFormModal({
  open,
  onClose,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const locale = useLocale();
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

  // Each time the dialog opens, clear the previous attempt's status.
  useEffect(() => {
    if (open) {
      setError(null);
      setSuccess(false);
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const honeypot = (e.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "";

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
          website: honeypot,
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
      onSubmitted();
      setTimeout(() => {
        setSuccess(false);
        onClose();
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-form-title"
    >
      <div className="dialog-backdrop" onClick={loading ? undefined : onClose} aria-hidden />
      <div className="dialog-panel max-w-xl">
        <div className="dialog-header">
          <div>
            <h2 id="report-form-title" className="text-2xl font-bold text-text">
              {locale === "ne" ? "विपद् रिपोर्ट दर्ता गर्नुहोस्" : "Submit Disaster Report"}
            </h2>
            <p className="text-sm text-muted mt-0.5">
              {locale === "ne" ? "स्थान तथा विवरण अनिवार्य छन्" : "District & address details are required"}
            </p>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="icon-btn -mr-2 -mt-1 disabled:opacity-50"
            aria-label={locale === "ne" ? "बन्द गर्नुहोस्" : "Close"}
          >
            <CloseIcon width={22} height={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="dialog-body space-y-6">
        {success && (
          <div role="status" className="rounded-card border-l-4 border-advisory-solid bg-advisory-soft p-4 text-base font-semibold text-advisory">
            {locale === "ne"
              ? "रिपोर्ट सफलतापूर्वक दर्ता भयो! समुदायलाई सुरक्षित राख्न मद्दत गर्नुभएकोमा धन्यवाद।"
              : "Report submitted successfully! Thank you for helping keep communities safe."}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-card border-l-4 border-danger-solid bg-danger-soft p-4 text-base font-semibold text-danger">
            {error}
          </div>
        )}

        {/* Safety first */}
        <p className="rounded-card bg-surface-2 p-4 text-base">
          <strong>{locale === "ne" ? "कसैलाई तत्काल खतरा छ?" : "Is someone in immediate danger?"}</strong>{" "}
          {locale === "ne" ? "पहिले १०० वा १०२ मा फोन गर्नुहोस्।" : "Call 100 or 102 first."}
        </p>

          {/* Honeypot for bots: hidden from people and assistive tech, never filled in by hand. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>
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

        </div>
          <div className="dialog-footer flex-col-reverse sm:flex-row">
            <button type="button" disabled={loading} onClick={onClose} className="btn btn-secondary disabled:opacity-50">
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
  );
}
