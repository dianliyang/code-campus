"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Course, EnrolledCoursesResponse } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import CourseCard from "./CourseCard";
import CourseListHeader from "./CourseListHeader";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Check, Loader2, UserPlus } from "lucide-react";
import {
  toggleCourseEnrollmentAction,
} from "@/actions/courses";
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
import { Badge } from "@/components/ui/badge";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(currentPage);
  const isLoadingRef = useRef(false);
  const lastRequestedCourseCountRef = useRef(0);
  const hasBootstrappedInitialLoadRef = useRef(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [actionLoadingIds, setActionLoadingIds] = useState<
    Record<number, boolean>
  >({});
  const [scrollTop, setScrollTop] = useState(0);
  const [containerSize, setContainerSize] = useState({ height: 0, width: 0, scrollHeight: 0 });

  const LIST_ROW_HEIGHT = 88;
  const GRID_CARD_HEIGHT = 260;
  const GRID_GAP = 12;
  const OVERSCAN_ROWS = 4;
  const LOAD_MORE_THRESHOLD_ITEMS = 8;

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
    lastRequestedCourseCountRef.current = 0;
    hasBootstrappedInitialLoadRef.current = false;
    setScrollTop(0);
    setContainerSize((prev) => ({ ...prev, scrollHeight: 0 }));
    setSelectedCourseIds([]);
  }, [initialCourses, currentPage]);

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);
  const visibleCourseIds = courses.map((course) => course.id);
  const selectedVisibleCount = visibleCourseIds.filter((id) =>
    selectedCourseIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleCourseIds.length > 0 &&
    selectedVisibleCount === visibleCourseIds.length;
  const hasPartialSelection = selectedVisibleCount > 0 && !allVisibleSelected;

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

  const effectiveViewMode: "list" | "grid" = isMobileViewport ? "grid" : viewMode;

  const updateContainerMetrics = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setContainerSize((prev) => {
      const next = {
        height: container.clientHeight,
        width: container.clientWidth,
        scrollHeight: container.scrollHeight,
      };
      return prev.height === next.height && prev.width === next.width && prev.scrollHeight === next.scrollHeight
        ? prev
        : next;
    });
  }, []);

  useEffect(() => {
    updateContainerMetrics();
    const handleResize = () => updateContainerMetrics();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateContainerMetrics]);

  useEffect(() => {
    updateContainerMetrics();
  }, [courses.length, effectiveViewMode, updateContainerMetrics]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const threshold = effectiveViewMode === "list"
      ? LIST_ROW_HEIGHT * 2
      : (GRID_CARD_HEIGHT + GRID_GAP) * 2;
    const isNearTail = target.scrollTop + target.clientHeight >= target.scrollHeight - threshold;

    setScrollTop(target.scrollTop);
    setContainerSize((prev) => {
      const next = {
        height: target.clientHeight,
        width: target.clientWidth,
        scrollHeight: target.scrollHeight,
      };
      return prev.height === next.height && prev.width === next.width && prev.scrollHeight === next.scrollHeight
        ? prev
        : next;
    });
    if (!isNearTail) return;
    if (isLoadingRef.current || pageRef.current >= totalPages) return;
    if (lastRequestedCourseCountRef.current === courses.length) return;
    lastRequestedCourseCountRef.current = courses.length;
    void loadMore();
  }, [courses.length, effectiveViewMode, loadMore, totalPages]);

  const gridColumnCount = effectiveViewMode === "grid"
    ? containerSize.width >= 1280
      ? 3
      : containerSize.width >= 768
        ? 2
        : 1
    : 1;

  const virtualListRowCount = courses.length;
  const visibleListRows = containerSize.height > 0
    ? Math.ceil(containerSize.height / LIST_ROW_HEIGHT) + OVERSCAN_ROWS * 2
    : virtualListRowCount;
  const virtualListStart = Math.max(0, Math.floor(scrollTop / LIST_ROW_HEIGHT) - OVERSCAN_ROWS);
  const virtualListEnd = Math.min(virtualListRowCount, virtualListStart + visibleListRows);
  const visibleListCourses = courses.slice(virtualListStart, virtualListEnd);
  const listTopSpacerHeight = virtualListStart * LIST_ROW_HEIGHT;
  const listBottomSpacerHeight = Math.max(0, (virtualListRowCount - virtualListEnd) * LIST_ROW_HEIGHT);

  const virtualGridRowCount = Math.ceil(courses.length / gridColumnCount);
  const gridRowHeight = GRID_CARD_HEIGHT + GRID_GAP;
  const visibleGridRows = containerSize.height > 0
    ? Math.ceil(containerSize.height / gridRowHeight) + OVERSCAN_ROWS * 2
    : virtualGridRowCount;
  const virtualGridStartRow = Math.max(0, Math.floor(scrollTop / gridRowHeight) - OVERSCAN_ROWS);
  const virtualGridEndRow = Math.min(virtualGridRowCount, virtualGridStartRow + visibleGridRows);
  const visibleGridCourses = courses.slice(virtualGridStartRow * gridColumnCount, virtualGridEndRow * gridColumnCount);
  const gridTopSpacerHeight = virtualGridStartRow * gridRowHeight;
  const gridBottomSpacerHeight = Math.max(0, (virtualGridRowCount - virtualGridEndRow) * gridRowHeight);

  const visibleTailIndex = effectiveViewMode === "list"
    ? virtualListEnd
    : virtualGridEndRow * gridColumnCount;
  const loadMoreThresholdPx = effectiveViewMode === "list"
    ? LIST_ROW_HEIGHT * 2
    : gridRowHeight * 2;
  const hasMeasuredScrollContainer = containerSize.height > 0 && containerSize.scrollHeight > 0;
  const isScrollable = hasMeasuredScrollContainer && containerSize.scrollHeight > containerSize.height + 1;
  const isNearActualTail = hasMeasuredScrollContainer &&
    scrollTop + containerSize.height >= containerSize.scrollHeight - loadMoreThresholdPx;

  useEffect(() => {
    if (isLoadingRef.current || pageRef.current >= totalPages) return;
    if (courses.length === 0) return;

    const isNearVirtualTail = visibleTailIndex >= courses.length - LOAD_MORE_THRESHOLD_ITEMS;
    if (!isNearActualTail && !isNearVirtualTail) return;

    const hasScrolled = scrollTop > 0;
    if (!hasScrolled) {
      if (isScrollable) return;
      if (hasBootstrappedInitialLoadRef.current) return;
      hasBootstrappedInitialLoadRef.current = true;
    }

    if (lastRequestedCourseCountRef.current === courses.length) return;
    lastRequestedCourseCountRef.current = courses.length;
    void loadMore();
  }, [courses.length, isNearActualTail, isScrollable, loadMore, scrollTop, totalPages, visibleTailIndex]);

  const refParams = searchParams.toString();

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCourseIds(visibleCourseIds);
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

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col gap-3">
      <CourseListHeader
        viewMode={effectiveViewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
        filterUniversities={filterUniversities}
        filterSemesters={filterSemesters}
      />

      {effectiveViewMode === "list" ? (
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto"
          onScroll={handleScroll}
          data-testid="course-scroll-container"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
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
                </TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Subdomain</TableHead>
                <TableHead>Credit</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-2">
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
                        aria-label="Enroll selected courses"
                      >
                        {isBulkEnrolling ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                      </Button>
                    ) : null}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listTopSpacerHeight > 0 ? (
                <TableRow aria-hidden="true">
                  <TableCell colSpan={6} style={{ height: listTopSpacerHeight, padding: 0 }} />
                </TableRow>
              ) : null}
              {visibleListCourses.map((course) => {
                const latestSemester = getLatestSemesterLabel(
                  course.semesters || [],
                );
                const detailHref = `/courses/${course.id}${refParams ? `?refParams=${encodeURIComponent(refParams)}` : ""}`;
                const isEnrolled = enrolledIds.includes(course.id);
                const isRowLoading = Boolean(actionLoadingIds[course.id]);
                const primaryField = course.subdomain || course.fields?.[0];

                return (
                  <TableRow key={course.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedCourseIds.includes(course.id)}
                        onCheckedChange={(checked) =>
                          toggleSelectOne(course.id, checked === true)
                        }
                        aria-label={`Select ${course.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={detailHref} prefetch={false} className="block">
                        <div className="min-w-0 flex items-start gap-3">
                          <UniversityIcon
                            name={course.university}
                            size={26}
                            className="bg-white border border-[#dfdfdf]"
                          />
                          <div className="min-w-0">
                            <h2 className="text-[14px] md:text-[15px] font-medium text-[#2e2e2e] line-clamp-2 md:truncate hover:text-black transition-colors">
                              {course.title}
                            </h2>
                            <p className="text-xs text-[#7a7a7a] truncate">
                              {course.courseCode} · {course.university}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:hidden">
                              {latestSemester ? (
                                <Badge>{latestSemester}</Badge>
                              ) : null}
                              {course.credit != null ? (
                                <Badge>{course.credit} cr</Badge>
                              ) : null}
                              {primaryField ? (
                                <Badge>{primaryField}</Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{course.subdomain || "-"}</TableCell>
                    <TableCell>{course.credit ?? "-"}</TableCell>
                    <TableCell>{latestSemester ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-7"
                        type="button"
                        disabled={isRowLoading || isEnrolled}
                        onClick={() => void runRowEnrollAction(course.id)}
                        title={isEnrolled ? "Enrolled" : "Enroll"}
                        aria-label={isEnrolled ? "Enrolled" : "Enroll"}
                      >
                        {isRowLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : isEnrolled ? (
                          <Check className="size-3.5" />
                        ) : (
                          <UserPlus className="size-3.5" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {listBottomSpacerHeight > 0 ? (
                <TableRow aria-hidden="true">
                  <TableCell colSpan={6} style={{ height: listBottomSpacerHeight, padding: 0 }} />
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <div className="py-4 flex justify-center">
            {isLoading && (
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            )}
            {!isLoading && page >= totalPages && courses.length > 0 && (
              <span className="text-xs text-slate-400">End of catalog</span>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="min-h-0 flex-1 overflow-y-auto py-3"
          onScroll={handleScroll}
          data-testid="course-scroll-container"
        >
          <div
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
            style={{ paddingTop: gridTopSpacerHeight, paddingBottom: gridBottomSpacerHeight }}
          >
            {visibleGridCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                isInitialEnrolled={enrolledIds.includes(course.id)}
                onEnrollToggle={fetchEnrolled}
                onHide={handleHide}
                viewMode="grid"
              />
            ))}
          </div>
          <div className="py-4 flex justify-center">
            {isLoading && (
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            )}
            {!isLoading && page >= totalPages && courses.length > 0 && (
              <span className="text-xs text-slate-400">End of catalog</span>
            )}
          </div>
        </div>
      )}

      {courses.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-sm font-semibold text-slate-900">
            {dict?.empty_header || "No matches found"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
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
