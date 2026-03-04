"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Course } from "@/types";
import UniversityIcon from "@/components/common/UniversityIcon";
import { deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, Loader2, Trash2, ArrowUpRight, Sparkles, Plus, X, ChevronDown, Check } from "lucide-react";
import { trackAiUsage } from "@/lib/ai/usage";
import { useAppToast } from "@/components/common/AppToastProvider";
import { type CodeBreakdownItem } from "@/lib/course-code-breakdown";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

type AiSyncSourceMode = "auto" | "existing" | "fresh";
const AI_SYNC_MODE_STORAGE_KEY = "cc:ai-sync-source-mode";
interface CourseDetailHeaderProps {
  course: Course;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  projectSeminarRef?: {id: number;category: string;} | null;
  enrolled?: boolean;
  isEnrolling?: boolean;
  onToggleEnroll?: () => void;
  codeBreakdown?: CodeBreakdownItem[];
  showActions?: boolean;
}

type ActivityItem = {
  ts: string;
  stage: string;
  message: string;
  progress?: number;
};

type BroadcastProgressPayload = {
  jobId?: number;
  courseId?: number;
  ts?: string;
  status?: string;
  stage?: string;
  message?: string;
  progress?: number;
  details?: Record<string, unknown>;
};

type CourseIntelJob = {
  id: number;
  status: string;
  error?: string | null;
  sourceMode?: AiSyncSourceMode;
  meta?: {
    progress?: number;
    source_mode?: AiSyncSourceMode;
    activity?: ActivityItem[];
    [key: string]: unknown;
  } | null;
};

function GoogleIcon({ className }: {className?: string;}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>);

}

export default function CourseDetailHeader({
  course,
  isEditing = false,
  onToggleEdit,
  projectSeminarRef = null,
  enrolled = false,
  isEnrolling = false,
  onToggleEnroll,
  codeBreakdown = [],
  showActions = true
}: CourseDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [aiJob, setAiJob] = useState<CourseIntelJob | null>(null);
  const [liveActivity, setLiveActivity] = useState<ActivityItem[]>([]);
  const [aiSourceMode, setAiSourceMode] = useState<AiSyncSourceMode>("auto");
  const { showToast } = useAppToast();
  const previousJobRef = useRef<{id: number;status: string;} | null>(null);
  const searchQuery = `${course.university || ""} ${course.courseCode || ""} ${course.title || ""}`.trim();
  const searchHref = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AI_SYNC_MODE_STORAGE_KEY);
      if (saved === "fresh" || saved === "existing" || saved === "auto") {
        setAiSourceMode(saved);
      }
    } catch {


      // Ignore localStorage errors.
    }}, []);
  const isAiUpdating =
  (aiJob?.status === "queued" || aiJob?.status === "running") &&
  Number(aiJob?.meta?.progress ?? 0) < 100;
  const progress = typeof aiJob?.meta?.progress === "number" ? aiJob.meta.progress : null;
  const activity = liveActivity;

  const loadLatestJob = async () => {
    try {
      const res = await fetch(`/api/ai/course-intel/jobs?courseId=${course.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json();
      if (payload?.item && typeof payload.item === "object") {
        const nextJob = payload.item as CourseIntelJob;
        setAiJob(nextJob);
      } else {
        setAiJob(null);
        setLiveActivity([]);
      }
    } catch {


      // Ignore background status fetch errors.
    }};
  useEffect(() => {
    void loadLatestJob();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  useEffect(() => {
    if (!isAiUpdating) return;
    const supabase = createBrowserSupabaseClient();
    const channel = supabase.
    channel(`course_intel_jobs:${course.id}`).
    on(
      "postgres_changes",
      { event: "*", schema: "public", table: "scraper_jobs" },
      (payload) => {
        const row = (payload as {new?: Record<string, unknown>;old?: Record<string, unknown>;}).new ||
        (payload as {new?: Record<string, unknown>;old?: Record<string, unknown>;}).old;
        const rowId = Number(row?.id || 0);
        const rowMeta = row?.meta && typeof row.meta === "object" ? row.meta as Record<string, unknown> : null;
        const rowCourseId = Number(rowMeta?.course_id as number | string | undefined || 0);
        const shouldApply =
        (aiJob?.id ? rowId === aiJob.id : false) ||
        rowCourseId === course.id;

        if (shouldApply && rowId > 0) {
          setAiJob((prev) => ({
            ...(prev || { id: rowId, sourceMode: aiSourceMode }),
            ...row,
            id: rowId
          }) as CourseIntelJob);

          const nextProgress = typeof rowMeta?.progress === "number" ? rowMeta.progress : undefined;
          const statusText = typeof row?.status === "string" ? row.status : "running";
          setLiveActivity((prev) => {
            const entry: ActivityItem = {
              ts: new Date().toISOString(),
              stage: "realtime",
              message: `Realtime update: ${statusText}${typeof nextProgress === "number" ? ` (${nextProgress}%)` : ""}`,
              progress: nextProgress
            };
            const last = prev[prev.length - 1];
            if (last?.message === entry.message) return prev;
            return [...prev, entry].slice(-40);
          });
        }
        void loadLatestJob();
      }
    ).
    on(
      "broadcast",
      { event: "course_intel_progress" },
      (payload) => {
        const body = ((payload as {payload?: BroadcastProgressPayload;}).payload || {}) as BroadcastProgressPayload;
        const eventCourseId = Number(body.courseId || 0);
        if (eventCourseId && eventCourseId !== course.id) return;

        const message = typeof body.message === "string" ? body.message.trim() : "";
        const stage = typeof body.stage === "string" ? body.stage : "running";
        const progressFromEvent = typeof body.progress === "number" ? body.progress : undefined;

        if (message) {
          setLiveActivity((prev) => {
            const entry: ActivityItem = {
              ts: typeof body.ts === "string" ? body.ts : new Date().toISOString(),
              stage,
              message,
              progress: progressFromEvent
            };
            const last = prev[prev.length - 1];
            if (last?.message === entry.message && last?.stage === entry.stage && last?.progress === entry.progress) {
              return prev;
            }
            return [...prev, entry].slice(-40);
          });
        }

        if (typeof progressFromEvent === "number") {
          setAiJob((prev) => {
            if (!prev) return prev;
            const meta = prev.meta && typeof prev.meta === "object" ? prev.meta : {};
            return {
              ...prev,
              status: typeof body.status === "string" ? body.status : prev.status,
              meta: {
                ...meta,
                progress: progressFromEvent
              }
            };
          });
        }
      }
    ).
    subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, isAiUpdating]);

  useEffect(() => {
    if (!aiJob) {
      previousJobRef.current = null;
      setLiveActivity([]);
      return;
    }
    if (aiJob.status === "completed" || aiJob.status === "failed") {
      setLiveActivity([]);
    }

    const previous = previousJobRef.current;
    const fromActiveSameJob = Boolean(
      previous &&
      previous.id === aiJob.id && (
      previous.status === "queued" || previous.status === "running")
    );

    if (aiJob.status === "completed") {
      setAiStatus("success");
      if (fromActiveSameJob) {
        showToast({ type: "success", message: "AI sync completed." });
        trackAiUsage({ calls: 1, tokens: 1024 });
        router.refresh();
      }
    } else if (aiJob.status === "failed") {
      setAiStatus("error");
      if (fromActiveSameJob) {
        showToast({ type: "error", message: aiJob.error || "AI sync failed." });
      }
    } else {
      setAiStatus("idle");
    }
    previousJobRef.current = { id: aiJob.id, status: aiJob.status };
  }, [aiJob, router, showToast]);

  const handleAiUpdate = async () => {
    if (isAiUpdating) return;
    setAiStatus('idle');
    setLiveActivity([]);
    try {
      const res = await fetch('/api/ai/course-intel/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id, sourceMode: aiSourceMode })
      });
      if (res.ok || res.status === 202) {
        try {
          const payload = await res.json();
          if (payload?.item && typeof payload.item === "object") {
            setAiJob(payload.item as CourseIntelJob);
          }
        } catch {


          // Ignore payload parse errors and rely on realtime/explicit refresh to pick up the job.
        }showToast({ type: "success", message: `AI sync started in background (${aiSourceMode}).` });window.dispatchEvent(new Event("course-intel-job-started"));
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
        }showToast({ type: "error", message: errorMessage });}
    } catch {
      setAiStatus('error');
      showToast({ type: "error", message: "Network error while running AI sync." });
    }
  };

  const handleToggleEnroll = () => {
    onToggleEnroll?.();
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
      toast.error("Failed to delete course", { position: "bottom-right" });
      setIsDeleting(false);
    }
  };


  return (
    <header
      data-course-title-header
      className="sticky top-0 z-20 rounded-md bg-background/95 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      

      {/* Single row: logo · info · actions */}
      <div className="flex items-start gap-2.5 sm:gap-3">

        {/* University logo */}
        <UniversityIcon
          name={course.university}
          size={40}
          className="flex-shrink-0 bg-white" />
        

        {/* Info — fills remaining space, truncates */}
        <div className="min-w-0 flex-1">
          <h1 className="text-[17px] sm:text-[20px] font-semibold text-[#1f1f1f] tracking-tight leading-snug line-clamp-2 mb-0.5">
            {course.title}
          </h1>
          <div className="flex items-center gap-1.5">
            {codeBreakdown.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex items-center gap-1.5 text-left">
                    <span className="text-[11px] font-medium text-[#555] truncate">
                      {course.university}
                    </span>
                    <Badge variant="secondary">{course.courseCode}</Badge>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start">
                  <PopoverHeader>
                    <PopoverTitle>Course Code Breakdown</PopoverTitle>
                    <PopoverDescription>
                      Structure and meaning of this course code.
                    </PopoverDescription>
                  </PopoverHeader>
                  <dl className="mt-2 space-y-1.5 text-[11px]">
                    {codeBreakdown.map((item, idx) => (
                      <div key={`${item.label}-${idx}`} className="flex justify-between gap-3">
                        <dt className="text-[#666]">{item.label}</dt>
                        <dd className="text-right">
                          <p className="font-medium text-[#222]">{item.value}</p>
                          {item.detail ? (
                            <p className="text-[10px] text-[#777]">{item.detail}</p>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </PopoverContent>
              </Popover>
            ) : (
              <>
                <span className="text-[11px] font-medium text-[#555] truncate">
                  {course.university}
                </span>
                <Badge variant="secondary">{course.courseCode}</Badge>
              </>
            )}
            {course.isInternal &&
            <span className="text-[11px] font-medium text-[#333] px-1 shrink-0">
                Internal
              </span>
            }
          </div>
        </div>

        {/* Action buttons — always visible */}
        {showActions ? <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap justify-end">
          {isEditing ? (
            <Button variant="outline" type="button" onClick={() => onToggleEdit?.()}>
              Cancel
            </Button>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" type="button">
                    {isAiUpdating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    <span className="uppercase">{aiSourceMode}</span>
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>AI Sync Mode</DropdownMenuLabel>
                    {(["auto", "existing", "fresh"] as AiSyncSourceMode[]).map((mode) => (
                      <DropdownMenuItem
                        key={mode}
                        onClick={() => {
                          setAiSourceMode(mode);
                          try {
                            window.localStorage.setItem(AI_SYNC_MODE_STORAGE_KEY, mode);
                          } catch {
                            // Ignore localStorage errors.
                          }
                        }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        {aiSourceMode === mode ? (
                          <DropdownMenuShortcut>
                            <Check className="size-4 text-foreground" />
                          </DropdownMenuShortcut>
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleAiUpdate} disabled={isAiUpdating}>
                      {isAiUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Run AI Sync
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Enroll / Unenroll */}
              <Button variant="outline" size="sm" type="button" onClick={handleToggleEnroll} disabled={isEnrolling}>
                {isEnrolling ? <Loader2 className="animate-spin" /> :
                enrolled ?
                <X /> :

                <Plus />
                }
                <span>{enrolled ? "Unenroll" : "Enroll"}</span>
              </Button>

              {/* Google Search */}
              <Button variant="outline" size="icon-sm"
              type="button"
              onClick={() => window.open(searchHref, "_blank", "noopener,noreferrer")}
              title="Search on Google"
              aria-label="Search on Google">
                
                <GoogleIcon />
              </Button>

              {/* Edit */}
              <Button variant="outline" size="icon-sm"
              onClick={() => onToggleEdit?.()}
              title="Edit Course Details"
              aria-label="Edit Course Details">
                
                <PenSquare />
              </Button>

              {/* Delete */}
              <Button variant="outline" size="icon-sm" type="button" onClick={handleDelete} disabled={isDeleting} title="Delete Course" aria-label="Delete Course">
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
            </>
          )}
        </div> : null}
      </div>

      {/* Field tags */}
      {(course.fields.length > 0 || projectSeminarRef) &&
      <div className="mt-3 flex flex-wrap gap-1.5">
          {projectSeminarRef ?
        <Link
          href={`/projects-seminars/${projectSeminarRef.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium bg-white text-[#3e3e3e] px-2 py-0.5 hover:bg-[#f7f7f7] transition-colors">
          
              View {projectSeminarRef.category}
              <ArrowUpRight className="h-3 w-3" />
            </Link> :
        null}
          {course.fields.map((field) =>
        <span
          key={field}
          className="text-xs font-medium bg-white text-[#666] px-2 py-0.5">
          
              {field}
            </span>
        )}
        </div>
      }

      {isAiUpdating &&
      <div className="mt-2 rounded-sm bg-white p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#444]">AI Sync Activity</span>
            <span className="text-[11px] text-[#777]">
              {aiJob?.meta?.source_mode || aiJob?.sourceMode || aiSourceMode} · {progress !== null ? `${progress}%` : aiJob?.status || "running"}
            </span>
          </div>
          <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
          {activity.slice(-6).map((item, idx) =>
          <p key={`${item.ts}-${idx}`} className="text-[11px] text-[#666]">
                {item.message}
              </p>
          )}
          </div>
        </div>
      }
    </header>);

}
