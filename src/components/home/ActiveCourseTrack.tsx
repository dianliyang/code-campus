"use client";

import { startTransition, useState } from "react";
import { Course } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";
import AddPlanModal from "./AddPlanModal";
import { useAppToast } from "@/components/common/AppToastProvider";
import {
  ExternalLink,
  Trophy,
  CheckCheck,
  CalendarCheck,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";

interface ActiveCourseTrackProps {
  course: Course;
  initialProgress: number;
  plan?: {
    id: number;
    start_date: string;
    end_date: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    location: string;
  } | null;
  onUpdate?: () => void;
  dict: Dictionary["dashboard"]["roadmap"];
}

export default function ActiveCourseTrack({
  course,
  initialProgress,
  plan,
  onUpdate,
}: Omit<ActiveCourseTrackProps, "dict">) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [isUpdating, setIsInUpdating] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [gpa, setGpa] = useState("");
  const [isAiUpdating, setIsAiUpdating] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "success" | "error">("idle");
  const { showToast } = useAppToast();

  const detailHref = `/courses/${course.id}`;

  const handleProgressChange = async (newProgress: number) => {
    if (newProgress === 100) {
      setProgress(100);
      setShowCompleteModal(true);
      return;
    }

    const validatedProgress = Math.min(100, Math.max(0, newProgress));
    setProgress(validatedProgress);
    setIsInUpdating(true);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: "update_progress",
          progress: validatedProgress,
        }),
      });
      if (res.ok) {
        onUpdate?.();
        startTransition(() => router.refresh());
      }
    } catch (e) {
      console.error("Failed to update progress:", e);
    } finally {
      setIsInUpdating(false);
    }
  };

  const executeCompletion = async () => {
    setIsInUpdating(true);
    setShowCompleteModal(false);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: "update_progress",
          progress: 100,
          gpa: gpa ? parseFloat(gpa) : 0,
        }),
      });
      if (res.ok) {
        onUpdate?.();
        startTransition(() => router.refresh());
      }
    } catch (e) {
      console.error("Failed to complete course:", e);
    } finally {
      setIsInUpdating(false);
    }
  };

  const handleAiSync = async () => {
    setIsAiUpdating(true);
    setAiStatus("idle");
    try {
      const res = await fetch("/api/ai/course-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (res.ok) {
        setAiStatus("success");
        showToast({ type: "success", message: "AI sync completed." });
        startTransition(() => router.refresh());
      } else {
        setAiStatus("error");
        let message = "AI sync failed.";
        try {
          const payload = await res.json();
          const candidate = typeof payload?.error === "string" ? payload.error.trim() : "";
          if (candidate) message = candidate;
        } catch {
          // Ignore parse error and use default message.
        }
        showToast({ type: "error", message });
      }
    } catch {
      setAiStatus("error");
      showToast({ type: "error", message: "Network error while running AI sync." });
    } finally {
      setIsAiUpdating(false);
      setTimeout(() => setAiStatus("idle"), 3000);
    }
  };

  const quickIncrements = [10, 25, 50, 75];
  const weekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const focusSegments = 20;
  const activeFocusSegments = Math.round((progress / 100) * focusSegments);

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-md p-3 grid grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_auto] gap-3 md:items-center">
      {/* Modals */}
      <AddPlanModal
        isOpen={showAddPlanModal}
        onClose={() => setShowAddPlanModal(false)}
        onSuccess={(saved) => setLocalPlan(saved)}
        course={{ id: course.id, title: course.title }}
        existingPlan={localPlan}
      />

      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#fcfcfc] border border-[#e5e5e5] rounded-xl p-4 w-full max-w-xs animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-md bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center text-[#555] shrink-0">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#1f1f1f]">
                  Mark as complete
                </h3>
                <p className="text-xs text-[#555] truncate">{course.title}</p>
              </div>
            </div>

            <label className="flex flex-col gap-1.5 mb-4">
              <span className="text-xs font-medium text-[#555]">GPA</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                placeholder="0.00"
                className="h-10 rounded-md border border-[#d8d8d8] bg-white px-3 text-[14px] font-medium text-[#222] outline-none focus:border-[#bcbcbc] transition-colors"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 h-9 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeCompletion}
                className="flex-1 h-9 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#1f1f1f] hover:bg-[#f5f5f5] transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Finalize
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <UniversityIcon
            name={course.university}
            size={32}
            className="flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-medium text-[#4d4d4d] leading-none">
                {course.university}
              </span>
              <span className="w-0.5 h-0.5 bg-gray-200 rounded-full"></span>
              <span className="text-[11px] text-[#777]">
                {course.courseCode}
              </span>
            </div>
            <h3 className="text-base font-semibold text-[#1f1f1f] tracking-tight leading-tight line-clamp-1">
              <Link href={detailHref}>{course.title}</Link>
            </h3>
          </div>
        </div>

        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-300 hover:text-brand-blue hover:bg-blue-50 transition-all border border-transparent hover:border-brand-blue/20 flex-shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-[#c0c0c0] uppercase tracking-wider mb-0.5">
              Focus_Intensity
            </span>
            {localPlan && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-[#666]">
                <Clock className="w-2.5 h-2.5" />
                <span>
                  {localPlan.days_of_week
                    .map((d) => weekdaysShort[d].toUpperCase())
                    .join("/")}{" "}
                  • {localPlan.start_time.slice(0, 5)} •{" "}
                  {new Date(localPlan.start_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  -
                  {new Date(localPlan.end_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>
          <span
            className={`text-lg font-semibold tracking-tight transition-colors ${isUpdating ? "text-[#333] animate-pulse" : "text-[#1f1f1f]"}`}
          >
            {progress}%
          </span>
        </div>

        <div className="relative h-3 flex items-center">
          <div className="absolute inset-0 flex items-center gap-1">
            {Array.from({ length: focusSegments }).map((_, index) => (
              <span
                key={index}
                className={`h-2 flex-1 rounded-[2px] transition-colors ${
                  index < activeFocusSegments
                    ? `bg-brand-blue ${isUpdating ? "animate-pulse" : ""}`
                    : "bg-gray-100 border border-gray-100"
                }`}
              />
            ))}
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            onMouseUp={(e) =>
              handleProgressChange(
                parseInt((e.target as HTMLInputElement).value),
              )
            }
            onTouchEnd={(e) =>
              handleProgressChange(
                parseInt((e.target as HTMLInputElement).value),
              )
            }
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#f0f0f0] md:pt-0 md:border-t-0 md:pl-2 md:border-l md:border-[#f0f0f0]">
        <div className="flex gap-1">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              onClick={() => handleProgressChange(inc)}
              disabled={isUpdating}
              className={`text-[10px] font-bold w-8 h-7 flex items-center justify-center rounded-md border transition-all ${
                progress === inc
                  ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                  : "bg-white text-[#888] border-gray-200 hover:border-gray-400 hover:text-[#444]"
              }`}
            >
              {inc}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button
            onClick={handleAiSync}
            disabled={isAiUpdating}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border disabled:opacity-50 ${
              aiStatus === "success"
                ? "bg-white text-emerald-600 border-emerald-300"
                : aiStatus === "error"
                  ? "bg-white text-rose-500 border-rose-300"
                  : "bg-white text-[#666] border-[#d3d3d3] hover:bg-[#f0f0f0] hover:text-[#1f1f1f]"
            }`}
            title="AI Sync"
            aria-label="AI Sync course intel"
          >
            {isAiUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          </button>

          <button
            onClick={() => setShowAddPlanModal(true)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all border ${
              localPlan
                ? "bg-white text-[#1f1f1f] border-[#d3d3d3] hover:bg-[#f5f5f5]"
                : "bg-white text-[#666] border-[#d3d3d3] hover:bg-[#f0f0f0] hover:text-[#1f1f1f]"
            }`}
          >
            {localPlan ? (
              <CalendarCheck className="w-3 h-3" />
            ) : (
              <CalendarPlus className="w-3 h-3" />
            )}
          </button>

          <button
            onClick={() => handleProgressChange(100)}
            disabled={isUpdating || progress === 100}
            className="w-7 h-7 rounded-md flex items-center justify-center transition-all border bg-white text-[#1f1f1f] border-[#d3d3d3] hover:bg-[#f5f5f5] disabled:opacity-30"
            title="Finalize"
            aria-label="Finalize course"
          >
            {isUpdating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
