"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { SeverityGlyph, CheckIcon } from "@/components/icons";

const STORAGE_KEY = "satarka_disclaimer_ack_v1";

export function DisclaimerModal() {
  const t = useTranslations("disclaimerModal");
  const [isOpen, setIsOpen] = useState(false);
  const acknowledgeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Check on mount if user has already acknowledged
  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem(STORAGE_KEY);
      if (!acknowledged) {
        // First time visitor: show disclaimer
        previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
        setIsOpen(true);
      }
    } catch {
      // If localStorage is unavailable (e.g. private browsing restriction), default to open
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      setIsOpen(true);
    }

    // Allow opening modal programmatically from footer or other links
    const handleOpenEvent = () => {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
      setIsOpen(true);
    };
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
    if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === "function") {
      previouslyFocusedElementRef.current.focus();
    }
  }, []);

  // Keyboard navigation, focus trapping & body scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleAcknowledge();
        return;
      }

      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements).filter(
          (el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Focus the acknowledge button once opened
    const timer = setTimeout(() => {
      acknowledgeButtonRef.current?.focus();
    }, 50);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, handleAcknowledge]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleAcknowledge();
    }
  };

  if (!isOpen) return null;

  const hotlines = [
    { n: "100", label: t("police") },
    { n: "102", label: t("ambulance") },
    { n: "101", label: t("fire") },
    { n: "1149", label: t("ndrrma") },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-modal-title"
      aria-describedby="disclaimer-modal-desc"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-5"
    >
      <div
        ref={dialogRef}
        className="relative flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface text-text shadow-2xl focus:outline-none sm:rounded-3xl"
        tabIndex={-1}
      >
        <div className="flex-1 min-h-0 space-y-5 overflow-y-auto p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-warning-soft text-warning">
              <SeverityGlyph severity="warning" width={26} height={26} />
            </span>
            <h2 id="disclaimer-modal-title" className="text-2xl font-bold">
              {t("title")}
            </h2>
          </div>

          <p id="disclaimer-modal-desc" className="text-lg leading-relaxed">
            {t("lead")}
          </p>

          <ul className="space-y-3">
            <li className="rounded-card border-2 border-warning/40 bg-warning-soft p-4">
              <h3 className="text-lg font-bold">{t("primaryDirectiveTitle")}</h3>
              <p className="mt-1 text-base leading-relaxed">{t("primaryDirectiveBody")}</p>
            </li>
            <li className="rounded-card border-2 border-border p-4">
              <h3 className="text-lg font-bold">{t("sensorGapsTitle")}</h3>
              <p className="mt-1 text-base leading-relaxed">{t("sensorGapsBody")}</p>
            </li>
          </ul>

          <div>
            <h3 className="mb-2 text-base font-semibold text-muted">{t("hotlinesTitle")}</h3>
            <div className="grid grid-cols-2 gap-2">
              {hotlines.map((h) => (
                <a
                  key={h.n}
                  href={`tel:${h.n}`}
                  className="flex min-h-12 items-center justify-between gap-2 rounded-chip border-2 border-border px-3.5 py-2 text-base font-medium hover:bg-surface-2"
                >
                  <span>{h.label}</span>
                  <span className="tabular text-lg font-bold text-danger">{h.n}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-surface p-4 sm:p-5" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button ref={acknowledgeButtonRef} type="button" onClick={handleAcknowledge} className="btn btn-primary w-full">
            <CheckIcon width={20} height={20} />
            <span>{t("acknowledge")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
