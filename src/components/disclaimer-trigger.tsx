"use client";

import { SeverityGlyph } from "@/components/icons";

interface DisclaimerTriggerProps {
  label: string;
  actionText: string;
}

export function DisclaimerTrigger({ label, actionText }: DisclaimerTriggerProps) {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("satarka:open-disclaimer"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="mt-3 flex w-full flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-card border border-warning/30 bg-warning-soft/50 px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium text-warning hover:bg-warning-soft/80 hover:border-warning/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
    >
      <div className="flex items-start sm:items-center gap-2 min-w-0">
        <SeverityGlyph severity="warning" className="h-4 w-4 shrink-0 text-warning mt-0.5 sm:mt-0" />
        <span>{label}</span>
      </div>
      <span className="shrink-0 text-xs font-semibold underline underline-offset-2 opacity-80 group-hover:opacity-100 self-start sm:self-auto ml-6 sm:ml-0">
        {actionText} →
      </span>
    </button>
  );
}
