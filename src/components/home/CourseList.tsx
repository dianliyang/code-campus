"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Course, EnrolledCoursesResponse } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import CourseCard from "./CourseCard";
import CourseListHeader from "./CourseListHeader";
import Pagination from "./Pagination";
import Toast from "../common/Toast";
import { Loader2 } from "lucide-react";
import { fetchCoursesAction } from "@/actions/courses";
import { useSearchParams } from "next/navigation";

interface CourseListProps {
  initialCourses: Course[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  initialEnrolledIds: number[];
  dict: Dictionary["dashboard"]["courses"];
}

export default function CourseList({
  initialCourses,
  totalItems,
  totalPages,
  currentPage,
  perPage,
  initialEnrolledIds,
  dict,
}: CourseListProps) {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [enrolledIds, setEnrolledIds] = useState<number[]>(initialEnrolledIds);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [page, setPage] = useState(currentPage);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem("courseViewMode");
    if (savedMode === "grid" || savedMode === "list") {
      setViewMode(savedMode);
    }
  }, []);

  useEffect(() => {
    setCourses(initialCourses);
    setPage(currentPage);
  }, [initialCourses, currentPage]);

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("courseViewMode", mode);
  };

  const fetchEnrolled = async () => {
    const res = await fetch("/api/user/courses");
    const data = (await res.json()) as EnrolledCoursesResponse;
    if (data.enrolledIds) setEnrolledIds(data.enrolledIds);
  };

  const handleHide = (courseId: number) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
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
        size: perPage,
        query,
        sort,
        enrolledOnly,
        universities,
        fields,
        levels,
      });

      if (nextData.items.length > 0) {
        setCourses((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newItems = nextData.items.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newItems];
        });
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("[CourseList] Failed to load more:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, totalPages, isLoading, searchParams, perPage]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const isMobile = window.innerWidth < 768;
        if (entries[0].isIntersecting && isMobile && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, isLoading]);

  return (
    <main className="flex-grow space-y-3 min-w-0">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <CourseListHeader
        viewMode={viewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
      />

      <div className={`bg-[#fcfcfc] rounded-lg overflow-hidden ${viewMode === "grid" ? "p-3" : ""}`}>
        <div className={`hidden md:flex items-center gap-4 px-4 py-2.5 bg-[#f3f3f3] text-[11px] font-semibold text-[#757575] select-none uppercase tracking-wide ${viewMode === "grid" ? "!hidden" : ""}`}>
          <div className="flex-1 min-w-0">Course</div>
          <div className="w-[12%]">Status</div>
          <div className="w-[10%]">Credit</div>
          <div className="w-[12%]">Semester</div>
          <div className="w-[10%]">Interest</div>
          <div className="w-[6%] text-right pr-1">Action</div>
        </div>

        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : ""}>
          {courses.map((course, idx) => (
            <CourseCard
              key={course.id}
              course={course}
              isInitialEnrolled={enrolledIds.includes(course.id)}
              onEnrollToggle={fetchEnrolled}
              onHide={handleHide}
              dict={dict}
              viewMode={viewMode}
              rowIndex={idx}
            />
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-sm font-semibold text-slate-900">{dict?.empty_header || "No matches found"}</h3>
            <p className="text-sm text-slate-500 mt-1">{dict?.empty_desc || "Try adjusting your current filters."}</p>
          </div>
        )}
      </div>

      <div ref={observerTarget} className="md:hidden py-4 flex justify-center">
        {isLoading && <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />}
        {!isLoading && page >= totalPages && courses.length > 0 && (
          <span className="text-xs text-slate-400">End of catalog</span>
        )}
      </div>

      <div className="hidden md:block sticky bottom-0 bg-[#fcfcfc]">
        <Pagination totalPages={totalPages} currentPage={currentPage} totalItems={totalItems} perPage={perPage} />
      </div>
    </main>
  );
}
