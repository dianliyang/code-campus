"use client";

import { Loader2 } from "lucide-react";
import { useCourseIntelSyncJobs } from "@/hooks/useCourseIntelSyncJobs";

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

          return (
            <article key={job.id} className="rounded-md border border-[#e8e8e8] bg-white p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-xs text-[#555]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#666]" />
                  <span>{courseId ? `Course #${courseId}` : "Course Sync"}</span>
                </div>
                <span className="text-[11px] text-[#777]">{progress}%</span>
              </div>
              <p className="mt-1 text-xs text-[#666]">{latestMessage || "Processing..."}</p>
              {activity.length > 1 && (
                <div className="mt-1 space-y-0.5">
                  {activity.slice(-3).map((item, idx) => (
                    <p key={`${item.ts}-${idx}`} className="text-[11px] text-[#7a7a7a]">
                      {item.message}
                    </p>
                  ))}
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
