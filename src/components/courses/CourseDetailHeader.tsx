"use client";

import { useState } from "react";
import { Course } from "@/types";
import UniversityIcon from "@/components/common/UniversityIcon";
import { deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, Loader2, Trash2 } from "lucide-react";

interface CourseDetailHeaderProps {
  course: Course;
  isEditing?: boolean;
  onToggleEdit?: () => void;
}

export default function CourseDetailHeader({
  course,
  isEditing = false,
  onToggleEdit,
}: CourseDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);

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
    <header className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4 space-y-4 relative group">
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
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

      <div className="flex items-center gap-3">
        <UniversityIcon
          name={course.university}
          size={56}
          className="flex-shrink-0 bg-white rounded-lg p-1 border border-[#e5e5e5]"
        />
        <div>
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
          <h1 className="text-[28px] md:text-[32px] font-semibold text-[#1f1f1f] tracking-tight mt-1 leading-tight">
            {course.title}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
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
