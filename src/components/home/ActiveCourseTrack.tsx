"use client";

import { useState } from "react";
import { Course } from "@/types";
import { useRouter } from "next/navigation";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";

interface ActiveCourseTrackProps {
  course: Course;
  initialProgress: number;
  onUpdate?: () => void;
  dict: Dictionary['dashboard']['roadmap'];
}

export default function ActiveCourseTrack({ course, initialProgress, onUpdate, dict }: ActiveCourseTrackProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [isUpdating, setIsInUpdating] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [gpa, setGpa] = useState("");
  const [score, setScore] = useState("");

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

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-6 group hover:border-brand-blue/30 transition-all hover:shadow-xl hover:shadow-brand-blue/5">
      {/* Completion Modal Overlay */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border-2 border-gray-900 rounded-3xl p-8 shadow-[12px_12px_0_0_rgba(0,0,0,1)] w-full max-w-md animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green mb-6">
                <i className="fa-solid fa-trophy text-2xl"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-2 uppercase">Course Mastered</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Congratulations on completing <br /> <span className="text-gray-900">{course.title}</span>
              </p>
            </div>

            <div className="space-y-6 mb-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final GPA (0-5.0)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="5"
                    placeholder="0.00"
                    className="bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-black text-lg transition-all"
                    value={gpa}
                    onChange={(e) => setGpa(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Score (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    max="100"
                    placeholder="0.0"
                    className="bg-gray-50 border-2 border-gray-100 focus:border-brand-blue rounded-xl px-4 py-3 outline-none font-black text-lg transition-all"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[9px] text-gray-300 font-bold uppercase tracking-widest text-center">
                * Fields are optional. Leave empty to skip.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={executeCompletion}
                className="w-full btn-primary py-4 rounded-xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest"
              >
                Confirm Achievement <i className="fa-solid fa-check-double text-[10px]"></i>
              </button>
              <button 
                onClick={() => setShowCompleteModal(false)}
                className="w-full text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] hover:text-gray-900 transition-colors py-2"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Section: Title & Logo */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <UniversityIcon 
            name={course.university} 
            size={40} 
            className="flex-shrink-0 bg-gray-50 rounded-xl border border-gray-100 p-1.5"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-brand-blue uppercase tracking-[0.2em] leading-none">{course.university}</span>
              <span className="text-[10px] font-bold text-gray-400 font-mono">{course.courseCode}</span>
            </div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight group-hover:text-brand-blue transition-colors line-clamp-1">
              {course.title}
            </h3>
          </div>
        </div>
        
        <a 
          href={course.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-all cursor-pointer border border-transparent hover:border-brand-blue/20 flex-shrink-0"
          title={dict?.go_to_course || "Go to Course"}
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
        </a>
      </div>

      {/* Middle Section: Progress Bar (Slimmer) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Learning Progress</span>
          <span className={`text-sm font-black italic tracking-tighter transition-colors ${isUpdating ? 'text-brand-blue animate-pulse' : 'text-gray-900'}`}>
            {progress}%
          </span>
        </div>
        <div className="relative h-4 flex items-center">
          {/* Background Track */}
          <div className="absolute inset-0 bg-gray-50 rounded-full h-1.5 my-auto"></div>
          {/* Visual Digital Ticks */}
          <div className="flex gap-[2px] items-center w-full relative z-0">
            {Array.from({ length: 50 }).map((_, i) => {
              const isActive = (i / 50) < (progress / 100);
              return (
                <div 
                  key={i} 
                  className={`flex-grow h-1.5 rounded-full transition-all duration-500 ${
                    isActive 
                      ? 'bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
                      : 'bg-transparent'
                  } ${isActive && isUpdating ? 'animate-pulse' : ''}`}
                ></div>
              );
            })}
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

      {/* Bottom Section: Quick Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
        <div className="flex gap-1.5">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              onClick={() => handleProgressChange(inc)}
              disabled={isUpdating}
              className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-all ${
                progress === inc 
                  ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20' 
                  : 'bg-white text-gray-400 border-gray-100 hover:border-brand-blue/30 hover:text-brand-blue'
              }`}
            >
              {inc}%
            </button>
          ))}
        </div>
        <div className="w-px h-4 bg-gray-100 mx-2"></div>
        <button
          onClick={() => handleProgressChange(100)}
          disabled={isUpdating || progress === 100}
          className="flex-grow text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-brand-green/20 text-brand-green bg-brand-green/5 hover:bg-brand-green hover:text-white transition-all flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-check text-[8px]"></i>
          {dict?.mark_complete || "Complete"}
        </button>
      </div>
    </div>
  );
}
