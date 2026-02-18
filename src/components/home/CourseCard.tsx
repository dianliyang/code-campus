"use client";

import { Course } from "@/types";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, Check, Plus, EyeOff, Flame } from "lucide-react";
import { toggleCourseEnrollmentAction, hideCourseAction } from "@/actions/courses";

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
      await toggleCourseEnrollmentAction(course.id, isEnrolled);
      setIsEnrolled(!isEnrolled);
      onEnrollToggle?.();
      router.refresh();
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
      await hideCourseAction(course.id);
      router.refresh();
    } catch (e) {
      console.error("Hide failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const displayProgress = progress ?? 0;

  if (viewMode === "list") {
    return (
      <div className="group flex items-center gap-4 py-2 px-4 md:px-4 hover:bg-gray-50 transition-colors h-full">
        {/* 1. Icon */}
        <div className="w-[40px] flex-shrink-0 flex justify-center">
          <UniversityIcon 
            name={course.university} 
            size={28} 
            className="bg-white border border-gray-100 rounded-md"
          />
        </div>

        {/* 2. Course Info */}
        <div className="flex-grow min-w-0">
          <h2 className="text-[13px] font-bold text-gray-900 leading-tight truncate">
            <Link href={detailHref} className="hover:text-brand-blue transition-colors">
              {course.title}
            </Link>
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{course.university}</span>
            <span className="w-0.5 h-0.5 bg-gray-200 rounded-full"></span>
            <span className="text-xs text-slate-400">{course.courseCode}</span>
          </div>
        </div>

        {/* 3. Tags (Desktop) */}
        <div className="w-[18%] flex-shrink-0 hidden md:flex flex-wrap gap-1">
          {course.fields?.slice(0, 2).map((f) => (
            <Badge key={f} variant="secondary" className="text-xs truncate max-w-full">
              {f}
            </Badge>
          ))}
        </div>

        {/* 4. Extra Info (Desktop) */}
        <div className="w-[12%] flex-shrink-0 hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-[11px] font-bold text-gray-600">{course.popularity}</span>
          </div>
        </div>

        {/* 5. Actions */}
        <div className="w-20 flex-shrink-0 flex items-center justify-end gap-2 pr-2">
          <Button
            onClick={handleEnroll}
            disabled={loading}
            variant={isEnrolled ? "default" : "outline"}
            size="xs"
            className={isEnrolled ? 'bg-brand-green hover:bg-brand-green/90' : ''}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : isEnrolled ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span className="hidden lg:inline">{isEnrolled ? (dict?.enrolled || "Added") : (dict?.enroll || "Join")}</span>
          </Button>
          <button
            onClick={handleHide}
            disabled={loading}
            className="w-7 h-7 flex-shrink-0 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
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
        <Button
          onClick={handleEnroll}
          disabled={loading}
          variant={isEnrolled ? "default" : "outline"}
          size="xs"
          className={isEnrolled ? 'bg-brand-green hover:bg-brand-green/90' : ''}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : isEnrolled ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </Button>
      </div>

      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-400">{course.university} • {course.courseCode}</span>
        </div>
        <h2 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.5em]">
          <Link href={detailHref} className="hover:text-brand-blue transition-colors">
            {course.title}
          </Link>
        </h2>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {course.fields?.slice(0, 2).map((f) => (
          <Badge key={f} variant="secondary" className="text-xs">
            {f}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-medium text-gray-600">{course.popularity}</span>
          </div>
          {course.level && (
            <div className="flex items-center gap-1 text-gray-400" title={course.level}>
              <GraduationCap className="w-3 h-3" />
              <span className="text-xs font-medium truncate max-w-[80px]">{course.level}</span>
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
