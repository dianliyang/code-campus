"use client";

import { useState } from "react";
import { Course } from "@/types";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";
import AddPlanModal from "./AddPlanModal";
import { ExternalLink, Trophy, CheckCheck, CalendarCheck, CalendarPlus, Check, Clock } from "lucide-react";

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

export default function ActiveCourseTrack({ course, initialProgress, plan, onUpdate, dict }: ActiveCourseTrackProps) {
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
        router.refresh();
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
        router.refresh();
      }
    } catch (e) {
      console.error("Failed to complete course:", e);
    } finally {
      setIsInUpdating(false);
    }
  };

  const quickIncrements = [10, 25, 50, 75];
  const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col gap-6 group hover:border-brand-blue/30 transition-all">
      {/* Completion Modal Overlay */}
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
          <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-brand-green/10 rounded-[1.5rem] flex items-center justify-center text-brand-green mb-6">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-2 uppercase italic">Mission_Complete</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-relaxed">
                DATA_SIGNATURE_VERIFIED <br /> <span className="text-gray-900">{course.title}</span>
              </p>
            </div>

            <div className="space-y-6 mb-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">GPA_VAL</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="0.00"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-2xl px-4 py-3 outline-none font-black text-xl transition-all"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SCORE_PCT</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0.0"
                    className="bg-gray-50 border border-gray-100 focus:border-brand-blue rounded-2xl px-4 py-3 outline-none font-black text-xl transition-all"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={executeCompletion}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                LOG_ACHIEVEMENT <CheckCheck className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="w-full text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-900 transition-colors py-2"
              >
                ABORT_ACTION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <UniversityIcon
            name={course.university}
            size={36}
            className="flex-shrink-0 bg-gray-50 rounded-xl border border-gray-100 p-1.5"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest leading-none">{course.university}</span>
              <span className="w-0.5 h-0.5 bg-gray-200 rounded-full"></span>
              <span className="text-[9px] font-bold text-gray-300 font-mono">{course.courseCode}</span>
            </div>
            <h3 className="text-base font-black text-gray-900 tracking-tight leading-tight group-hover:text-brand-blue transition-colors line-clamp-1 italic uppercase">
              <Link href={detailHref}>{course.title}</Link>
            </h3>
          </div>
        </div>

        <a
          href={course.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300 hover:text-brand-blue hover:bg-blue-50 transition-all border border-transparent hover:border-brand-blue/20 flex-shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Middle Section: Technical Progress */}
      <div className="space-y-3">
        <div className="flex items-end justify-between mb-1">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">Absorption_Rate</span>
            {plan && (
              <div className="flex items-center gap-1.5 text-[8px] font-bold text-gray-400">
                <Clock className="w-2 h-2" />
                <span>{plan.days_of_week.map(d => weekdaysShort[d].toUpperCase()).join('/')} • {plan.start_time.slice(0, 5)}</span>
              </div>
            )}
          </div>
          <span className={`text-xl font-black italic tracking-tighter transition-colors ${isUpdating ? 'text-brand-blue animate-pulse' : 'text-gray-900'}`}>
            {progress}%
          </span>
        </div>
        
        <div className="relative h-6 flex items-center">
          <div className="absolute inset-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
            <div
              className={`h-full bg-brand-blue transition-all duration-500 relative ${isUpdating ? 'animate-pulse' : ''}`}
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20"></div>
            </div>
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

      {/* Bottom Section: Rapid Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
        <div className="flex gap-1">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              onClick={() => handleProgressChange(inc)}
              disabled={isUpdating}
              className={`text-[8px] font-black uppercase tracking-widest w-9 py-2 rounded-lg border transition-all ${
                progress === inc
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200 hover:text-gray-600'
              }`}
            >
              {inc}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-gray-100 mx-1"></div>

        <div className="flex items-center gap-1.5 flex-1">
          <button
            onClick={() => setShowAddPlanModal(true)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
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
            className="flex-1 h-8 text-[9px] font-black uppercase tracking-widest rounded-lg bg-brand-green text-white hover:bg-green-600 disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">{dict?.mark_complete || "FINALIZE"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
