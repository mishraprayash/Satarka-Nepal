"use client";

import { useEffect } from "react";

/** Registers public/service-worker.js in production builds only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/service-worker.js").catch((err) => {
      console.warn("[sw] registration failed:", err);
    });
  }, []);
  return null;
}
