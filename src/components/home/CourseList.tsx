"use client";

import { useState, useEffect } from "react";
import { Course } from "@/types";
import CourseCard from "./CourseCard";
import CourseListHeader from "./CourseListHeader";
import Pagination from "./Pagination";

interface CourseListProps {
  initialCourses: Course[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  initialEnrolledIds: number[];
  dict?: any;
}

export default function CourseList({ 
  initialCourses, 
  totalItems, 
  totalPages, 
  currentPage,
  initialEnrolledIds,
  dict
}: CourseListProps) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [enrolledIds, setEnrolledIds] = useState<number[]>(initialEnrolledIds);

  // Load view mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("viewMode") as "list" | "grid";
    if (savedMode) setViewMode(savedMode); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  // Save view mode to localStorage whenever it changes
  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("viewMode", mode);
  };

  const fetchEnrolled = async () => {
    const res = await fetch("/api/user/courses");
    const data = await res.json();
    if (data.enrolledIds) setEnrolledIds(data.enrolledIds);
  };

  return (
    <main className="flex-grow space-y-4">
      <CourseListHeader 
        totalItems={totalItems} 
        viewMode={viewMode} 
        setViewMode={handleViewModeChange} 
        dict={dict}
      />

      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
        {initialCourses?.map((course) => (
          <CourseCard 
            key={course.id} 
            course={course} 
            isInitialEnrolled={enrolledIds.includes(course.id)} 
            onEnrollToggle={fetchEnrolled}
            dict={dict}
          />
        ))}
        {initialCourses?.length === 0 && (
          <div className="text-center py-32 bg-white rounded-2xl border border-gray-100 relative overflow-hidden group">
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none transition-transform duration-1000 group-hover:scale-110">
              <span className="text-[12rem] font-black uppercase tracking-tighter">
                {dict?.empty_title || "NULL"}
              </span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center mb-6 bg-gray-50/50">
                <i className="fa-solid fa-radar fa-spin-slow text-gray-300 text-sm"></i>
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.4em] mb-2">
                {dict?.empty_header || "Zero Matches Found"}
              </h3>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest max-w-[280px] leading-relaxed">
                {dict?.empty_desc || "Adjust your frequency filters or expand the topic spectrum to initialize new results."}
              </p>
              <div className="mt-8 h-px w-12 bg-gray-100"></div>
            </div>
          </div>
        )}
      </div>

      <Pagination totalPages={totalPages} currentPage={currentPage} />
    </main>
  );
}
