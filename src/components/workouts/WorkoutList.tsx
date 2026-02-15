"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Workout } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import WorkoutCard from "./WorkoutCard";
import WorkoutListHeader from "./WorkoutListHeader";
import Pagination from "../home/Pagination";
import { Radio, Loader2 } from "lucide-react";
import { fetchWorkoutsAction } from "@/actions/scrapers";
import { useSearchParams } from "next/navigation";
import VirtualCard from "../common/VirtualCard";

interface WorkoutListProps {
  initialWorkouts: Workout[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  dict: Dictionary['dashboard']['workouts'];
  lastUpdated: string | null;
}

export default function WorkoutList({
  initialWorkouts,
  totalItems,
  totalPages,
  currentPage,
  dict,
  lastUpdated
}: WorkoutListProps) {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [workouts, setWorkouts] = useState<Workout[]>(initialWorkouts);
  const [page, setPage] = useState(currentPage);
  const [isLoading, setIsLoading] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load view mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("workoutViewMode") as "list" | "grid";
    if (savedMode) setViewMode(savedMode);
  }, []);

  // Sync workouts when initialWorkouts changes (e.g., filter change via URL)
  useEffect(() => {
    setWorkouts(initialWorkouts);
    setPage(currentPage);
  }, [initialWorkouts, currentPage]);

  // Save view mode to localStorage
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
        query,
        sort,
        categories,
        days,
        status
      });

      if (nextData.items.length > 0) {
        setWorkouts(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const newItems = nextData.items.filter(w => !existingIds.has(w.id));
          return [...prev, ...newItems];
        });
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error("[WorkoutList] Failed to load more:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, totalPages, isLoading, searchParams]);

  // Intersection Observer for Infinite Scroll (Mobile Only)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Only trigger if we are on mobile (using window width check as proxy)
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
      <WorkoutListHeader
        totalItems={totalItems}
        viewMode={viewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
        lastUpdated={lastUpdated}
      />

      <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "bg-white border border-gray-200 rounded-xl overflow-hidden"}>
        {viewMode === "list" && workouts && workouts.length > 0 && (
          <div className="hidden md:flex items-center gap-6 px-6 py-3 bg-gray-50/50 border-b border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 select-none">
             <div className="w-[30%] flex-shrink-0">Workout</div>
             <div className="w-[20%] flex-shrink-0">Schedule</div>
             <div className="flex-grow min-w-0">Location / Instructor</div>
             <div className="w-16 flex-shrink-0 text-center">Price</div>
             <div className="w-24 flex-shrink-0 text-center">Status</div>
             <div className="w-16 flex-shrink-0 text-right pr-2">Booking</div>
          </div>
        )}
        {workouts?.map((workout) => (
          <VirtualCard 
            key={`${workout.id}-${viewMode}`} 
            id={workout.id} 
            initialHeight={viewMode === 'list' ? "80px" : "320px"}
            className={viewMode === 'list' ? "border-b border-gray-100" : ""}
          >
            <WorkoutCard
              workout={workout}
              viewMode={viewMode}
              dict={dict}
            />
          </VirtualCard>
        ))}
        {workouts?.length === 0 && (
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
                {dict?.empty_desc || "Adjust your activity filters to find available sports courses."}
              </p>
              <div className="mt-8 h-px w-12 bg-gray-100"></div>
            </div>
          </div>
        )}
      </div>

      {/* Infinite Scroll Loader / Target */}
      <div ref={observerTarget} className="md:hidden py-10 flex justify-center">
        {isLoading && <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />}
        {!isLoading && page >= totalPages && workouts.length > 0 && (
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">End of catalog</span>
        )}
      </div>

      {/* Desktop Pagination */}
      <div className="hidden md:block">
        <Pagination totalPages={totalPages} currentPage={currentPage} />
      </div>
    </main>
  );
}
