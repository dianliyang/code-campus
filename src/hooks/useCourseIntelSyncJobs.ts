"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const AI_SYNC_LOG_KEY_PREFIX = "cc:ai-sync-log:";

export type CourseIntelJobItem = {
  id: number;
  status: string;
  error?: string | null;
  sourceMode?: "auto" | "existing" | "fresh";
  university?: string | null;
  course_university?: string | null;
  course_code?: string | null;
  course_label?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  meta?: {
    course_id?: number;
    progress?: number;
    source_mode?: "auto" | "existing" | "fresh";
    activity?: Array<{
      ts: string;
      stage: string;
      message: string;
      progress?: number;
      details?: Record<string, unknown>;
    }>;
    [key: string]: unknown;
  } | null;
};

type ActivityLogItem = {
  ts: string;
  stage: string;
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
};

function storageKeyForJob(jobId: number) {
  return `${AI_SYNC_LOG_KEY_PREFIX}${jobId}`;
}

function readStoredActivity(jobId: number): ActivityLogItem[] {
  if (typeof window === "undefined" || !jobId) return [];
  try {
    const raw = window.localStorage.getItem(storageKeyForJob(jobId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ActivityLogItem =>
        item &&
        typeof item === "object" &&
        typeof item.ts === "string" &&
        typeof item.stage === "string" &&
        typeof item.message === "string"
      )
      .slice(-80);
  } catch {
    return [];
  }
}

function persistActivity(jobId: number, activity: ActivityLogItem[]) {
  if (typeof window === "undefined" || !jobId) return;
  try {
    window.localStorage.setItem(storageKeyForJob(jobId), JSON.stringify(activity.slice(-80)));
  } catch {
    // Ignore storage errors.
  }
}

function clearPersistedActivity(jobId: number) {
  if (typeof window === "undefined" || !jobId) return;
  try {
    window.localStorage.removeItem(storageKeyForJob(jobId));
  } catch {
    // Ignore storage errors.
  }
}

function isTerminalJob(job: Partial<CourseIntelJobItem> | null | undefined) {
  if (!job) return false;
  const status = String(job.status || "");
  const progress = Number(job.meta?.progress ?? 0);
  return status === "completed" || status === "failed" || progress >= 100;
}

function mergeActivity(existing: ActivityLogItem[], incoming: ActivityLogItem[]) {
  if (incoming.length === 0) return existing.slice(-80);
  const merged = [...existing, ...incoming];
  const deduped: ActivityLogItem[] = [];
  const seen = new Set<string>();
  for (const item of merged) {
    const key = `${item.ts}|${item.stage}|${item.message}|${Number(item.progress ?? -1)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped.slice(-80);
}

export function useCourseIntelSyncJobs() {
  const [items, setItems] = useState<CourseIntelJobItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSubscribed, setHasSubscribed] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserSupabaseClient>["channel"]> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient> | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/course-intel/jobs", { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json();
      if (Array.isArray(payload?.items)) {
        setItems((prev) => {
          const byId = new Map(prev.map((item) => [item.id, item]));
          return (payload.items as CourseIntelJobItem[]).map((incoming) => {
            const incomingId = Number(incoming.id || 0);
            const previous = byId.get(incomingId);
            const prevActivity = Array.isArray(previous?.meta?.activity) ? previous.meta.activity : [];
            const stored = readStoredActivity(incomingId);
            const nextActivity = mergeActivity(prevActivity as ActivityLogItem[], stored);
            if (isTerminalJob(incoming)) {
              clearPersistedActivity(incomingId);
              return incoming;
            }
            if (nextActivity.length === 0) return incoming;
            return {
              ...incoming,
              meta: {
                ...(incoming.meta || {}),
                activity: nextActivity,
              },
            };
          });
        });
      }
    } catch {
      // Ignore transient load errors.
    } finally {
      setLoading(false);
    }
  }, []);

  const closeChannel = useCallback(async () => {
    const supabase = supabaseRef.current;
    const channel = channelRef.current;
    if (supabase && channel) {
      await supabase.removeChannel(channel);
    }
    channelRef.current = null;
    setHasSubscribed(false);
  }, []);

  const openChannel = useCallback(() => {
    if (channelRef.current) return;
    const supabase = supabaseRef.current || createBrowserSupabaseClient();
    supabaseRef.current = supabase;
    channelRef.current = supabase
      .channel("course_intel_jobs:global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraper_jobs" },
        (payload) => {
          const row = (payload as { new?: Record<string, unknown>; old?: Record<string, unknown> }).new
            || (payload as { new?: Record<string, unknown>; old?: Record<string, unknown> }).old;
          if (!row || typeof row.id !== "number") {
            void loadJobs();
            return;
          }

          setItems((prev) => {
            const next = [...prev];
            const idx = next.findIndex((item) => item.id === row.id);
            const prevItem = idx >= 0 ? next[idx] : null;
            const rowMeta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : null;
            const incomingActivity = Array.isArray(rowMeta?.activity)
              ? (rowMeta?.activity as ActivityLogItem[])
              : [];
            const previousActivity = Array.isArray(prevItem?.meta?.activity)
              ? (prevItem?.meta?.activity as ActivityLogItem[])
              : [];
            const storedActivity = readStoredActivity(Number(row.id));
            const nextActivity = mergeActivity(mergeActivity(previousActivity, incomingActivity), storedActivity);
            const merged = {
              ...(prevItem || {}),
              ...row,
              sourceMode:
                typeof (row as { sourceMode?: unknown }).sourceMode === "string"
                  ? ((row as { sourceMode: "auto" | "existing" | "fresh" }).sourceMode)
                  : (idx >= 0 ? next[idx].sourceMode : "auto"),
              meta: {
                ...((prevItem?.meta && typeof prevItem.meta === "object") ? prevItem.meta : {}),
                ...(rowMeta || {}),
                ...(nextActivity.length > 0 ? { activity: nextActivity } : {}),
              },
            } as CourseIntelJobItem;

            if (isTerminalJob(merged)) {
              clearPersistedActivity(Number(merged.id || 0));
            } else if (nextActivity.length > 0) {
              persistActivity(Number(merged.id || 0), nextActivity);
            }

            if (idx >= 0) next[idx] = merged;
            else next.unshift(merged);
            return next.slice(0, 20);
          });
        }
      )
      .subscribe();
    setHasSubscribed(true);
  }, [loadJobs]);

  useEffect(() => {
    void loadJobs();
    const onStarted = () => {
      void loadJobs();
    };
    const onFocus = () => {
      void loadJobs();
    };
    window.addEventListener("course-intel-job-started", onStarted as EventListener);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("course-intel-job-started", onStarted as EventListener);
      window.removeEventListener("focus", onFocus);
      void closeChannel();
    };
  }, [closeChannel, loadJobs]);

  const activeJobs = items.filter((job) => {
    const progress = Number(job.meta?.progress ?? 0);
    const status = String(job.status || "");
    if (progress >= 100) return false;
    return status === "queued" || status === "running";
  });
  const hasActive = activeJobs.length > 0;

  useEffect(() => {
    if (hasActive) {
      openChannel();
      return;
    }
    if (hasSubscribed) {
      void closeChannel();
    }
  }, [closeChannel, hasActive, hasSubscribed, openChannel]);

  return {
    items,
    activeJobs,
    hasActive,
    loading,
    reload: loadJobs,
  };
}
