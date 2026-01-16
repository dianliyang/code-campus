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
    setProgress(newProgress);
    setIsInUpdating(true);
    try {
      const res = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: "update_progress",
          progress: newProgress
        })
      });
      if (res.ok) onUpdate?.();
    } catch (e) {
      console.error("Failed to update progress:", e);
    } finally {
      setIsInUpdating(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 px-6 py-3 flex flex-col md:flex-row md:items-center gap-6 group hover:border-gray-200 transition-colors">
      {/* University & Title info - Slim */}
      <div className="flex items-center gap-4 min-w-[320px]">
        <div className="w-5 h-5 relative flex-shrink-0">
          {logos[course.university] ? (
            <Image src={logos[course.university]} alt={course.university} fill className="object-contain" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-[7px] uppercase">{course.university.substring(0, 1)}</div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">{course.courseCode}</span>
            {course.level && (
              <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest leading-none border border-gray-100 px-1 rounded-sm">
                {course.level}
              </span>
            )}
          </div>
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight truncate group-hover:text-brand-blue transition-colors">
            {course.title}
          </h3>
          {course.corequisites && (
            <p className="text-[8px] font-medium text-gray-400 uppercase tracking-wider mt-1 truncate" title={course.corequisites}>
              {dict?.coreq || "Coreq"}: {course.corequisites}
            </p>
          )}
        </div>
      </div>

      {/* Interactive Progress Section - Innovative Signal Strip */}
      <div className="flex-grow flex items-center gap-6">
        <div className="flex-grow relative h-4 flex items-center group/ticks">
          {/* Visual Digital Ticks */}
          <div className="flex gap-[3px] items-center w-full">
            {Array.from({ length: 25 }).map((_, i) => {
              const isActive = (i / 25) < (progress / 100);
              return (
                <div 
                  key={i} 
                  className={`w-[2px] h-2 rounded-full transition-all duration-500 ${
                    isActive 
                      ? 'bg-brand-blue shadow-[0_0_8px_rgba(59,130,246,0.4)]' 
                      : 'bg-gray-100'
                  } ${isActive && isUpdating ? 'animate-pulse' : ''}`}
                ></div>
              );
            })}
          </div>
          
          {/* Hidden functional slider */}
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            onMouseUp={(e) => handleProgressChange(parseInt((e.target as HTMLInputElement).value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>
        
        <div className="flex items-center gap-2 min-w-[60px] justify-end">
          <span className={`text-base font-black italic tracking-tighter transition-colors ${isUpdating ? 'text-gray-300' : 'text-gray-900'}`}>
            {progress}%
          </span>
        </div>
      </div>

      {/* Action Area - Slim */}
      <div className="flex items-center border-l border-gray-100 pl-6 gap-3">
        <a 
          href={course.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 hover:text-brand-blue hover:bg-blue-50 transition-all cursor-pointer"
          title={dict?.go_to_course || "Go to Course"}
        >
          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
        </a>
      </div>
    </div>
  );
}
