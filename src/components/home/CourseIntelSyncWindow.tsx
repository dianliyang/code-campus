"use client";

import { Loader2 } from "lucide-react";
import { useCourseIntelSyncJobs } from "@/hooks/useCourseIntelSyncJobs";import { Card } from "@/components/ui/card";

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
  const source = details as Record<string, unknown>;
  const preferredOrder = ["hasExistingData", "sourceModeEffective", "sourceModeRequested"];
  const preferredEntries = preferredOrder.
  filter((key) => key in source).
  map((key) => [key, source[key]] as const);
  const remainingEntries = Object.entries(source).filter(
    ([key]) => !preferredOrder.includes(key)
  );
  const entries = [...preferredEntries, ...remainingEntries].
  filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean").
  slice(0, 4);
  if (entries.length === 0) return "";
  return entries.
  map(([k, v]) => `${k}: ${String(v)}`).
  join(" | ");
}

export default function CourseIntelSyncWindow() {
  const { activeJobs, hasActive } = useCourseIntelSyncJobs();

  if (!hasActive) return null;

  return (
    <Card>
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
          const courseLabel =
          typeof job.course_label === "string" && job.course_label.trim() ||

          typeof job.course_university === "string" &&
          typeof job.course_code === "string" &&
          `${job.course_university} ${job.course_code}`.trim() || (

          courseId ? `Course #${courseId}` : "Course");
          const sourceMode = job.sourceMode || job.meta?.source_mode || "auto";

          return (
            <Card key={job.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs text-[#555]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#666]" />
                  <span>course-intel · {courseLabel}</span>
                </div>
                <span className="text-[11px] text-[#777]">{progress}%</span>
              </div>
              <p className="mt-1 text-xs text-[#666]">{latestMessage || "Processing..."} <span className="text-[#999]">({sourceMode})</span></p>
              {activity.length > 0 &&
              <div className="mt-2 max-h-28 space-y-0.5 overflow-y-auto pr-1">
                  {activity.slice(-6).map((item, idx) => {
                  const caption = formatDetails(item.details);
                  const status = formatStage(item.stage);
                  return (
                    <p key={`${item.ts}-${idx}`} className="text-[11px] leading-relaxed text-[#4f4f4f]">
                        <span className="text-[#8a8a8a]">[{formatTs(item.ts) || "--:--:--"}]</span>{" "}
                        <span className="font-semibold capitalize text-[#2f6db5]">{status}</span>{" "}
                        <span className="text-[#2f2f2f]">{item.message || "Processing..."}</span>
                        {caption ? <span className="text-[#7a7a7a]"> {caption}</span> : null}
                        {typeof item.progress === "number" ? <span className="text-[#6f6f6f]"> · {item.progress}%</span> : null}
                      </p>);

                })}
                  <p className="inline-flex items-center gap-1.5 text-[11px] leading-relaxed text-[#6f6f6f]">
                    <Loader2 className="h-3 w-3 animate-spin text-[#7a7a7a]" />
                    <span className="text-[#8a8a8a]">[{formatTs(new Date().toISOString()) || "--:--:--"}]</span>{" "}
                    <span className="font-semibold capitalize text-[#2f6db5]">running</span>{" "}
                    <span className="animate-pulse text-[#5f5f5f]">Waiting for next output...</span>
                  </p>
                </div>
              }
              <div className="mt-2 h-1.5 bg-[#efefef]">
                <div className="h-1.5 bg-[#7a9dd8]" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
              </div>
            </Card>);

        })}
      </div>
    </Card>);

}