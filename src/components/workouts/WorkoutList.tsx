"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Workout } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import WorkoutCard from "./WorkoutCard";
import WorkoutListHeader from "./WorkoutListHeader";
import Pagination from "../home/Pagination";
import { Loader2 } from "lucide-react";
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
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loadMore, isLoading]);

  const effectiveViewMode: "list" | "grid" = viewMode;

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
          <div className={`hidden md:flex items-center gap-4 px-4 py-2.5 bg-[#f3f3f3] text-[11px] font-semibold text-[#757575] select-none uppercase tracking-wide ${effectiveViewMode === "grid" ? "!hidden" : ""}`}>
            <div className="flex-1 min-w-0">Workout</div>
            <div className="w-[15%]">Schedule</div>
            <div className="w-[18%]">Location</div>
            <div className="w-[10%] text-right pr-1">Price</div>
            <div className="w-[12%]">Status</div>
            <div className="w-[8%] text-right pr-1">Action</div>
          </div>

          <div className={effectiveViewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : ""}>
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
