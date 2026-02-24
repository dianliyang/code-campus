"use client";

import { Course } from "@/types";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Plus, EyeOff } from "lucide-react";
import { toggleCourseEnrollmentAction, hideCourseAction } from "@/actions/courses";

interface CourseCardProps {
  course: Course;
  isInitialEnrolled: boolean;
  onEnrollToggle?: () => void;
  onHide?: (courseId: number) => void;
  isSelected?: boolean;
  onSelectChange?: (courseId: number, checked: boolean) => void;
  progress?: number;
  viewMode?: "list" | "grid";
  rowIndex?: number;
}

export default function CourseCard({
  course,
  isInitialEnrolled,
  onEnrollToggle,
  onHide,
  isSelected = false,
  onSelectChange,
  progress,
  viewMode = "grid",
  rowIndex = 0,
}: CourseCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEnrolled, setIsEnrolled] = useState(isInitialEnrolled);
  const [loading, setLoading] = useState(false);

  const refParams = searchParams.toString();
  const detailHref = `/courses/${course.id}${refParams ? `?refParams=${encodeURIComponent(refParams)}` : ""}`;

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
    setLoading(true);
    try {
      await hideCourseAction(course.id);
      onHide?.(course.id);
      router.refresh();
    } catch (e) {
      console.error("Hide failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const credit = course.credit ?? null;
  const primaryField = course.fields?.[0];
  const topics = course.fields || [];
  const level = course.level || null;
  const formattedLevel = level ? `${level.charAt(0).toUpperCase()}${level.slice(1)}` : null;
  const latestSemester = getLatestSemesterLabel(course.semesters || []);

  if (viewMode === "list") {
    const rowBg = rowIndex % 2 === 0 ? "bg-[#fcfcfc]" : "bg-[#f7f7f7]";
    return (
      <div className={`group flex items-center gap-4 px-4 py-3 ${rowBg} hover:bg-[#f2f2f2] transition-colors`}>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <label className="relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(event) => onSelectChange?.(course.id, event.target.checked)}
              aria-label={`Select ${course.title}`}
              className="peer sr-only"
            />
            <span className="h-4 w-4 rounded-[4px] border border-[#cfcfcf] bg-white transition-colors peer-checked:border-[#2f2f2f] peer-checked:bg-[#2f2f2f]" />
            {isSelected ? <Check className="pointer-events-none absolute h-3 w-3 text-white" /> : null}
          </label>
          <UniversityIcon name={course.university} size={26} className="bg-white border border-[#dfdfdf] rounded-md" />
          <Link href={detailHref} className="min-w-0 block">
            <h2 className="text-[15px] font-medium text-[#2e2e2e] truncate hover:text-black transition-colors">
              {course.title}
            </h2>
            <p className="text-xs text-[#7a7a7a] truncate">
              {course.courseCode} · {course.university}
            </p>
          </Link>
        </div>

        <div className="w-[18%] hidden md:flex flex-wrap gap-1">
          {topics.length > 0 ? (
            topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="inline-flex h-5 items-center rounded bg-[#efefef] px-1.5 text-[10px] font-medium text-[#666]"
              >
                {topic}
              </span>
            ))
          ) : (
            <span className="text-xs text-[#9a9a9a]">-</span>
          )}
        </div>

        <div className="w-[8%] hidden md:block text-sm text-[#484848]">{credit ?? "-"}</div>

        <div className="w-[10%] hidden md:block text-sm text-[#484848]">{latestSemester ?? "-"}</div>


        <div className="w-[5%] flex items-center justify-end gap-2">
          <Button
            onClick={handleEnroll}
            disabled={loading}
            size="xs"
            className={
              isEnrolled
                ? "h-6 w-6 p-0 rounded-md border border-green-100 bg-green-50 text-green-700 hover:bg-green-100"
                : "h-6 w-6 p-0 rounded-md border border-[#d3d3d3] bg-white text-[#3b3b3b] hover:bg-[#f8f8f8]"
            }
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isEnrolled ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
          </Button>
          <button
            onClick={handleHide}
            disabled={loading}
            className="inline-flex h-6 w-6 shrink-0 p-0 items-center justify-center rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
            aria-label="Hide course"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] border border-[#e3e3e3] rounded-xl p-4">
      <div className="flex items-center gap-3 min-w-0">
        <UniversityIcon name={course.university} size={30} className="bg-white rounded-md" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900 truncate">{course.title}</h2>
          <p className="text-xs text-slate-500 truncate">
            {course.courseCode} · {course.university}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {primaryField ? (
          <span className="inline-flex rounded bg-[#efefef] px-2 py-0.5 text-[11px] font-medium text-[#666]">{primaryField}</span>
        ) : null}
        {formattedLevel ? (
          <span className="inline-flex rounded bg-[#efefef] px-2 py-0.5 text-[11px] font-medium text-[#666]">{formattedLevel}</span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-md bg-white px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Credit</p>
          <p className="text-[13px] font-medium text-[#3b3b3b]">{credit ?? "-"}</p>
        </div>
        <div className="rounded-md bg-white px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Semester</p>
          <p className="text-[13px] font-medium text-[#3b3b3b]">{latestSemester ?? "-"}</p>
        </div>
      </div>
      {progress ? <div className="mt-3 h-1 rounded-full bg-slate-100"><div className="h-full bg-slate-900 rounded-full" style={{ width: `${progress}%` }} /></div> : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={detailHref}
          className="h-8 flex items-center justify-center rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
        >
          View
        </Link>
        <Button
          onClick={handleEnroll}
          disabled={loading}
          size="xs"
          className={`h-8 w-full transition-colors ${
            isEnrolled
              ? "rounded-md border border-green-100 bg-green-50 text-green-700 hover:bg-green-100"
              : "rounded-md border border-[#d3d3d3] bg-white text-[#3b3b3b] hover:bg-[#f8f8f8]"
          }`}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isEnrolled ? (
            <><Check className="w-3.5 h-3.5" /> Enrolled</>
          ) : (
            <><Plus className="w-3.5 h-3.5" /> Enroll</>
          )}
        </Button>
      </div>
    </div>
  );
}

function getLatestSemesterLabel(semesters: string[]): string | null {
  if (!semesters.length) return null;
  const termOrder: Record<string, number> = { spring: 1, summer: 2, fall: 3, winter: 4 };

  const parsed = semesters
    .map((value) => {
      const m = value.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (!m) return null;
      const term = m[1];
      const year = Number(m[2]);
      const weight = termOrder[term.toLowerCase()] || 0;
      return { label: `${term} ${year}`, year, weight };
    })
    .filter((v): v is { label: string; year: number; weight: number } => v !== null);

  if (!parsed.length) return semesters[0] || null;

  parsed.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.weight - a.weight;
  });

  return parsed[0].label;
}
