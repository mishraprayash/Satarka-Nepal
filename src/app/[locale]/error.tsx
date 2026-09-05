"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Route-level error boundary. Catches render/runtime crashes in any page under
 * [locale] — including the Leaflet map, which can throw on unexpected geometry
 * — so a single broken component degrades to a retry card instead of a blank
 * screen on a safety tool.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const tc = useTranslations("common");
  const ta = useTranslations("actions");

  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="shell py-16">
      <div className="card mx-auto flex max-w-md flex-col items-start gap-3 p-6">
        <p className="text-sm text-muted">{tc("error")}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-chip border border-border-strong px-3 py-1.5 text-sm font-medium hover:bg-surface-2 cursor-pointer"
        >
          {ta("retry")}
        </button>
      </div>
    </div>
  );
}
