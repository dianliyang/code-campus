"use client";

import { Loader2 } from "lucide-react";
import { useCourseIntelSyncJobs } from "@/hooks/useCourseIntelSyncJobs";

function formatStage(stage: string) {
  const normalized = String(stage || "").trim().toLowerCase();
  if (!normalized) return "event";
  return normalized.replace(/[_-]+/g, " ");
}

function formatTs(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour12: false });
}

function formatDetails(details: unknown): string {
  if (!details || typeof details !== "object" || Array.isArray(details)) return "";
  const entries = Object.entries(details as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .slice(0, 3);
  if (entries.length === 0) return "";
  return entries
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" | ");
}

export default function CourseIntelSyncWindow() {
  const { activeJobs, hasActive } = useCourseIntelSyncJobs();

  if (!hasActive) return null;

  return (
    <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#1f1f1f]">AI Sync Progress</h2>
        <span className="text-[11px] text-[#777]">{activeJobs.length} running</span>
      </div>
      <div className="mt-3 space-y-2">
        {activeJobs.map((job) => {
          const progress = typeof job.meta?.progress === "number" ? job.meta.progress : 0;
          const activity = Array.isArray(job.meta?.activity) ? job.meta.activity : [];
          const latestMessage = activity.length > 0 ? activity[activity.length - 1]?.message : "Processing...";
          const courseId = Number(job.meta?.course_id || 0);
          const sourceMode = job.sourceMode || job.meta?.source_mode || "auto";

          return (
            <article key={job.id} className="rounded-md border border-[#e8e8e8] bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs text-[#555]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#666]" />
                  <span>{courseId ? `Course #${courseId}` : "Course Sync"} · {sourceMode}</span>
                </div>
                <span className="text-[11px] text-[#777]">{progress}%</span>
              </div>
              <p className="mt-1 text-xs text-[#666]">{latestMessage || "Processing..."}</p>
              {activity.length > 0 && (
                <div className="mt-2 max-h-28 space-y-1 overflow-y-auto pr-1">
                  {activity.slice(-6).map((item, idx) => {
                    const line = formatDetails(item.details);
                    return (
                      <div key={`${item.ts}-${idx}`} className="rounded border border-[#efefef] bg-[#fafafa] px-1.5 py-1">
                        <div className="flex items-center justify-between gap-2 text-[10px] text-[#666]">
                          <span className="font-medium uppercase tracking-wide">{formatStage(item.stage)}</span>
                          <span>{formatTs(item.ts)}{typeof item.progress === "number" ? ` · ${item.progress}%` : ""}</span>
                        </div>
                        <p className="text-[11px] text-[#4f4f4f]">{item.message || "Processing..."}</p>
                        {line && <p className="text-[10px] text-[#7a7a7a]">{line}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-2 h-1.5 rounded bg-[#efefef]">
                <div className="h-1.5 rounded bg-[#7a9dd8]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
