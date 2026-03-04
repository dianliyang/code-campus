"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Course, EnrolledCoursesResponse } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import CourseCard from "./CourseCard";
import CourseListHeader from "./CourseListHeader";
import { useAppToast } from "@/components/common/AppToastProvider";
import {
  EyeOff,
  Loader2,
  MoreHorizontalIcon,
  Trash2,
  WandSparkles,
} from "lucide-react";
import {
  clearTopicsForCoursesAction,
  generateTopicsForCoursesAction,
  hideCoursesAction,
  hideCourseAction,
  toggleCourseEnrollmentAction,
} from "@/actions/courses";
import { useSearchParams } from "next/navigation";
import { trackAiUsage } from "@/lib/ai/usage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface CourseListProps {
  initialCourses: Course[];
  totalItems: number;
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
  totalItems,
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
  const [isGeneratingTopics, setIsGeneratingTopics] = useState(false);
  const [isClearingTopics, setIsClearingTopics] = useState(false);
  const [isHidingSelected, setIsHidingSelected] = useState(false);
  const { showToast } = useAppToast();
  const observerTarget = useRef<HTMLDivElement>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [actionLoadingIds, setActionLoadingIds] = useState<
    Record<number, boolean>
  >({});

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

  const handleHideSelected = async () => {
    if (selectedCourseIds.length < 1 || isHidingSelected) return;
    setIsHidingSelected(true);
    try {
      const result = await hideCoursesAction(selectedCourseIds);
      const hiddenSet = new Set(selectedCourseIds);
      setCourses((prev) => prev.filter((c) => !hiddenSet.has(c.id)));
      setSelectedCourseIds([]);
      showToast({
        type: "success",
        message: `Hidden ${result.hidden} course(s).`,
      });
      // router.refresh();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to hide selected courses.",
      });
    } finally {
      setIsHidingSelected(false);
    }
  };

  const handleGenerateTopicsForSelected = async () => {
    if (selectedCourseIds.length < 2 || isGeneratingTopics) return;
    setIsGeneratingTopics(true);
    try {
      const result = await generateTopicsForCoursesAction(selectedCourseIds);
      showToast({
        type: result.failed > 0 ? "error" : "success",
        message:
          result.failed > 0
            ? `Topics generated for ${result.updated} course(s), ${result.failed} failed.`
            : `Topics generated for ${result.updated} course(s).`,
      });
      if (result.updated > 0) {
        trackAiUsage({ calls: result.updated, tokens: result.updated * 220 });
      }
      // router.refresh();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to generate topics.",
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
      showToast({
        type: "success",
        message: `Cleared topics for ${result.cleared} course(s).`,
      });
      // router.refresh();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to clear topics.",
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
      const universities = searchParams.get("universities") || "";
      const levels = searchParams.get("levels") || "";

      const params = new URLSearchParams({
        page: String(page + 1),
        size: String(perPage),
        q: query,
        sort: sort,
        enrolled: String(enrolledOnly),
        universities,
        levels,
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
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("[CourseList] Failed to load more:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, totalPages, isLoading, searchParams, perPage]);

  useEffect(() => {
    if (page >= totalPages) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isMobile = window.innerWidth < 768;
        if (entries[0].isIntersecting && isMobile && !isLoading) {
          loadMore();
        }
      },
      { threshold: 0, rootMargin: "0px 0px 320px 0px" },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, isLoading, page, totalPages]);

  const effectiveViewMode: "list" | "grid" = viewMode;
  const refParams = searchParams.toString();
  const createPageHref = (nextPage: number) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(nextPage));
    return `/courses?${next.toString()}`;
  };
  const pageNumbers = Array.from(
    new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]),
  )
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

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

  const runRowAction = async (
    courseId: number,
    action: "toggle-enroll" | "hide",
  ) => {
    if (actionLoadingIds[courseId]) return;
    setActionLoadingIds((prev) => ({ ...prev, [courseId]: true }));
    const isEnrolled = enrolledIds.includes(courseId);
    try {
      if (action === "toggle-enroll") {
        await toggleCourseEnrollmentAction(courseId, isEnrolled);
        await fetchEnrolled();
      } else {
        await hideCourseAction(courseId);
        handleHide(courseId);
      }
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex items-center justify-end gap-1.5 p-2 border-b border-[#e5e5e5]">
            {selectedCourseIds.length >= 2 ? (
              <Button
                variant="outline"
                type="button"
                onClick={handleGenerateTopicsForSelected}
                disabled={isGeneratingTopics}
                title="Generate subdomains for selected courses"
                aria-label="Generate subdomains for selected courses"
              >
                {isGeneratingTopics ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <WandSparkles />
                )}
              </Button>
            ) : null}
            {selectedCourseIds.length >= 1 ? (
              <Button
                variant="outline"
                type="button"
                onClick={handleClearTopicsForSelected}
                disabled={isClearingTopics}
                title="Clear subdomains for selected courses"
                aria-label="Clear subdomains for selected courses"
              >
                {isClearingTopics ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
              </Button>
            ) : null}
            {selectedCourseIds.length >= 1 ? (
              <Button
                variant="outline"
                type="button"
                onClick={handleHideSelected}
                disabled={isHidingSelected}
                title="Hide selected courses"
                aria-label="Hide selected courses"
              >
                {isHidingSelected ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <EyeOff />
                )}
              </Button>
            ) : null}
          </div>
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => {
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
                      <div className="min-w-0 flex items-start gap-3">
                        <UniversityIcon
                          name={course.university}
                          size={26}
                          className="bg-white border border-[#dfdfdf]"
                        />
                        <div className="min-w-0">
                          <Link
                            href={detailHref}
                            prefetch={false}
                            className="block"
                          >
                            <h2 className="text-[14px] md:text-[15px] font-medium text-[#2e2e2e] line-clamp-2 md:truncate hover:text-black transition-colors">
                              {course.title}
                            </h2>
                            <p className="text-xs text-[#7a7a7a] truncate">
                              {course.courseCode} · {course.university}
                            </p>
                          </Link>
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
                    </TableCell>
                    <TableCell>{course.subdomain || "-"}</TableCell>
                    <TableCell>{course.credit ?? "-"}</TableCell>
                    <TableCell>{latestSemester ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isRowLoading}
                          >
                            {isRowLoading ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <MoreHorizontalIcon />
                            )}
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() =>
                              void runRowAction(course.id, "toggle-enroll")
                            }
                          >
                            {isEnrolled ? "Unenroll" : "Enroll"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() =>
                              void runRowAction(course.id, "hide")
                            }
                          >
                            Hide
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-3">
          {courses.map((course, idx) => (
            <CourseCard
              key={course.id}
              course={course}
              isInitialEnrolled={enrolledIds.includes(course.id)}
              onEnrollToggle={fetchEnrolled}
              onHide={handleHide}
              viewMode="grid"
              rowIndex={idx}
            />
          ))}
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

      <div ref={observerTarget} className="md:hidden py-4 flex justify-center">
        {isLoading && (
          <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
        )}
        {!isLoading && page >= totalPages && courses.length > 0 && (
          <span className="text-xs text-slate-400">End of catalog</span>
        )}
      </div>

      <div className="hidden md:block">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={createPageHref(Math.max(1, currentPage - 1))}
              />
            </PaginationItem>
            {pageNumbers.map((p, i) => (
              <PaginationItem key={p}>
                {i > 0 && p - pageNumbers[i - 1] > 1 ? (
                  <PaginationEllipsis />
                ) : null}
                <PaginationLink
                  href={createPageHref(p)}
                  isActive={p === currentPage}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href={createPageHref(Math.min(totalPages, currentPage + 1))}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
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
