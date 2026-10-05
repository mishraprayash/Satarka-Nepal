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
      className="mt-4 flex w-full flex-col gap-2 rounded-card border-2 border-warning/40 bg-warning-soft px-4 py-3 text-left text-base font-medium text-warning hover:bg-warning-soft/80 hover:border-warning/50 transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
    >
      <div className="flex items-start sm:items-center gap-2 min-w-0">
        <SeverityGlyph severity="warning" className="h-5 w-5 shrink-0 text-warning mt-0.5" />
        <span>{label}</span>
      </div>
      <span className="text-base font-semibold underline underline-offset-2 ml-7">
        {actionText} →
      </span>
    </button>
  );
}
