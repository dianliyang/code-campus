"use client";

import Image from "next/image";
import { Course } from "@/types";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";

interface CourseCardProps {
  course: Course;
  isInitialEnrolled: boolean;
  onEnrollToggle?: () => void;
  progress?: number;
  dict: Dictionary['dashboard']['courses'];
  viewMode?: "list" | "grid";
}

export default function CourseCard({
  course,
  isInitialEnrolled,
  onEnrollToggle,
  progress,
  dict,
  viewMode = "grid",
}: CourseCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEnrolled, setIsEnrolled] = useState(isInitialEnrolled);
  const [loading, setLoading] = useState(false);
  
  const refParams = searchParams.toString();
  const detailHref = `/courses/${course.id}${refParams ? `?refParams=${encodeURIComponent(refParams)}` : ''}`;

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent link click if nested
    setLoading(true);
    try {
      const response = await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: isEnrolled ? "unenroll" : "enroll",
        }),
      });
      if (response.ok) {
        setIsEnrolled(!isEnrolled);
        onEnrollToggle?.();
        router.refresh();
      }
    } catch (e) {
      console.error("Enrollment failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const displayProgress = progress ?? 0;

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-6 py-4 px-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        
        {/* 1. Icon */}
        <div className="flex-shrink-0">
          <UniversityIcon 
            name={course.university} 
            size={32} 
            className="bg-white border border-gray-200 rounded"
          />
        </div>

        {/* 2. Main Info: Code & Title */}
        <div className="w-[30%] flex-shrink-0 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                {course.university}
              </span>
              <span className="text-[10px] font-mono font-medium text-gray-500">
                {course.courseCode}
              </span>
              {course.level && (
                <span className="text-gray-500 text-[10px]" title={course.level}>
                  {course.level.toLowerCase().includes('grad') ? (
                    <i className="fa-solid fa-user-graduate"></i>
                  ) : (
                    <i className="fa-solid fa-graduation-cap"></i>
                  )}
                </span>
              )}
              {course.isInternal && (
                <span className="text-[9px] font-bold bg-blue-50 text-brand-blue px-1.5 py-0.5 rounded uppercase">
                    Internal
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-gray-900 leading-snug">
              <Link href={detailHref} className="hover:text-brand-blue transition-colors">
                {course.title}
              </Link>
            </h2>
        </div>

        {/* 3. Tags / Fields */}
        <div className="w-[20%] flex-shrink-0 hidden md:flex flex-wrap gap-1.5">
             {course.fields?.slice(0, 2).map((f) => (
                <span
                  key={f}
                  className="bg-gray-100/80 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-gray-200 truncate max-w-full"
                >
                  {f}
                </span>
              ))}
              {(course.fields?.length || 0) > 2 && (
                <span className="text-[10px] text-gray-400 font-medium px-1 self-center">
                  +{course.fields!.length - 2}
                </span>
              )}
        </div>

        {/* 4. Details / Stats */}
        <div className="flex-grow min-w-0 flex flex-col justify-center gap-1">
             <div className="flex items-center gap-1.5">
                <i className="fa-solid fa-fire-flame-simple text-orange-400 text-[10px]"></i>
                <span className="text-xs font-semibold text-gray-700">
                  {course.popularity}
                </span>
             </div>
        </div>

        {/* 5. Actions */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 w-auto min-w-[100px]">
             <button 
              onClick={handleEnroll}
              disabled={loading}
              className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                isEnrolled 
                  ? 'bg-brand-green text-white' 
                  : 'bg-gray-100 text-gray-500 hover:bg-brand-dark hover:text-white'
              }`}
            >
              {loading ? (
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              ) : isEnrolled ? (
                <>
                  <i className="fa-solid fa-check"></i>
                  <span className="hidden sm:inline">{dict?.enrolled || "Added"}</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus"></i>
                  <span className="hidden sm:inline">{dict?.enroll || "Join"}</span>
                </>
              )}
            </button>
             <Link
                href={detailHref}
                className="text-gray-400 hover:text-brand-blue text-xs p-1.5 transition-colors"
                title={dict?.details || "Details"}
              >
                <i className="fa-solid fa-arrow-right"></i>
              </Link>
        </div>

      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 transition-all relative overflow-hidden group flex flex-col h-full">
      <button 
        onClick={handleEnroll}
        disabled={loading}
        className={`absolute top-0 right-6 z-10 px-3 py-1 rounded-b-lg text-[10px] font-black uppercase tracking-widest transition-all ${
          isEnrolled 
            ? 'bg-brand-green text-white' 
            : 'bg-gray-100 text-gray-500 hover:bg-brand-dark hover:text-white'
        }`}
      >
        {loading ? (
          <i className="fa-solid fa-circle-notch fa-spin"></i>
        ) : isEnrolled ? (
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-check"></i> {dict?.enrolled || "Added"}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-plus"></i> {dict?.enroll || "Join"}
          </span>
        )}
      </button>

      <div className="mb-3">
        {/* Row 1: Icon + Code + Level */}
        <div className="flex items-center gap-3 mb-2 pr-20">
          <UniversityIcon 
            name={course.university} 
            size={32} 
            className="flex-shrink-0 bg-white border border-gray-200 rounded"
          />
          <div className="flex items-center gap-2 min-w-0">
             <span className="text-xs font-mono font-bold text-gray-500 truncate">
              {course.courseCode}
            </span>
            {course.level && (
              <span className="text-gray-500 text-[11px]" title={course.level}>
                {course.level.toLowerCase().includes('grad') ? (
                  <i className="fa-solid fa-user-graduate"></i>
                ) : (
                  <i className="fa-solid fa-graduation-cap"></i>
                )}
              </span>
            )}
             {course.isInternal && (
              <span className="text-[9px] font-bold bg-blue-50 text-brand-blue px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                Internal
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Title */}
        <h2 className="text-lg font-bold text-gray-900 leading-snug transition-colors pr-4">
            <Link href={detailHref} className="hover:text-brand-blue">{course.title}</Link>
        </h2>
      </div>

      <div className="flex gap-1.5 mb-6 flex-wrap">
        {course.fields?.slice(0, 3).map((f) => (
          <span
            key={f}
            className="bg-gray-50 text-gray-600 text-[10px] font-medium px-2.5 py-1 rounded-full border border-gray-200"
          >
            {f}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-5 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-fire-flame-simple text-orange-400"></i>
            <span className="font-semibold text-gray-700">{course.popularity}</span>
          </div>
          <Link
            href={detailHref}
            className="text-gray-400 hover:text-brand-blue text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 transition-colors"
          >
            {dict?.details || "Details"} <i className="fa-solid fa-arrow-right text-[8px]"></i>
          </Link>
        </div>
      </div>

      {isEnrolled && displayProgress > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-50">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              Progress
            </span>
            <span className="text-[10px] font-bold text-brand-blue">
              {displayProgress}%
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-brand-blue transition-all duration-1000" style={{ width: `${displayProgress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
