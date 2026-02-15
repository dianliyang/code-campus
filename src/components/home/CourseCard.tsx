"use client";

import { Course } from "@/types";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";
import { GraduationCap, Loader2, Check, Plus, EyeOff, Flame } from "lucide-react";

interface CourseCardProps {
  course: Course;
  isInitialEnrolled: boolean;
  onEnrollToggle?: () => void;
  onHide?: (courseId: number) => void;
  progress?: number;
  dict: Dictionary['dashboard']['courses'];
  viewMode?: "list" | "grid";
}

export default function CourseCard({
  course,
  isInitialEnrolled,
  onEnrollToggle,
  onHide,
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
    e.preventDefault();
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

  const handleHide = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    onHide?.(course.id);
    setLoading(true);
    try {
      await fetch("/api/courses/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          action: "hide",
        }),
      });
    } catch (e) {
      console.error("Hide failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const displayProgress = progress ?? 0;

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-4 py-2.5 px-4 md:px-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {/* 1. Icon */}
        <div className="w-[40px] flex-shrink-0 flex justify-center">
          <UniversityIcon 
            name={course.university} 
            size={28} 
            className="bg-white border border-gray-100 rounded-md"
          />
        </div>

        {/* 2. Course Info */}
        <div className="w-[30%] flex-shrink-0 min-w-0">
          <h2 className="text-[13px] font-bold text-gray-900 leading-tight truncate">
            <Link href={detailHref} className="hover:text-brand-blue transition-colors">
              {course.title}
            </Link>
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{course.university}</span>
            <span className="w-0.5 h-0.5 bg-gray-200 rounded-full"></span>
            <span className="text-[9px] font-mono text-gray-400">{course.courseCode}</span>
          </div>
        </div>

        {/* 3. Tags (Desktop) */}
        <div className="w-[20%] flex-shrink-0 hidden md:flex flex-wrap gap-1">
          {course.fields?.slice(0, 2).map((f) => (
            <span key={f} className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded truncate max-w-full uppercase tracking-tighter">
              {f}
            </span>
          ))}
        </div>

        {/* 4. Extra Info (Desktop) */}
        <div className="flex-grow min-w-0 hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-[11px] font-bold text-gray-600">{course.popularity}</span>
          </div>
          {course.level && (
            <div className="flex items-center gap-1 text-gray-400" title={course.level}>
              <GraduationCap className="w-3 h-3" />
              <span className="text-[9px] font-medium truncate max-w-[60px]">{course.level}</span>
            </div>
          )}
        </div>

        {/* 5. Actions */}
        <div className="flex-shrink-0 flex items-center justify-end gap-2 ml-auto">
          <button 
            onClick={handleEnroll}
            disabled={loading}
            className={`h-7 px-3 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              isEnrolled 
                ? 'bg-brand-green text-white shadow-sm' 
                : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900'
            }`}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : isEnrolled ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span className="hidden sm:inline">{isEnrolled ? (dict?.enrolled || "Added") : (dict?.enroll || "Join")}</span>
          </button>
          <button
            onClick={handleHide}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Grid Mode (Compact)
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 transition-all relative overflow-hidden group flex flex-col h-full hover:border-gray-300">
      <div className="flex items-start justify-between gap-3 mb-3">
        <UniversityIcon 
          name={course.university} 
          size={32} 
          className="flex-shrink-0 bg-white border border-gray-100 rounded-lg"
        />
        <button 
          onClick={handleEnroll}
          disabled={loading}
          className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
            isEnrolled 
              ? 'bg-brand-green text-white' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-900 hover:text-white'
          }`}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : isEnrolled ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </button>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-tighter">{course.university} • {course.courseCode}</span>
        </div>
        <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.5em]">
          <Link href={detailHref} className="hover:text-brand-blue transition-colors">
            {course.title}
          </Link>
        </h2>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {course.fields?.slice(0, 2).map((f) => (
          <span key={f} className="bg-gray-50 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">
            {f}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-bold text-gray-600">{course.popularity}</span>
          </div>
          {course.level && (
            <div className="flex items-center gap-1 text-gray-400" title={course.level}>
              <GraduationCap className="w-3 h-3" />
              <span className="text-[9px] font-medium truncate max-w-[80px]">{course.level}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleHide}
          disabled={loading}
          className="text-gray-300 hover:text-red-500 transition-colors"
        >
          <EyeOff className="w-3.5 h-3.5" />
        </button>
      </div>

      {isEnrolled && displayProgress > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-brand-blue transition-all duration-1000" style={{ width: `${displayProgress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
}
