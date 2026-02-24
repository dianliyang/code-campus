"use client";

import { useState } from "react";
import Link from "next/link";
import { Course } from "@/types";
import UniversityIcon from "@/components/common/UniversityIcon";
import { deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, Loader2, Trash2, ArrowUpRight, Search, Sparkles } from "lucide-react";

interface CourseDetailHeaderProps {
  course: Course;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  projectSeminarRef?: { id: number; category: string } | null;
}

export default function CourseDetailHeader({
  course,
  isEditing = false,
  onToggleEdit,
  projectSeminarRef = null,
}: CourseDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAiUpdating, setIsAiUpdating] = useState(false);
  const [aiStatus, setAiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const searchQuery = `${course.university || ""} ${course.courseCode || ""}`.trim();
  const searchHref = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  const handleAiUpdate = async () => {
    setIsAiUpdating(true);
    setAiStatus('idle');
    try {
      const res = await fetch('/api/ai/course-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      if (res.ok) {
        setAiStatus('success');
        router.refresh();
      } else {
        setAiStatus('error');
      }
    } catch {
      setAiStatus('error');
    } finally {
      setIsAiUpdating(false);
      setTimeout(() => setAiStatus('idle'), 3000);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCourse(course.id);

      const refParams = searchParams.get("refParams");
      if (refParams) {
        router.push(`/courses?${decodeURIComponent(refParams)}`);
      } else {
        router.push("/courses");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete course");
      setIsDeleting(false);
    }
  };

  return (
    <header data-course-title-header className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-3 sm:p-4 space-y-3 sm:space-y-4 relative group">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-2">
        {/* AI Update — always visible */}
        <button
          onClick={handleAiUpdate}
          disabled={isAiUpdating}
          className={`h-8 w-8 rounded-md border bg-white inline-flex items-center justify-center transition-all disabled:opacity-50 ${
            aiStatus === 'success'
              ? 'border-emerald-300 text-emerald-600'
              : aiStatus === 'error'
                ? 'border-rose-300 text-rose-500'
                : 'border-[#d3d3d3] text-[#666] hover:bg-[#f8f8f8]'
          }`}
          title="AI Update — fetch latest course info from web"
          aria-label="AI Update"
        >
          {isAiUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        </button>

        {/* Hover-only actions */}
        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all">
        <a
          href={searchHref}
          target="_blank"
          rel="noopener noreferrer"
          className="h-8 w-8 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] inline-flex items-center justify-center"
          title="Search on Google"
          aria-label="Search on Google"
        >
          <Search className="w-3.5 h-3.5" />
        </a>
        <button
          onClick={() => onToggleEdit?.()}
          className="h-8 w-8 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] cursor-pointer"
          title={isEditing ? "Cancel Editing" : "Edit Course Details"}
        >
          <PenSquare className="w-3.5 h-3.5 mx-auto" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-8 w-8 rounded-md border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] cursor-pointer disabled:opacity-50"
          title="Delete Course"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
          ) : (
            <Trash2 className="w-3.5 h-3.5 mx-auto" />
          )}
        </button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 sm:gap-3 pr-20 sm:pr-0">
        <UniversityIcon
          name={course.university}
          size={56}
          className="flex-shrink-0 bg-white rounded-lg border border-[#e5e5e5]"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-[#555] bg-white px-2 py-0.5 rounded border border-[#e5e5e5]">
              {course.university}
            </span>
            {course.isInternal && (
              <span className="text-[11px] font-medium bg-[#efefef] text-[#333] px-2 py-0.5 rounded border border-[#e1e1e1]">
                Internal
              </span>
            )}
            <span className="text-[11px] text-[#999]">{course.courseCode}</span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] md:text-[32px] font-semibold text-[#1f1f1f] tracking-tight mt-1 leading-tight break-words">
            {course.title}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {projectSeminarRef ? (
          <Link
            href={`/projects-seminars/${projectSeminarRef.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium bg-white text-[#3e3e3e] px-2 py-0.5 rounded-full border border-[#dcdcdc] hover:bg-[#f7f7f7] transition-colors"
          >
            View {projectSeminarRef.category}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
        {course.fields.map((field) => (
          <span
            key={field}
            className="text-xs font-medium bg-white text-[#666] px-2 py-0.5 rounded-full border border-[#e5e5e5]"
          >
            {field}
          </span>
        ))}
      </div>
    </header>
  );
}
