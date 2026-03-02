"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type CourseIntelJobItem = {
  id: number;
  status: string;
  error?: string | null;
  sourceMode?: "auto" | "existing" | "fresh";
  university?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  meta?: {
    course_id?: number;
    progress?: number;
    source_mode?: "auto" | "existing" | "fresh";
    activity?: Array<{ ts: string; stage: string; message: string; progress?: number }>;
    [key: string]: unknown;
  } | null;
};

export function useCourseIntelSyncJobs() {
  const [items, setItems] = useState<CourseIntelJobItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/course-intel/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json();
      if (Array.isArray(payload?.items)) {
        setItems(payload.items as CourseIntelJobItem[]);
      }
    } catch {
      // Ignore transient polling errors.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const INITIAL_DELAY_MS = 6000;
    const POLL_INTERVAL_MS = 12000;
    let stream: EventSource | null = null;
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("course_intel_jobs:global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraper_jobs" },
        () => {
          void loadJobs();
        }
      )
      .subscribe();
    const initialTimer = window.setTimeout(() => {
      void loadJobs();
      stream = new EventSource("/api/ai/course-intel/jobs/stream");
      stream.addEventListener("jobs", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data || "{}");
          if (Array.isArray(payload?.items)) {
            setItems(payload.items as CourseIntelJobItem[]);
          }
        } catch {
          // Ignore parse errors and keep polling fallback.
        }
      });
      stream.onerror = () => {
        if (stream) {
          stream.close();
          stream = null;
        }
      };
    }, INITIAL_DELAY_MS);
    const timer = window.setInterval(() => {
      void loadJobs();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
      if (stream) stream.close();
      void supabase.removeChannel(channel);
    };
  }, []);

  const activeJobs = items.filter((job) => job.status === "queued" || job.status === "running");
  const hasActive = activeJobs.length > 0;

  return {
    items,
    activeJobs,
    hasActive,
    loading,
    reload: loadJobs,
  };
}
