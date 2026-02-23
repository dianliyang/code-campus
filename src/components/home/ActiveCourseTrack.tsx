"use client";

import { startTransition, useState } from "react";
import { Course } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";
import AddPlanModal from "./AddPlanModal";
import { ExternalLink, Trophy, CheckCheck, CalendarCheck, CalendarPlus, Check, Clock, Loader2 } from "lucide-react";

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
  dict: Dictionary['dashboard']['roadmap'];
}

export default function ActiveCourseTrack({ course, initialProgress, plan, onUpdate }: Omit<ActiveCourseTrackProps, 'dict'>) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [isUpdating, setIsInUpdating] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [gpa, setGpa] = useState("");
  const [score, setScore] = useState("");

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
          progress: validatedProgress
        })
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
          score: score ? parseFloat(score) : 0
        })
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

  const quickIncrements = [10, 25, 50, 75];
  const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const focusSegments = 20;
  const activeFocusSegments = Math.round((progress / 100) * focusSegments);

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-md p-3 flex flex-col gap-3">
      {/* Modals */}
      {showAddPlanModal && (
        <AddPlanModal
          isOpen={showAddPlanModal}
          onClose={() => setShowAddPlanModal(false)}
          course={{ id: course.id, title: course.title }}
          existingPlan={plan}
        />
      )}

      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/10 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-300 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center text-brand-green mb-4">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tighter mb-1 uppercase italic">Complete_Module</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em] leading-relaxed">
                Log final academic performance for: <br /> <span className="text-gray-900">{course.title}</span>
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">GPA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="0.00"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-xl px-4 py-2.5 outline-none font-black text-lg transition-all"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Score %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-xl px-4 py-2.5 outline-none font-black text-lg transition-all"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={executeCompletion}
                className="w-full bg-gray-900 text-white py-3.5 rounded-xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                COMMIT_DATA <CheckCheck className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="w-full text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors py-2"
              >
                Abort
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
            className="flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 p-1"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-medium text-[#4d4d4d] leading-none">{course.university}</span>
              <span className="w-0.5 h-0.5 bg-gray-200 rounded-full"></span>
              <span className="text-[11px] text-[#9a9a9a]">{course.courseCode}</span>
            </div>
            <h3 className="text-sm font-semibold text-[#1f1f1f] tracking-tight leading-tight line-clamp-1">
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
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Focus_Intensity</span>
            {plan && (
              <div className="flex items-center gap-1 text-[8px] font-medium text-gray-400">
                <Clock className="w-2.5 h-2.5" />
                <span>{plan.days_of_week.map(d => weekdaysShort[d].toUpperCase()).join('/')} • {plan.start_time.slice(0, 5)} • {new Date(plan.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-{new Date(plan.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>
          <span className={`text-lg font-semibold tracking-tight transition-colors ${isUpdating ? 'text-[#333] animate-pulse' : 'text-[#1f1f1f]'}`}>
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
                    ? `bg-brand-blue ${isUpdating ? 'animate-pulse' : ''}`
                    : 'bg-gray-100 border border-gray-100'
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
            onMouseUp={(e) => handleProgressChange(parseInt((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => handleProgressChange(parseInt((e.target as HTMLInputElement).value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-[#f0f0f0]">
        <div className="flex gap-1">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              onClick={() => handleProgressChange(inc)}
              disabled={isUpdating}
              className={`text-[8px] font-bold w-8 h-7 flex items-center justify-center rounded-md border transition-all ${
                progress === inc
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600'
              }`}
            >
              {inc}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button
            onClick={() => setShowAddPlanModal(true)}
            className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
              plan 
                ? "bg-teal-50 text-teal-600 border border-teal-100" 
                : "bg-violet-50 text-violet-500 border border-violet-100 hover:bg-violet-100"
            }`}
          >
            {plan ? <CalendarCheck className="w-3 h-3" /> : <CalendarPlus className="w-3 h-3" />}
          </button>

          <button
            onClick={() => handleProgressChange(100)}
            disabled={isUpdating || progress === 100}
            className="px-3 h-7 text-[9px] font-bold uppercase tracking-widest rounded-md bg-brand-green text-white hover:bg-green-600 disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
          >
            {isUpdating ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
            <span className="hidden sm:inline">Finalize</span>
          </button>
        </div>
      </div>
    </div>
  );
}
