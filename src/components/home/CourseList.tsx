"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Course, EnrolledCoursesResponse } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import CourseCard from "./CourseCard";
import CourseListHeader from "./CourseListHeader";
import Pagination from "./Pagination";
import Toast from "../common/Toast";
import { Radio, Loader2 } from "lucide-react";
import { fetchCoursesAction } from "@/actions/courses";
import { useSearchParams } from "next/navigation";
import VirtualCard from "../common/VirtualCard";

interface CourseListProps {
  initialCourses: Course[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  initialEnrolledIds: number[];
  dict: Dictionary['dashboard']['courses'];
}

export default function CourseList({
  initialCourses,
  totalItems,
  totalPages,
  currentPage,
  initialEnrolledIds,
  dict
}: CourseListProps) {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [enrolledIds, setEnrolledIds] = useState<number[]>(initialEnrolledIds);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [page, setPage] = useState(currentPage);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load view mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("viewMode") as "list" | "grid";
    if (savedMode) setViewMode(savedMode);
  }, []);

  // Sync courses when initialCourses changes (e.g., page change, filter change via URL)
  useEffect(() => {
    setCourses(initialCourses);
    setPage(currentPage);
  }, [initialCourses, currentPage]);

  // Save view mode to localStorage whenever it changes
  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("viewMode", mode);
  };

  const fetchEnrolled = async () => {
    const res = await fetch("/api/user/courses");
    const data = await res.json() as EnrolledCoursesResponse;
    if (data.enrolledIds) setEnrolledIds(data.enrolledIds);
  };

  const handleHide = (courseId: number) => {
    setCourses(prev => prev.filter(c => c.id !== courseId));
    setToast({ message: "Course hidden successfully", type: "success" });
  };

  const loadMore = useCallback(async () => {
    if (isLoading || page >= totalPages) return;

    setIsLoading(true);
    try {
      const query = searchParams.get("q") || "";
      const sort = searchParams.get("sort") || "title";
      const enrolledOnly = searchParams.get("enrolled") === "true";
      const universities = searchParams.get("universities")?.split(",").filter(Boolean) || [];
      const fields = searchParams.get("fields")?.split(",").filter(Boolean) || [];
      const levels = searchParams.get("levels")?.split(",").filter(Boolean) || [];

      const nextData = await fetchCoursesAction({
        page: page + 1,
        query,
        sort,
        enrolledOnly,
        universities,
        fields,
        levels
      });

      if (nextData.items.length > 0) {
        setCourses(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const newItems = nextData.items.filter(c => !existingIds.has(c.id));
          return [...prev, ...newItems];
        });
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error("[CourseList] Failed to load more:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, totalPages, isLoading, searchParams]);

  // Intersection Observer for Infinite Scroll (Mobile Only)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const isMobile = window.innerWidth < 768;
        if (entries[0].isIntersecting && isMobile && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, isLoading]);

  return (
    <main className="flex-grow space-y-4 min-w-0">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <CourseListHeader
        totalItems={totalItems}
        viewMode={viewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
      />

      <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "bg-white border border-gray-200 rounded-xl overflow-hidden"}>
        {viewMode === "list" && courses && courses.length > 0 && (
          <div className="hidden md:flex items-center gap-4 px-4 py-2 bg-gray-50/50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 select-none">
             <div className="w-[40px] flex-shrink-0 text-center"></div>
             <div className="flex-grow min-w-0">Course</div>
             <div className="w-[18%] flex-shrink-0">Tags</div>
             <div className="w-[12%] flex-shrink-0">Info</div>
             <div className="w-20 flex-shrink-0 text-right pr-2">Action</div>
          </div>
        )}
        {courses?.map((course) => (
          <VirtualCard key={`${course.id}-${viewMode}`} id={course.id} initialHeight={viewMode === 'list' ? "60px" : "200px"}>
            <CourseCard
              course={course}
              isInitialEnrolled={enrolledIds.includes(course.id)}
              onEnrollToggle={fetchEnrolled}
              onHide={handleHide}
              dict={dict}
              viewMode={viewMode}
            />
          </VirtualCard>
        ))}
        {courses?.length === 0 && (
          <div className="text-center py-32 bg-white rounded-2xl border border-gray-100 relative overflow-hidden group">
            {/* Background Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none transition-transform duration-1000 group-hover:scale-110">
              <span className="text-[12rem] font-black uppercase tracking-tighter">
                {dict?.empty_title || "NULL"}
              </span>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center mb-6 bg-gray-50/50">
                <Radio className="w-4 h-4 text-gray-300 animate-spin" style={{ animationDuration: '3s' }} />
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

      {/* Infinite Scroll Loader / Target */}
      <div ref={observerTarget} className="md:hidden py-10 flex justify-center">
        {isLoading && <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />}
        {!isLoading && page >= totalPages && courses.length > 0 && (
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">End of catalog</span>
        )}
      </div>

      <div className="hidden md:block">
        <Pagination totalPages={totalPages} currentPage={currentPage} />
      </div>
    </main>
  );
}
