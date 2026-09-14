"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { SeverityGlyph, CloseIcon, PhoneIcon, CheckIcon } from "@/components/icons";

const STORAGE_KEY = "satarka_disclaimer_ack_v1";

export function DisclaimerModal() {
  const t = useTranslations("disclaimerModal");
  const [isOpen, setIsOpen] = useState(false);
  const acknowledgeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Check on mount if user has already acknowledged
  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(STORAGE_KEY);
      if (!acknowledged) {
        // First time visitor: show disclaimer
        setIsOpen(true);
      }
    } catch {
      // If localStorage is unavailable (e.g. private browsing restriction), default to open
      setIsOpen(true);
    }

    // Allow opening modal programmatically from footer or other links
    const handleOpenEvent = () => setIsOpen(true);
    window.addEventListener("satarka:open-disclaimer", handleOpenEvent);
    return () => {
      window.removeEventListener("satarka:open-disclaimer", handleOpenEvent);
    };
  }, []);

  const handleAcknowledge = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // Ignore localStorage error
    }
    setIsOpen(false);
  }, []);

  // Keyboard navigation & body scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleAcknowledge();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus the acknowledge button once opened
    const timer = setTimeout(() => {
      acknowledgeButtonRef.current?.focus();
    }, 100);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, handleAcknowledge]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-modal-title"
      aria-describedby="disclaimer-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 sm:py-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      {/* Modal Container */}
      <div
        ref={dialogRef}
        className="relative flex flex-col w-full max-w-2xl max-h-[90vh] max-h-[90dvh] rounded-panel border border-border bg-surface text-text shadow-2xl overflow-hidden focus:outline-none"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border bg-surface/90 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-warning-soft text-warning border border-warning/30">
              <SeverityGlyph severity="warning" className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
                  {t("badge")}
                </span>
              </div>
              <h2
                id="disclaimer-modal-title"
                className="text-lg font-bold tracking-tight text-text sm:text-xl"
              >
                {t("title")}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAcknowledge}
            aria-label="Close disclaimer"
            className="rounded-card p-1.5 text-muted hover:bg-canvas hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
          <p
            id="disclaimer-modal-desc"
            className="text-sm sm:text-base leading-relaxed text-muted"
          >
            {t("lead")}
          </p>

          {/* Key Guidelines */}
          <div className="space-y-3">
            {/* Directive 1: Local Authorities First */}
            <div className="rounded-card border border-warning/30 bg-warning-soft/40 p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-warning shrink-0">
                  <SeverityGlyph severity="warning" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-text">
                    {t("primaryDirectiveTitle")}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted">
                    {t("primaryDirectiveBody")}
                  </p>
                </div>
              </div>
            </div>

            {/* Directive 2: Aggregated Data */}
            <div className="rounded-card border border-border bg-canvas/70 p-3.5 sm:p-4">
              <h3 className="text-sm sm:text-base font-semibold text-text">
                {t("aggregationTitle")}
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted">
                {t("aggregationBody")}
              </p>
            </div>

            {/* Directive 3: Sensor Gaps & Precaution */}
            <div className="rounded-card border border-border bg-canvas/70 p-3.5 sm:p-4">
              <h3 className="text-sm sm:text-base font-semibold text-text">
                {t("sensorGapsTitle")}
              </h3>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-muted">
                {t("sensorGapsBody")}
              </p>
            </div>
          </div>

          {/* Quick Emergency Numbers Bar */}
          <div className="rounded-card border border-border bg-surface-alt p-3.5 sm:p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {t("hotlinesTitle")}
            </h4>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <a
                href="tel:100"
                className="flex items-center justify-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-brand/50 hover:text-brand transition-colors"
              >
                <PhoneIcon className="h-3.5 w-3.5 text-brand" />
                <span>{t("police")}</span>
              </a>
              <a
                href="tel:101"
                className="flex items-center justify-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-brand/50 hover:text-brand transition-colors"
              >
                <PhoneIcon className="h-3.5 w-3.5 text-brand" />
                <span>{t("fire")}</span>
              </a>
              <a
                href="tel:102"
                className="flex items-center justify-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-brand/50 hover:text-brand transition-colors"
              >
                <PhoneIcon className="h-3.5 w-3.5 text-brand" />
                <span>{t("ambulance")}</span>
              </a>
              <a
                href="tel:1155"
                className="flex items-center justify-center gap-1.5 rounded-card border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text hover:border-brand/50 hover:text-brand transition-colors"
              >
                <PhoneIcon className="h-3.5 w-3.5 text-brand" />
                <span>{t("floodHotline")}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Actions (Sticky at bottom) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border bg-surface/90 px-5 py-3.5 sm:px-6">
          <p className="text-xs text-muted text-center sm:text-left">
            {t("doNotShowAgain")}
          </p>
          <button
            ref={acknowledgeButtonRef}
            type="button"
            onClick={handleAcknowledge}
            className="inline-flex items-center justify-center gap-2 rounded-card bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg shadow-sm hover:brightness-110 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <CheckIcon className="h-4 w-4" />
            <span>{t("acknowledge")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
