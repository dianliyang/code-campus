"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations?.().then((registrations) => {
        registrations.forEach((registration) => {
          void registration.unregister();
        });
      });
      return;
    }

    let updateTimer: ReturnType<typeof setInterval> | undefined;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates periodically.
        updateTimer = setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error("[PWA] Service Worker registration failed:", error);
      });

    return () => {
      if (updateTimer) clearInterval(updateTimer);
    };
  }, []);

  return null;
}
