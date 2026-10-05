"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { SeverityGlyph } from "@/components/icons";

/**
 * Route-level error boundary. Catches render/runtime crashes in any page under
 * [locale] — including the Leaflet map, which can throw on unexpected geometry
 * — so a single broken component degrades to a clean recovery card instead of a blank
 * screen on a safety tool.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  let errorMessage = "Something went wrong";
  let retryText = "Try again";
  let homeText = "Return to Home";
  let bodyText = "We could not load this page. Please try again.";
  let emergencyText = "In an emergency, call:";

  try {
    const tc = useTranslations("common");
    const ta = useTranslations("actions");
    const tn = useTranslations("nav");
    errorMessage = tc("error");
    retryText = ta("retry");
    homeText = tn("home");
    bodyText = tc("errorBody");
    emergencyText = tc("errorEmergency");
  } catch {
    // If translation provider is impaired, keep safe fallback text
  }

  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  function handleReset() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="shell py-12 sm:py-20">
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-5 p-6 text-center sm:p-8">
        <div className="grid size-16 place-items-center rounded-full bg-warning-soft text-warning">
          <SeverityGlyph severity="warning" width={32} height={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{errorMessage}</h1>
          <p className="text-lg text-muted">{bodyText}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={handleReset} disabled={isPending} className="btn btn-primary disabled:opacity-50">
            {isPending ? "…" : retryText}
          </button>
          <Link href="/" className="btn btn-secondary">
            {homeText}
          </Link>
        </div>
        <p className="w-full rounded-chip border-2 border-danger/30 bg-danger-soft p-3.5 text-base">
          {emergencyText}{" "}
          <a href="tel:100" className="font-bold text-danger underline">100</a> ·{" "}
          <a href="tel:102" className="font-bold text-danger underline">102</a> ·{" "}
          <a href="tel:1149" className="font-bold text-danger underline">1149</a>
        </p>
        {error.digest ? <p className="text-sm text-muted">ID: {error.digest}</p> : null}
      </div>
    </div>
  );
}
