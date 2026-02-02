"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Course } from "@/types";
import UniversityIcon from "@/components/common/UniversityIcon";
import { deleteCourse } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, Loader2, Trash2 } from "lucide-react";

const EditCourseModal = dynamic(() => import("./EditCourseModal"), {
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-8 w-full max-w-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="space-y-4">
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
          <div className="h-10 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  ),
});

interface CourseDetailHeaderProps {
  course: Course;
}

export default function CourseDetailHeader({ course }: CourseDetailHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCourse(course.id);
      
      const refParams = searchParams.get('refParams');
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
    <>
      <header className="space-y-6 relative group">
        <div className="absolute top-0 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-brand-blue hover:bg-blue-50 cursor-pointer"
            title="Edit Course Details"
          >
            <PenSquare className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 rounded-lg bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-50"
            title="Delete Course"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <UniversityIcon 
            name={course.university} 
            size={64} 
            className="flex-shrink-0 bg-white rounded-xl p-1 shadow-sm border border-gray-100"
          />
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-brand-blue tracking-widest bg-brand-blue/5 px-2 py-1 rounded">
                {course.university}
              </span>
              {course.isInternal && (
                <span className="text-[10px] font-black bg-brand-blue text-white px-2 py-0.5 rounded uppercase tracking-widest">
                  Internal
                </span>
              )}
              <span className="text-xs font-mono font-bold text-gray-400">
                {course.courseCode}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter mt-2 leading-[0.9]">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {course.fields.map((field) => (
            <span
              key={field}
              className="text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-500 px-3 py-1.5 rounded-full border border-gray-100"
            >
              {field}
            </span>
          ))}
        </div>
      </header>

      {showEditModal && (
        <EditCourseModal 
          course={course} 
          onClose={() => setShowEditModal(false)} 
        />
      )}
    </>
  );
}
