"use client";

import { useState } from "react";
import { Course } from "@/types";
import UniversityIcon from "@/components/common/UniversityIcon";
import EditCourseModal from "./EditCourseModal";

interface CourseDetailHeaderProps {
  course: Course;
}

export default function CourseDetailHeader({ course }: CourseDetailHeaderProps) {
  const [showEditModal, setShowEditModal] = useState(false);

  return (
    <>
      <header className="space-y-6 relative group">
        <button
          onClick={() => setShowEditModal(true)}
          className="absolute top-0 right-0 p-2 rounded-lg bg-gray-50 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:text-brand-blue hover:bg-blue-50 cursor-pointer"
          title="Edit Course Details"
        >
          <i className="fa-solid fa-pen-to-square"></i>
        </button>

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
