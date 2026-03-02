"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Course } from "@/types";
import UniversityIcon from "@/components/common/UniversityIcon";
import { deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, Loader2, Trash2, ArrowUpRight, Sparkles, Plus, X } from "lucide-react";
import { trackAiUsage } from "@/lib/ai/usage";
import { useAppToast } from "@/components/common/AppToastProvider";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
interface CourseDetailHeaderProps {
  course: Course;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  projectSeminarRef?: { id: number; category: string } | null;
  enrolled?: boolean;
  isEnrolling?: boolean;
  onToggleEnroll?: () => void;
}

type ActivityItem = {
  ts: string;
  stage: string;
  message: string;
  progress?: number;
};

type CourseIntelJob = {
  id: number;
  status: string;
  error?: string | null;
  meta?: {
    progress?: number;
    activity?: ActivityItem[];
    [key: string]: unknown;
  } | null;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function CourseDetailHeader({
  course,
  isEditing = false,
  onToggleEdit,
  projectSeminarRef = null,
  enrolled = false,
  isEnrolling = false,
  onToggleEnroll,
}: CourseDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [aiJob, setAiJob] = useState<CourseIntelJob | null>(null);
  const { showToast } = useAppToast();
  const handledJobStatusRef = useRef<string>("");
  const searchQuery = `${course.university || ""} ${course.courseCode || ""} ${course.title || ""}`.trim();
  const searchHref = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  const isAiSyncSkipped = course.details?.ai_sync_private === true || course.details?.ai_sync_skip === true;
  const isAiUpdating = aiJob?.status === "queued" || aiJob?.status === "running";
  const progress = typeof aiJob?.meta?.progress === "number" ? aiJob.meta.progress : null;
  const activity = Array.isArray(aiJob?.meta?.activity) ? aiJob.meta.activity : [];

  const loadLatestJob = async () => {
    try {
      const res = await fetch(`/api/ai/course-intel/jobs?courseId=${course.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json();
      if (payload?.item && typeof payload.item === "object") {
        setAiJob(payload.item as CourseIntelJob);
      } else {
        setAiJob(null);
      }
    } catch {
      // Ignore background status fetch errors.
    }
  };

  useEffect(() => {
    void loadLatestJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`course_intel_jobs:${course.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraper_jobs" },
        () => {
          void loadLatestJob();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  useEffect(() => {
    if (!aiJob) return;
    const key = `${aiJob.id}:${aiJob.status}`;
    if (handledJobStatusRef.current === key) return;

    if (aiJob.status === "completed") {
      setAiStatus("success");
      showToast({ type: "success", message: "AI sync completed." });
      trackAiUsage({ calls: 1, tokens: 1024 });
      router.refresh();
    } else if (aiJob.status === "failed") {
      setAiStatus("error");
      showToast({ type: "error", message: aiJob.error || "AI sync failed." });
    } else {
      setAiStatus("idle");
    }
    handledJobStatusRef.current = key;
  }, [aiJob, router, showToast]);

  const handleAiUpdate = async () => {
    if (isAiSyncSkipped) {
      const reason = typeof course.details?.ai_sync_skip_reason === 'string' ? course.details.ai_sync_skip_reason : 'private_source';
      showToast({ type: "error", message: `AI sync skipped for this course (${reason}).` });
      return;
    }
    if (isAiUpdating) return;
    setAiStatus('idle');
    try {
      const res = await fetch('/api/ai/course-intel/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (res.ok || res.status === 202) {
        showToast({ type: "success", message: "AI sync started in background." });
        await loadLatestJob();
      } else {
        setAiStatus('error');
        let errorMessage = "AI sync failed.";
        try {
          const payload = await res.json();
          const candidate = typeof payload?.error === "string" ? payload.error.trim() : "";
          if (candidate) errorMessage = candidate;
        } catch {
          // Ignore parse error and use default message.
        }
        showToast({ type: "error", message: errorMessage });
      }
    } catch {
      setAiStatus('error');
      showToast({ type: "error", message: "Network error while running AI sync." });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCourse(course.id);

      const refParams = searchParams.get("refParams");
      if (refParams) {
        router.push(`/courses?${decodeURIComponent(refParams)}`);
      } else {
        router.push("/courses");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete course");
      setIsDeleting(false);
    }
  };

  const btnBase = "h-7 w-7 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] inline-flex items-center justify-center transition-colors shrink-0";

  return (
    <header
      data-course-title-header
      className="sticky top-0 z-20 rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-3 sm:p-4"
    >

      {/* Single row: logo · info · actions */}
      <div className="flex items-center gap-2.5 sm:gap-3">

        {/* University logo */}
        <UniversityIcon
          name={course.university}
          size={40}
          className="flex-shrink-0 bg-white rounded-lg border border-[#e5e5e5]"
        />

        {/* Info — fills remaining space, truncates */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5 overflow-hidden">
            <span className="text-[11px] font-medium text-[#555] bg-white px-2 py-0.5 rounded border border-[#e5e5e5] truncate shrink min-w-0 max-w-[9rem] sm:max-w-none">
              {course.university}
            </span>
            {course.isInternal && (
              <span className="text-[11px] font-medium bg-[#efefef] text-[#333] px-2 py-0.5 rounded border border-[#e1e1e1] shrink-0">
                Internal
              </span>
            )}
            <span className="text-[11px] text-[#999] shrink-0">{course.courseCode}</span>
          </div>
          <h1 className="text-[17px] sm:text-[19px] font-semibold text-[#1f1f1f] tracking-tight leading-snug truncate">
            {course.title}
          </h1>
        </div>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Enroll / Unenroll */}
          <button
            type="button"
            onClick={onToggleEnroll}
            disabled={isEnrolling}
            className={`h-7 rounded-md border px-2 text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 ${
              enrolled
                ? "border-[#d3d3d3] bg-white text-[#3b3b3b] hover:bg-[#f8f8f8]"
                : "border-[#c3d9c3] bg-[#f0f7f0] text-[#2d6a2d] hover:bg-[#e4f0e4]"
            }`}
            title={enrolled ? "Unenroll" : "Enroll"}
            aria-label={enrolled ? "Unenroll" : "Enroll"}
          >
            {isEnrolling ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : enrolled ? (
              <X className="w-3 h-3" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
            <span>{enrolled ? "Unenroll" : "Enroll"}</span>
          </button>

          {/* AI Update */}
          <button
            onClick={handleAiUpdate}
            disabled={isAiUpdating || isAiSyncSkipped}
            className={`h-7 w-7 rounded-md border bg-white inline-flex items-center justify-center transition-all disabled:opacity-50 shrink-0 ${
              aiStatus === 'success'
                ? 'border-emerald-300 text-emerald-600'
                : aiStatus === 'error'
                  ? 'border-rose-300 text-rose-500'
                  : 'border-[#d3d3d3] text-[#666] hover:bg-[#f8f8f8]'
            }`}
            title={isAiSyncSkipped ? "AI Sync skipped (private/non-public course source)" : "AI Sync — fetch resources, syllabus, and assignments"}
            aria-label="AI Sync"
          >
            {isAiUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          </button>

          {/* Google Search */}
          <a
            href={searchHref}
            target="_blank"
            rel="noopener noreferrer"
            className={btnBase}
            title="Search on Google"
            aria-label="Search on Google"
          >
            <GoogleIcon className="w-3 h-3" />
          </a>

          {/* Edit */}
          <button
            onClick={() => onToggleEdit?.()}
            className={btnBase}
            title={isEditing ? "Cancel Editing" : "Edit Course Details"}
            aria-label={isEditing ? "Cancel Editing" : "Edit Course Details"}
          >
            <PenSquare className="w-3 h-3" />
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`${btnBase} disabled:opacity-50`}
            title="Delete Course"
            aria-label="Delete Course"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Field tags */}
      {(course.fields.length > 0 || projectSeminarRef) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {projectSeminarRef ? (
            <Link
              href={`/projects-seminars/${projectSeminarRef.id}`}
              className="inline-flex items-center gap-1 text-xs font-medium bg-white text-[#3e3e3e] px-2 py-0.5 rounded-full border border-[#dcdcdc] hover:bg-[#f7f7f7] transition-colors"
            >
              View {projectSeminarRef.category}
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
          {course.fields.map((field) => (
            <span
              key={field}
              className="text-xs font-medium bg-white text-[#666] px-2 py-0.5 rounded-full border border-[#e5e5e5]"
            >
              {field}
            </span>
          ))}
        </div>
      )}

      {(isAiUpdating || activity.length > 0) && (
        <div className="mt-3 rounded-md border border-[#e8e8e8] bg-white p-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#444]">AI Sync Activity</span>
            <span className="text-[11px] text-[#777]">{progress !== null ? `${progress}%` : aiJob?.status || "running"}</span>
          </div>
          <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
            {activity.slice(-6).map((item, idx) => (
              <p key={`${item.ts}-${idx}`} className="text-[11px] text-[#666]">
                {item.message}
              </p>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
