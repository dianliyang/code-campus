"use client";

import { Course } from "@/types";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import CourseCodeHoverCard from "@/components/common/CourseCodeHoverCard";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Plus, EyeOff } from "lucide-react";
import {
  toggleCourseEnrollmentAction,
  hideCourseAction,
} from "@/actions/courses";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
  const primaryField = course.subdomain || course.fields?.[0];
  const level = course.level || null;
  const formattedLevel = level
    ? `${level.charAt(0).toUpperCase()}${level.slice(1)}`
    : null;
  const latestSemester = getLatestSemesterLabel(course.semesters || []);

  if (viewMode === "list") {
    return (
      <TableRow>
        <TableCell>
          {/* <label className="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center">
            <Input
              type="checkbox"
              checked={isSelected}
              onChange={(event) =>
                onSelectChange?.(course.id, event.target.checked)
              }
              aria-label={`Select ${course.title}`}
            />

            <span className="h-4 w-4 border border-[#cfcfcf] bg-white transition-colors peer-checked:border-[#2f2f2f] peer-checked:bg-[#2f2f2f]" />
            {isSelected ? (
              <Check className="pointer-events-none absolute h-3 w-3 text-white" />
            ) : null}
          </label> */}
        </TableCell>
        <TableCell>
          <div className="min-w-0 flex items-start gap-3">
            <UniversityIcon
              name={course.university}
              size={26}
              className="bg-white border border-[#dfdfdf]"
            />
            <Link
              href={detailHref}
              prefetch={false}
              className="flex-1 min-w-0 block"
            >
              <h2 className="text-[14px] md:text-[15px] font-medium text-[#2e2e2e] line-clamp-2 md:truncate hover:text-black transition-colors">
                {course.title}
              </h2>
              <CourseCodeHoverCard
                university={course.university}
                courseCode={course.courseCode}
                title={course.title}
                className="text-xs text-[#7a7a7a]"
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
                {latestSemester ? (
                  <Badge className="bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">
                    {latestSemester}
                  </Badge>
                ) : null}
                {credit != null ? (
                  <Badge className="bg-[#efefef] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">
                    {credit} cr
                  </Badge>
                ) : null}
                {primaryField ? (
                  <Badge variant="outline" className="max-w-[130px] truncate">
                    {primaryField}
                  </Badge>
                ) : null}
              </div>
            </Link>
          </div>
        </TableCell>

        <TableCell>
          {course.subdomain ? (
            <span className="text-[13px] text-[#444] truncate">
              {course.subdomain}
            </span>
          ) : (
            <span className="text-xs text-[#9a9a9a]">-</span>
          )}
        </TableCell>

        <TableCell>{credit ?? "-"}</TableCell>

        <TableCell>{latestSemester ?? "-"}</TableCell>

        <TableCell>
          <div className="flex items-center justify-end gap-1.5 md:gap-2">
            <Button
              variant="outline"
              onClick={handleEnroll}
              disabled={loading}
              aria-label={isEnrolled ? "Unenroll course" : "Enroll course"}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : isEnrolled ? (
                <Check />
              ) : (
                <Plus />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleHide}
              disabled={loading}
              aria-label="Hide course"
            >
              <EyeOff />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <UniversityIcon
              name={course.university}
              size={30}
              className="bg-white border border-[#dfdfdf]"
            />
            <div className="min-w-0 flex-1">
              <Link href={detailHref} prefetch={false} className="block">
                <h2 className="text-base font-semibold text-slate-900 whitespace-normal break-words leading-5 line-clamp-2">
                  {course.title}
                </h2>
              </Link>
              <CourseCodeHoverCard
                university={course.university}
                courseCode={course.courseCode}
                title={course.title}
                className="text-xs text-slate-500"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={handleEnroll}
            disabled={loading}
            aria-label={isEnrolled ? "Unenroll course" : "Enroll course"}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : isEnrolled ? (
              <Check />
            ) : (
              <Plus />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-0">
        <div className="mt-auto">
          <div className="flex items-center gap-1.5">
            {primaryField ? (
              <Badge variant="outline">{primaryField}</Badge>
            ) : null}
            {formattedLevel ? (
              <Badge variant="secondary">{formattedLevel}</Badge>
            ) : null}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">
                Credit
              </p>
              <p className="text-[13px] font-medium text-[#3b3b3b]">
                {credit ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-[#9a9a9a]">
                Semester
              </p>
              <p className="text-[13px] font-medium text-[#3b3b3b]">
                {latestSemester ?? "-"}
              </p>
            </div>
          </div>
        </div>

        {progress ? (
          <div className="mt-2 h-1 bg-slate-100">
            <div
              className="h-full bg-slate-900"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getLatestSemesterLabel(semesters: string[]): string | null {
  if (!semesters.length) return null;
  const termOrder: Record<string, number> = {
    spring: 1,
    summer: 2,
    fall: 3,
    winter: 4,
  };

  const parsed = semesters
    .map((value) => {
      const m = value.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
      if (!m) return null;
      const term = m[1];
      const year = Number(m[2]);
      const weight = termOrder[term.toLowerCase()] || 0;
      return { label: `${term} ${year}`, year, weight };
    })
    .filter(
      (v): v is { label: string; year: number; weight: number } => v !== null,
    );

  if (!parsed.length) return semesters[0] || null;

  parsed.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.weight - a.weight;
  });

  return parsed[0].label;
}
