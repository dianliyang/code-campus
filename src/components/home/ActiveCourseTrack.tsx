"use client";

import { useState } from "react";
import Image from "next/image";
import { Course } from "@/types";

interface ActiveCourseTrackProps {
  course: Course;
  initialProgress: number;
  onUpdate?: () => void;
  dict?: any;
}

export default function ActiveCourseTrack({ course, initialProgress, onUpdate, dict }: ActiveCourseTrackProps) {
  const [progress, setProgress] = useState(initialProgress);
  const [isUpdating, setIsInUpdating] = useState(false);

  const logos: Record<string, string> = {
    mit: "/mit.svg", stanford: "/stanford.jpg", cmu: "/cmu.jpg", ucb: "/ucb.png",
  };

  const handleProgressChange = async (newProgress: number) => {
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
      if (res.ok) onUpdate?.();
    } catch (e) {
      console.error("Failed to update progress:", e);
    } finally {
      setIsInUpdating(false);
    }
  };

  const quickIncrements = [10, 25, 50, 75];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-6 group hover:border-brand-blue/30 transition-all hover:shadow-lg hover:shadow-brand-blue/5">
      {/* University & Title info - Slim */}
      <div className="flex items-center gap-4 min-w-[300px]">
        <div className="w-8 h-8 relative flex-shrink-0 bg-gray-50 rounded-lg p-1">
          {logos[course.university] ? (
            <Image src={logos[course.university]} alt={course.university} fill className="object-contain p-1" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-black text-gray-400 text-[10px] uppercase">{course.university.substring(0, 1)}</div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest leading-none">{course.university}</span>
            <span className="text-[9px] font-bold text-gray-400 font-mono">{course.courseCode}</span>
          </div>
          <h3 className="text-sm font-black text-gray-900 tracking-tight truncate group-hover:text-brand-blue transition-colors">
            {course.title}
          </h3>
        </div>
      </div>

      {/* Interactive Progress Section */}
      <div className="flex-grow flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="flex-grow relative h-6 flex items-center">
            {/* Visual Digital Ticks with Background */}
            <div className="absolute inset-0 bg-gray-50 rounded-full"></div>
            <div className="flex gap-[3px] items-center w-full px-2 relative z-0">
              {Array.from({ length: 40 }).map((_, i) => {
                const isActive = (i / 40) < (progress / 100);
                return (
                  <div 
                    key={i} 
                    className={`flex-grow h-2.5 rounded-full transition-all duration-500 ${
                      isActive 
                        ? 'bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
                        : 'bg-gray-200'
                    } ${isActive && isUpdating ? 'animate-pulse' : ''}`}
                  ></div>
                );
              })}
            </div>
            
            {/* Hidden functional slider - made slightly more visible on hover */}
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
          
          <div className="flex items-center gap-2 min-w-[45px] justify-end">
            <span className={`text-sm font-black italic tracking-tighter transition-colors ${isUpdating ? 'text-brand-blue animate-pulse' : 'text-gray-900'}`}>
              {progress}%
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {quickIncrements.map((inc) => (
            <button
              key={inc}
              onClick={() => handleProgressChange(inc)}
              disabled={isUpdating}
              className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border transition-all ${
                progress === inc 
                  ? 'bg-brand-blue text-white border-brand-blue' 
                  : 'bg-white text-gray-400 border-gray-100 hover:border-brand-blue hover:text-brand-blue'
              }`}
            >
              {inc}%
            </button>
          ))}
          <div className="w-px h-3 bg-gray-100 mx-1"></div>
          <button
            onClick={() => handleProgressChange(100)}
            disabled={isUpdating || progress === 100}
            className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border border-brand-green/20 text-brand-green bg-brand-green/5 hover:bg-brand-green hover:text-white transition-all flex items-center gap-1"
          >
            <i className="fa-solid fa-check text-[7px]"></i>
            {dict?.mark_complete || "Complete"}
          </button>
        </div>
      </div>

      {/* Action Area - Slim */}
      <div className="flex items-center border-l border-gray-100 pl-6 gap-3">
        <a 
          href={course.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-all cursor-pointer border border-transparent hover:border-brand-blue/20"
          title={dict?.go_to_course || "Go to Course"}
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-xs"></i>
        </a>
      </div>
    </div>
  );
}
