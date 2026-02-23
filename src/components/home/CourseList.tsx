"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Course, EnrolledCoursesResponse } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import CourseCard from "./CourseCard";
import CourseListHeader from "./CourseListHeader";
import Pagination from "./Pagination";
import Toast from "../common/Toast";
import { Check, EyeOff, Loader2, Trash2, WandSparkles } from "lucide-react";
import { clearTopicsForCoursesAction, fetchCoursesAction, generateTopicsForCoursesAction, hideCoursesAction } from "@/actions/courses";
import { useRouter, useSearchParams } from "next/navigation";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [enrolledIds, setEnrolledIds] = useState<number[]>(initialEnrolledIds);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [page, setPage] = useState(currentPage);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [isClearingTopics, setIsClearingTopics] = useState(false);
  const [isHidingSelected, setIsHidingSelected] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  useEffect(() => {
    const savedMode = localStorage.getItem("courseViewMode");
    if (savedMode === "grid" || savedMode === "list") {
      setViewMode(savedMode);
    }
  }, []);

  useEffect(() => {
    setCourses(initialCourses);
    setPage(currentPage);
    setSelectedCourseIds([]);
  }, [initialCourses, currentPage]);

  const visibleCourseIds = courses.map((course) => course.id);
  const selectedVisibleCount = visibleCourseIds.filter((id) => selectedCourseIds.includes(id)).length;
  const allVisibleSelected = visibleCourseIds.length > 0 && selectedVisibleCount === visibleCourseIds.length;
  const hasPartialSelection = selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = hasPartialSelection;
  }, [hasPartialSelection]);

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
    setSelectedCourseIds((prev) => prev.filter((id) => id !== courseId));
    setToast({ message: "Course hidden successfully", type: "success" });
  };

  const handleHideSelected = async () => {
    if (selectedCourseIds.length < 1 || isHidingSelected) return;
    setIsHidingSelected(true);
    try {
      const result = await hideCoursesAction(selectedCourseIds);
      const hiddenSet = new Set(selectedCourseIds);
      setCourses((prev) => prev.filter((c) => !hiddenSet.has(c.id)));
      setSelectedCourseIds([]);
      setToast({
        type: "success",
        message: `Hidden ${result.hidden} course(s).`,
      });
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to hide selected courses.",
      });
    } finally {
      setIsHidingSelected(false);
    }
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCourseIds(visibleCourseIds);
      return;
    }
    setSelectedCourseIds([]);
  };

  const toggleSelectOne = (courseId: number, checked: boolean) => {
    setSelectedCourseIds((prev) => {
      if (checked) {
        return prev.includes(courseId) ? prev : [...prev, courseId];
      }
      return prev.filter((id) => id !== courseId);
    });
  };

  const handleGenerateTopicsForSelected = async () => {
    if (selectedCourseIds.length < 2 || isGeneratingTopics) return;
    setIsGeneratingTopics(true);
    try {
      const result = await generateTopicsForCoursesAction(selectedCourseIds);
      setToast({
        type: result.failed > 0 ? "error" : "success",
        message:
          result.failed > 0
            ? `Topics generated for ${result.updated} course(s), ${result.failed} failed.`
            : `Topics generated for ${result.updated} course(s).`,
      });
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to generate topics.",
      });
    } finally {
      setIsGeneratingTopics(false);
    }
  };

  const handleClearTopicsForSelected = async () => {
    if (selectedCourseIds.length < 1 || isClearingTopics) return;
    setIsClearingTopics(true);
    try {
      const result = await clearTopicsForCoursesAction(selectedCourseIds);
      setToast({
        type: "success",
        message: `Cleared topics for ${result.cleared} course(s).`,
      });
      router.refresh();
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to clear topics.",
      });
    } finally {
      setIsClearingTopics(false);
    }
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
          <div className="w-4">
            <label className="relative inline-flex h-4 w-4 cursor-pointer items-center justify-center">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) => toggleSelectAll(event.target.checked)}
                aria-label="Select all courses"
                className="peer sr-only"
              />
              <span className="h-4 w-4 rounded-[4px] border border-[#cfcfcf] bg-white transition-colors peer-checked:border-[#2f2f2f] peer-checked:bg-[#2f2f2f]" />
              {allVisibleSelected ? (
                <Check className="pointer-events-none absolute h-3 w-3 text-white" />
              ) : hasPartialSelection ? (
                <span className="pointer-events-none absolute h-0.5 w-2 rounded-full bg-[#2f2f2f]" />
              ) : null}
            </label>
          </div>
          <div className="flex-1 min-w-0">Course</div>
          <div className="w-[18%] flex items-center gap-1.5">
            <span>Topics</span>
            {selectedCourseIds.length >= 2 ? (
              <button
                type="button"
                onClick={handleGenerateTopicsForSelected}
                disabled={isGeneratingTopics}
                className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] disabled:opacity-50"
                title="Generate topics for selected courses"
                aria-label="Generate topics for selected courses"
              >
                {isGeneratingTopics ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <WandSparkles className="h-3 w-3" />
                )}
              </button>
            ) : null}
            {selectedCourseIds.length >= 1 ? (
              <button
                type="button"
                onClick={handleClearTopicsForSelected}
                disabled={isClearingTopics}
                className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#d3d3d3] bg-white text-[#666] hover:bg-[#f8f8f8] disabled:opacity-50"
                title="Clear topics for selected courses"
                aria-label="Clear topics for selected courses"
              >
                {isClearingTopics ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            ) : null}
          </div>
          <div className="w-[8%]">Credit</div>
          <div className="w-[10%]">Semester</div>
          <div className="w-[8%]">Interest</div>
          <div className="w-[5%] flex items-center justify-end gap-1 pr-1">
            {selectedCourseIds.length >= 1 ? (
              <button
                type="button"
                onClick={handleHideSelected}
                disabled={isHidingSelected}
                className="inline-flex h-4 w-4 items-center justify-center rounded text-[#666] hover:text-[#2f2f2f] disabled:opacity-50"
                title="Hide selected courses"
                aria-label="Hide selected courses"
              >
                {isHidingSelected ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <EyeOff className="h-2.5 w-2.5" />
                )}
              </button>
            ) : null}
            <span>Action</span>
          </div>
        </div>

        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : ""}>
          {courses.map((course, idx) => (
            <CourseCard
              key={course.id}
              course={course}
              isInitialEnrolled={enrolledIds.includes(course.id)}
              onEnrollToggle={fetchEnrolled}
              onHide={handleHide}
              viewMode={viewMode}
              rowIndex={idx}
              isSelected={selectedCourseIds.includes(course.id)}
              onSelectChange={toggleSelectOne}
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
