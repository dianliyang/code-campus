"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Workout } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import WorkoutCard from "./WorkoutCard";
import WorkoutListHeader from "./WorkoutListHeader";
import Pagination from "../home/Pagination";
import { ExternalLink, Loader2 } from "lucide-react";
import { fetchWorkoutsAction } from "@/actions/scrapers";
import { useSearchParams } from "next/navigation";

interface WorkoutListProps {
  initialWorkouts: Workout[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  perPage: number;
  dict: Dictionary["dashboard"]["workouts"];
  lastUpdated: string | null;
}

export default function WorkoutList({
  initialWorkouts,
  totalItems,
  totalPages,
  currentPage,
  perPage,
  dict,
  lastUpdated,
}: WorkoutListProps) {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [page, setPage] = useState(currentPage);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem("workoutViewMode") as "list" | "grid";
    if (savedMode) setViewMode(savedMode);
  }, []);

  useEffect(() => {
    setWorkouts(initialWorkouts);
    setPage(currentPage);
  }, [initialWorkouts, currentPage]);

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("workoutViewMode", mode);
  };

  const loadMore = useCallback(async () => {
    if (isLoading || page >= totalPages) return;

    setIsLoading(true);
    try {
      const query = searchParams.get("q") || "";
      const sort = searchParams.get("sort") || "title";
      const categories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
      const days = searchParams.get("days")?.split(",").filter(Boolean) || [];
      const status = searchParams.get("status")?.split(",").filter(Boolean) || [];

      const nextData = await fetchWorkoutsAction({
        page: page + 1,
        size: perPage,
        query,
        sort,
        categories,
        days,
        status,
      });

      if (nextData.items.length > 0) {
        setWorkouts((prev) => {
          const existingIds = new Set(prev.map((w) => w.id));
          const newItems = nextData.items.filter((w) => !existingIds.has(w.id));
          return [...prev, ...newItems];
        });
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("[WorkoutList] Failed to load more:", error);
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
      { threshold: 0, rootMargin: "0px 0px 320px 0px" },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, isLoading]);

  const effectiveViewMode: "list" | "grid" = viewMode;

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Workout[]>();
    workouts.forEach((w) => {
      const key = (w.categoryEn || w.category || "Other").trim();
      const arr = map.get(key) || [];
      arr.push(w);
      map.set(key, arr);
    });
    return Array.from(map.entries())
      .map(([category, items]) => ({ category, items }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [workouts]);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (groupedByCategory.length === 0) {
      setSelectedCategory(null);
      return;
    }
    if (!selectedCategory || !groupedByCategory.some((g) => g.category === selectedCategory)) {
      setSelectedCategory(groupedByCategory[0].category);
    }
  }, [groupedByCategory, selectedCategory]);

  const selectedGroup = groupedByCategory.find((g) => g.category === selectedCategory) || null;

  const formatPrice = (value: number | null) => (value == null ? "-" : Number(value).toFixed(2));

  return (
    <main className="flex-grow space-y-3 min-w-0">
      <WorkoutListHeader
        totalItems={totalItems}
        viewMode={effectiveViewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
        lastUpdated={lastUpdated}
      />

      <div className={`bg-[#fcfcfc] rounded-lg border border-[#e5e5e5] ${effectiveViewMode === "grid" ? "overflow-visible p-3" : "overflow-hidden"}`}>
        {effectiveViewMode === "list" ? (
          <>
            <div className="hidden md:grid md:grid-cols-[320px_minmax(0,1fr)] min-h-[480px]">
              <div className="border-r border-[#e5e5e5] bg-[#fafafa]">
                <div className="px-4 py-2.5 bg-[#f3f3f3] text-[11px] font-semibold text-[#757575] uppercase tracking-wide">Category</div>
                <div className="max-h-[620px] overflow-y-auto">
                  {groupedByCategory.map((group) => {
                    const prices = group.items
                      .map((i) => i.priceStudent)
                      .filter((v): v is number => typeof v === "number");
                    const min = prices.length ? Math.min(...prices) : null;
                    const max = prices.length ? Math.max(...prices) : null;
                    const priceRange = min == null ? "-" : min === max ? formatPrice(min) : `${formatPrice(min)} ~ ${formatPrice(max)}`;
                    const actionHref = group.items.find((i) => i.bookingUrl || i.url);
                    const active = selectedCategory === group.category;

                    return (
                      <button
                        key={group.category}
                        type="button"
                        onClick={() => setSelectedCategory(group.category)}
                        className={`w-full text-left px-4 py-3 border-b border-[#efefef] hover:bg-white transition-colors ${active ? "bg-white" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#2f2f2f] truncate">{group.category}</p>
                          <span className="text-[11px] text-[#777] shrink-0">{group.items.length}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-xs text-[#666]">Student: {priceRange}</span>
                          {actionHref ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#4f4f4f]">Action <ExternalLink className="w-3 h-3" /></span>
                          ) : (
                            <span className="text-[11px] text-[#aaa]">No action</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="px-4 py-2.5 bg-[#f3f3f3] text-[11px] font-semibold text-[#757575] uppercase tracking-wide">
                  {selectedGroup ? `${selectedGroup.category} choices` : "Choices"}
                </div>
                <div className="max-h-[620px] overflow-y-auto divide-y divide-[#efefef]">
                  {selectedGroup?.items.map((w) => {
                    const href = w.bookingUrl || w.url;
                    const title = w.titleEn || w.title;
                    return (
                      <div key={w.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#2e2e2e] truncate">{title}</p>
                            <p className="text-xs text-[#777] truncate">{w.dayOfWeek || "-"} {w.startTime ? w.startTime.slice(0,5) : ""}{w.endTime ? `-${w.endTime.slice(0,5)}` : ""}</p>
                            <p className="text-xs text-[#8a8a8a] truncate">{w.locationEn || w.location || "-"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-[#888]">Student</p>
                            <p className="text-sm font-semibold text-[#333]">{formatPrice(w.priceStudent)}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-[11px] text-[#666]">
                          <span>Staff: {formatPrice(w.priceStaff)}</span>
                          <span>External: {formatPrice(w.priceExternal)}</span>
                          {href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 rounded border border-[#d6d6d6] bg-white px-2 py-1 hover:bg-[#f4f4f4]">
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="md:hidden">
              {workouts.map((workout, idx) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  viewMode={effectiveViewMode}
                  dict={dict}
                  rowIndex={idx}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {workouts.map((workout, idx) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                viewMode={effectiveViewMode}
                dict={dict}
                rowIndex={idx}
              />
            ))}
          </div>
        )}

        {workouts.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-sm font-semibold text-slate-900">{dict?.empty_header || "No matches found"}</h3>
            <p className="text-sm text-slate-500 mt-1">{dict?.empty_desc || "Try adjusting your current filters."}</p>
          </div>
        )}
      </div>

      <div ref={observerTarget} className="md:hidden py-4 flex justify-center">
        {isLoading && <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />}
        {!isLoading && page >= totalPages && workouts.length > 0 && (
          <span className="text-xs text-slate-400">End of catalog</span>
        )}
      </div>

      <div className="hidden md:block sticky bottom-0 bg-[#fcfcfc]">
        <Pagination totalPages={totalPages} currentPage={currentPage} totalItems={totalItems} perPage={perPage} />
      </div>
    </main>
  );
}
