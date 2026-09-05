"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { SiteHeader } from "@/components/site-header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const CommandPalette = dynamic(
  () => import("@/components/command-palette").then((m) => m.CommandPalette),
  { ssr: false }
);

const DisclaimerModal = dynamic(
  () => import("@/components/disclaimer-modal").then((m) => m.DisclaimerModal),
  { ssr: false }
);

export function GlobalNav() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <SiteHeader onOpenSearch={() => setIsSearchOpen(true)} />
      <MobileBottomNav onOpenSearch={() => setIsSearchOpen(true)} />
      {isSearchOpen ? (
        <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      ) : null}
      <DisclaimerModal />
    </>
  );
}


