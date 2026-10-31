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
      className="mt-5 flex w-full items-start gap-3 rounded-card border-l-4 border-warning-solid bg-warning-soft px-4 py-3 text-left text-base hover:bg-surface-2 transition-colors cursor-pointer"
    >
      <SeverityGlyph severity="warning" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <span className="flex flex-col gap-1">
        <span className="font-medium text-text">{label}</span>
        <span className="font-semibold text-brand underline underline-offset-4">{actionText}</span>
      </span>
    </button>
  );
}
