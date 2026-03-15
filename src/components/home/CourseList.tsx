"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Course, EnrolledCoursesResponse } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { cn } from "@/lib/utils";
import CourseCard from "./CourseCard";
import CourseListHeader from "./CourseListHeader";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Check, Loader2, UserPlus } from "lucide-react";
import { toggleCourseEnrollmentAction } from "@/actions/courses";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UniversityIcon from "@/components/common/UniversityIcon";
import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";

interface CourseListProps {
  initialCourses: Course[];
  totalPages: number;
  currentPage: number;
  perPage: number;
  initialEnrolledIds: number[];
  dict: Dictionary["dashboard"]["courses"];
  filterUniversities: string[];
  filterSemesters: string[];
}

export default function CourseList({
  initialCourses,
  totalPages,
  currentPage,
  perPage,
  initialEnrolledIds,
  dict,
  filterUniversities,
  filterSemesters,
}: CourseListProps) {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [enrolledIds, setEnrolledIds] = useState<number[]>(initialEnrolledIds);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [page, setPage] = useState(currentPage);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkEnrolling, setIsBulkEnrolling] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const { showToast } = useAppToast();
  
  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const pageRef = useRef(currentPage);
  const isLoadingRef = useRef(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [actionLoadingIds, setActionLoadingIds] = useState<Record<number, boolean>>({});

  const LIST_ROW_HEIGHT = 64;
  const GRID_CARD_HEIGHT = 200;
  const GRID_GAP = 16;

  useEffect(() => {
    const savedMode = localStorage.getItem("courseViewMode");
    if (savedMode === "grid" || savedMode === "list") {
      setViewMode(savedMode);
    }
  }, []);

  useEffect(() => {
    setCourses(initialCourses);
    setPage(currentPage);
    pageRef.current = currentPage;
    isLoadingRef.current = false;
    setSelectedCourseIds([]);
  }, [initialCourses, currentPage]);

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const effectiveViewMode: "list" | "grid" = isMobileViewport ? "grid" : viewMode;

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
    showToast({ message: "Course hidden successfully", type: "success" });
  };

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || pageRef.current >= totalPages) return;

    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const query = searchParams.get("q") || "";
      const sort = searchParams.get("sort") || "title";
      const enrolledOnly = searchParams.get("enrolled") === "true";
      const universities = searchParams.get("universities") || "";
      const levels = searchParams.get("levels") || "";
      const semesters = searchParams.get("semesters") || "";

      const params = new URLSearchParams({
        page: String(pageRef.current + 1),
        size: String(perPage),
        q: query,
        sort: sort,
        enrolled: String(enrolledOnly),
        universities,
        levels,
        semesters,
      });

      const response = await fetch(`/api/courses?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch more courses");
      const nextData = await response.json();

      if (nextData.items && nextData.items.length > 0) {
        setCourses((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newItems = (nextData.items as Course[]).filter(
            (c) => !existingIds.has(c.id),
          );
          return [...prev, ...newItems];
        });
        pageRef.current += 1;
        setPage(pageRef.current);
      }
    } catch (error) {
      console.error("[CourseList] Failed to load more:", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [totalPages, searchParams, perPage]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "400px" }
    );

    const currentLoadMore = loadMoreRef.current;
    if (currentLoadMore) {
      observer.observe(currentLoadMore);
    }

    return () => {
      if (currentLoadMore) {
        observer.unobserve(currentLoadMore);
      }
    };
  }, [loadMore]);

  // Virtualization
  const gridColumnCount = useMemo(() => {
    if (effectiveViewMode !== "grid") return 1;
    if (typeof window === "undefined") return 3;
    if (window.innerWidth >= 1280) return 3;
    if (window.innerWidth >= 768) return 2;
    return 1;
  }, [effectiveViewMode]);

  const rowCount = effectiveViewMode === "list" 
    ? courses.length 
    : Math.ceil(courses.length / gridColumnCount);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (effectiveViewMode === "list" ? LIST_ROW_HEIGHT : GRID_CARD_HEIGHT + GRID_GAP),
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCourseIds(courses.map(c => c.id));
      return;
    }
    setSelectedCourseIds([]);
  };

  const toggleSelectOne = (courseId: number, checked: boolean) => {
    setSelectedCourseIds((prev) => {
      if (checked) return prev.includes(courseId) ? prev : [...prev, courseId];
      return prev.filter((id) => id !== courseId);
    });
  };

  const runRowEnrollAction = async (courseId: number) => {
    if (actionLoadingIds[courseId]) return;
    if (enrolledIds.includes(courseId)) return;
    setActionLoadingIds((prev) => ({ ...prev, [courseId]: true }));
    try {
      await toggleCourseEnrollmentAction(courseId, false);
      await fetchEnrolled();
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Action failed",
      });
    } finally {
      setActionLoadingIds((prev) => {
        const next = { ...prev };
        delete next[courseId];
        return next;
      });
    }
  };

  const handleBulkEnroll = async () => {
    if (selectedCourseIds.length < 2 || isBulkEnrolling) return;
    const idsToEnroll = selectedCourseIds.filter((id) => !enrolledIds.includes(id));
    if (idsToEnroll.length === 0) return;
    setIsBulkEnrolling(true);
    try {
      await Promise.all(idsToEnroll.map((id) => toggleCourseEnrollmentAction(id, false)));
      await fetchEnrolled();
      showToast({
        type: "success",
        message: `Enrolled ${idsToEnroll.length} course(s).`,
      });
    } catch (error) {
      showToast({
        type: "error",
        message: error instanceof Error ? error.message : "Bulk enroll failed.",
      });
    } finally {
      setIsBulkEnrolling(false);
    }
  };

  const visibleCourseIds = courses.map((course) => course.id);
  const selectedVisibleCount = visibleCourseIds.filter((id) =>
    selectedCourseIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleCourseIds.length > 0 &&
    selectedVisibleCount === visibleCourseIds.length;
  const hasPartialSelection = selectedVisibleCount > 0 && !allVisibleSelected;
  const refParams = searchParams.toString();

  // Column layout for list view
  const COLUMNS = [
    { key: "select", width: "w-[48px]", shrink: 0 },
    { key: "course", width: "flex-1 min-w-0" },
    { key: "subdomain", width: "w-[180px]", shrink: 0, className: "hidden lg:table-cell" },
    { key: "credit", width: "w-[80px]", shrink: 0, className: "hidden sm:table-cell" },
    { key: "semester", width: "w-[120px]", shrink: 0, className: "hidden md:table-cell" },
    { key: "actions", width: "w-[100px]", shrink: 0 },
  ];

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col gap-0">
      <CourseListHeader
        viewMode={effectiveViewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
        filterUniversities={filterUniversities}
        filterSemesters={filterSemesters}
      />

      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto"
        data-testid="course-scroll-container"
      >
        {effectiveViewMode === "list" ? (
          <div className="min-w-full inline-block align-middle">
            <div className="">
              <Table>
                <TableHeader>
                  <TableRow className="flex h-12 items-center border-b hover:bg-transparent">
                    <TableHead className={`${COLUMNS[0].width} py-0 text-center align-middle`}>
                      <div className="flex h-10 items-center justify-center">
                        <Checkbox
                          checked={
                            allVisibleSelected ||
                            (hasPartialSelection ? "indeterminate" : false)
                          }
                          onCheckedChange={(checked) =>
                            toggleSelectAll(checked === true)
                          }
                          aria-label="Select all courses"
                        />
                      </div>
                    </TableHead>
                    <TableHead className={cn(COLUMNS[1].width, "py-0 align-middle")}>
                      <div className="flex h-10 items-center">Course</div>
                    </TableHead>
                    <TableHead className={cn(COLUMNS[2].width, COLUMNS[2].className, "py-0 align-middle")}>
                      <div className="flex h-10 items-center whitespace-nowrap">Subdomain</div>
                    </TableHead>
                    <TableHead className={cn(COLUMNS[3].width, COLUMNS[3].className, "py-0 align-middle")}>
                      <div className="flex h-10 items-center whitespace-nowrap">Credit</div>
                    </TableHead>
                    <TableHead className={cn(COLUMNS[4].width, COLUMNS[4].className, "py-0 align-middle")}>
                      <div className="flex h-10 items-center whitespace-nowrap">Semester</div>
                    </TableHead>
                    <TableHead className={cn(COLUMNS[5].width, "py-0 pr-4 text-right align-middle")}>
                      <div className="flex h-10 items-center justify-end gap-2">
                        <span>Actions</span>
                        {selectedCourseIds.length >= 2 ? (
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7"
                            type="button"
                            onClick={handleBulkEnroll}
                            disabled={
                              isBulkEnrolling ||
                              selectedCourseIds.every((id) => enrolledIds.includes(id))
                            }
                            title="Enroll selected courses"
                          >
                            {isBulkEnrolling ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                          </Button>
                        ) : null}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                  {virtualItems.map((virtualRow) => {
                    const course = courses[virtualRow.index];
                    if (!course) return null;
                    
                    const latestSemester = getLatestSemesterLabel(course.semesters || []);
                    const detailHref = `/courses/${course.id}${refParams ? `?refParams=${encodeURIComponent(refParams)}` : ""}`;
                    const isEnrolled = enrolledIds.includes(course.id);
                    const isRowLoading = Boolean(actionLoadingIds[course.id]);

                    return (
                      <TableRow
                        key={course.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="flex items-center hover:bg-muted/50"
                      >
                        <TableCell className={`${COLUMNS[0].width} py-0 align-middle`}>
                          <div className="flex h-10 items-center justify-center">
                            <Checkbox
                              checked={selectedCourseIds.includes(course.id)}
                              onCheckedChange={(checked) =>
                                toggleSelectOne(course.id, checked === true)
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell className={cn(COLUMNS[1].width, "py-0 align-middle")}>
                          <div className="flex h-10 items-center">
                            <Link href={detailHref} prefetch={false} className="block group w-full">
                            <div className="min-w-0 flex items-start gap-3">
                              <UniversityIcon
                                name={course.university}
                                size={26}
                                className="bg-white border border-[#dfdfdf] shrink-0"
                              />
                              <div className="min-w-0 overflow-hidden">
                                <h2 className="text-[14px] md:text-[15px] font-medium text-[#2e2e2e] truncate group-hover:text-black transition-colors">
                                  {course.title}
                                </h2>
                                <p className="text-xs text-[#7a7a7a] truncate">
                                  {course.courseCode} · {course.university}
                                </p>
                              </div>
                            </div>
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className={cn(COLUMNS[2].width, COLUMNS[2].className, "py-0 align-middle")}>
                          <div className="flex h-10 items-center">
                            <span className="block truncate whitespace-nowrap text-[13px] text-[#444]">
                              {course.subdomain || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(COLUMNS[3].width, COLUMNS[3].className, "py-0 align-middle")}>
                          <div className="flex h-10 items-center">
                            <span className="whitespace-nowrap text-sm text-[#484848]">{course.credit ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(COLUMNS[4].width, COLUMNS[4].className, "py-0 align-middle")}>
                          <div className="flex h-10 items-center">
                            <span className="whitespace-nowrap text-sm text-[#484848]">{latestSemester ?? "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className={cn(COLUMNS[5].width, "py-0 pr-4 text-right align-middle")}>
                          <div className="flex h-10 items-center justify-end">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-7"
                              disabled={isRowLoading || isEnrolled}
                              onClick={() => void runRowEnrollAction(course.id)}
                            >
                              {isRowLoading ? <Loader2 className="size-3.5 animate-spin" /> : isEnrolled ? <Check className="size-3.5" /> : <UserPlus className="size-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div
            className="relative"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const rowStart = virtualRow.index * gridColumnCount;
              const rowCourses = courses.slice(rowStart, rowStart + gridColumnCount);

              return (
                <div
                  key={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${GRID_CARD_HEIGHT}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${gridColumnCount}, minmax(0, 1fr))`,
                    gap: `${GRID_GAP}px`,
                  }}
                  className="px-0.5" // Slight padding to avoid focus ring cut-offs
                >
                  {rowCourses.map((course) => (
                  <div
                    key={course.id}
                    className="h-full transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg rounded-xl"
                  >
                    <CourseCard
                      course={course}
                      isInitialEnrolled={enrolledIds.includes(course.id)}
                      onEnrollToggle={fetchEnrolled}
                      onHide={handleHide}
                      viewMode="grid"
                    />
                  </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* Sentinel for infinite scroll */}
        <div ref={loadMoreRef} className="h-20 w-full" aria-hidden="true" />
        
        <div className="py-8 flex justify-center">
          {isLoading && <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />}
          {!isLoading && page >= totalPages && courses.length > 0 && (
            <div className="flex w-full max-w-md items-center gap-3 px-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-300" />
              <span className="shrink-0 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                End of catalog
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-300 via-slate-200 to-transparent" />
            </div>
          )}
        </div>
      </div>

      {courses.length === 0 && !isLoading && (
        <div className="text-center py-20 bg-slate-50/50 rounded-lg border-2 border-dashed border-slate-200 mx-4">
          <h3 className="text-base font-semibold text-slate-900">
            {dict?.empty_header || "No matches found"}
          </h3>
          <p className="text-sm text-slate-500 mt-2">
            {dict?.empty_desc || "Try adjusting your current filters."}
          </p>
        </div>
      )}
    </main>
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
