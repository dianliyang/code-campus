"use client";

import { Course } from "@/types";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Plus, EyeOff, Flame } from "lucide-react";
import { toggleCourseEnrollmentAction, hideCourseAction } from "@/actions/courses";

interface CourseCardProps {
  course: Course;
  isInitialEnrolled: boolean;
  onEnrollToggle?: () => void;
  onHide?: (courseId: number) => void;
  progress?: number;
  dict: Dictionary["dashboard"]["courses"];
  viewMode?: "list" | "grid";
  rowIndex?: number;
}

export default function CourseCard({
  course,
  isInitialEnrolled,
  onEnrollToggle,
  onHide,
  progress,
  dict,
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

  const popularity = typeof course.popularity === "number" ? `${course.popularity}%` : "-";
  const credit = course.credit ?? null;
  const primaryField = course.fields?.[0];
  const level = course.level || null;
  const formattedLevel = level ? `${level.charAt(0).toUpperCase()}${level.slice(1)}` : null;
  const latestSemester = getLatestSemesterLabel(course.semesters || []);

  if (viewMode === "list") {
    const rowBg = rowIndex % 2 === 0 ? "bg-[#fcfcfc]" : "bg-[#f7f7f7]";
    return (
      <div className={`group flex items-center gap-4 px-4 py-3 ${rowBg} hover:bg-[#f2f2f2] transition-colors`}>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <span className="h-4 w-4 rounded border border-[#cfcfcf] bg-white shrink-0" />
          <UniversityIcon name={course.university} size={26} className="bg-white border border-[#dfdfdf] rounded-md" />
          <div className="min-w-0">
            <h2 className="text-[15px] font-medium text-[#2e2e2e] truncate">
              <Link href={detailHref} className="hover:text-black transition-colors">
                {course.title}
              </Link>
            </h2>
            <p className="text-xs text-[#7a7a7a] truncate">
              {course.courseCode} · {course.university}
              {latestSemester ? ` · ${latestSemester}` : ""}
            </p>
          </div>
        </div>

        <div className="w-[14%] hidden md:block">
          <span
            className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
              isEnrolled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {isEnrolled ? (dict?.enrolled || "Enrolled") : "Open"}
          </span>
        </div>

        <div className="w-[12%] hidden md:block text-sm text-[#484848]">{credit ?? "-"}</div>

        <div className="w-[12%] hidden md:block text-sm text-[#484848]">{latestSemester ?? "-"}</div>

        <div className="w-[10%] hidden md:flex items-center gap-1 text-xs text-[#666]">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>{popularity}</span>
        </div>

        <div className="w-[8%] flex items-center justify-end gap-2">
          <Button
            onClick={handleEnroll}
            disabled={loading}
            size="xs"
            className={
              isEnrolled
                ? "h-7 w-7 p-0 rounded-md bg-[#ececec] text-[#3f3f3f] hover:bg-[#e5e5e5]"
                : "h-7 w-7 p-0 rounded-md bg-white border border-[#d6d6d6] text-[#4f4f4f] hover:bg-[#f4f4f4]"
            }
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isEnrolled ? (
              <Check className="w-3 h-3" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
          </Button>
          <button
            onClick={handleHide}
            disabled={loading}
            className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors"
            aria-label="Hide course"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa] border border-[#e3e3e3] rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <UniversityIcon name={course.university} size={30} className="bg-white rounded-md" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 truncate">
              <Link href={detailHref}>{course.title}</Link>
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {course.courseCode} · {course.university}
              {latestSemester ? ` · ${latestSemester}` : ""}
            </p>
          </div>
        </div>
        <Button
          onClick={handleEnroll}
          disabled={loading}
          size="xs"
          className={`h-7 w-7 p-0 rounded-md transition-colors ${
            isEnrolled
              ? "bg-[#ececec] text-[#3f3f3f] hover:bg-[#e5e5e5]"
              : "bg-white border border-[#d6d6d6] text-[#4f4f4f] hover:bg-[#f4f4f4]"
          }`}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isEnrolled ? (
            <Check className="w-3 h-3" />
          ) : (
            <Plus className="w-3 h-3" />
          )}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <span
          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${
            isEnrolled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {isEnrolled ? (dict?.enrolled || "Enrolled") : "Open"}
        </span>
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
        <div className="rounded-md bg-white px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">Interest</p>
          <p className="inline-flex items-center gap-1 text-[13px] font-medium text-[#3b3b3b]">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            {popularity}
          </p>
        </div>
      </div>
  {progress ? <div className="mt-3 h-1 rounded-full bg-slate-100"><div className="h-full bg-slate-900 rounded-full" style={{ width: `${progress}%` }} /></div> : null}
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
