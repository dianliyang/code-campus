"use client";

import { useState } from "react";
import { Workout } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import WorkoutCard from "./WorkoutCard";
import WorkoutListHeader from "./WorkoutListHeader";
import { ChevronDown, ExternalLink } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface WorkoutListProps {
  initialWorkouts: Workout[];
  totalItems: number;
  dict: Dictionary["dashboard"]["workouts"];
  lastUpdated: string | null;
  categoryGroups: Array<{ category: string; count: number; minStudentPrice: number | null; maxStudentPrice: number | null }>;
  selectedCategory: string;
}

export default function WorkoutList({
  initialWorkouts,
  totalItems,
  dict,
  lastUpdated,
  categoryGroups,
  selectedCategory,
}: WorkoutListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<"list" | "grid">(() => {
    if (typeof window === "undefined") return "list";
    const savedMode = localStorage.getItem("workoutViewMode");
    return savedMode === "grid" || savedMode === "list" ? savedMode : "list";
  });
  const workouts: Workout[] = initialWorkouts;

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("workoutViewMode", mode);
  };

  const setCategoryOnServer = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("category", category);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const effectiveViewMode: "list" | "grid" = viewMode;

  const selectedGroup = {
    category: selectedCategory,
    items: workouts,
  };

  const [expandedGridCategory, setExpandedGridCategory] = useState<string | null>(selectedCategory || null);

  const formatPrice = (value: number | null) => (value == null ? "-" : Number(value).toFixed(2));
  const selectedActionHref = selectedGroup.items.find((w) => w.bookingUrl || w.url)?.bookingUrl
    || selectedGroup.items.find((w) => w.bookingUrl || w.url)?.url
    || null;

  return (
    <main className="h-full flex flex-col space-y-3 min-w-0">
      <WorkoutListHeader
        totalItems={totalItems}
        viewMode={effectiveViewMode}
        setViewMode={handleViewModeChange}
        dict={dict}
        lastUpdated={lastUpdated}
      />

      <div className={`flex-1 min-h-0 bg-[#fcfcfc] rounded-lg border border-[#e5e5e5] ${effectiveViewMode === "grid" ? "overflow-auto p-3" : "overflow-hidden"}`}>
        {effectiveViewMode === "list" ? (
          <>
            <div className="hidden md:grid md:grid-cols-[320px_minmax(0,1fr)] min-h-[480px]">
              <div className="border-r border-[#e5e5e5] bg-[#fafafa]">
                <div className="px-4 py-2.5 bg-[#f3f3f3] text-[11px] font-semibold text-[#757575] uppercase tracking-wide">Category</div>
                <div className="max-h-[620px] overflow-y-auto">
                  {categoryGroups.map((group) => {
                    const priceRange = group.minStudentPrice == null
                      ? "-"
                      : group.minStudentPrice === group.maxStudentPrice
                        ? formatPrice(group.minStudentPrice)
                        : `${formatPrice(group.minStudentPrice)} ~ ${formatPrice(group.maxStudentPrice)}`;
                    const active = selectedCategory === group.category;

                    return (
                      <button
                        key={group.category}
                        type="button"
                        onClick={() => setCategoryOnServer(group.category)}
                        className={`w-full text-left px-4 py-3 border-b border-[#efefef] hover:bg-white transition-colors ${active ? "bg-white" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#2f2f2f] truncate">{group.category}</p>
                          <span className="text-[11px] text-[#777] shrink-0">{group.count}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-xs text-[#666]">Student: {priceRange}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#4f4f4f]">Action <ExternalLink className="w-3 h-3" /></span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="px-4 py-2.5 bg-[#f3f3f3] text-[11px] font-semibold text-[#757575] uppercase tracking-wide flex items-center justify-between gap-2">
                  <span>{selectedGroup ? `${selectedGroup.category} choices` : "Choices"}</span>
                  {selectedActionHref ? (
                    <a href={selectedActionHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-[#d6d6d6] bg-white px-2 py-1 text-[11px] text-[#444] hover:bg-[#f4f4f4] normal-case">
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                </div>
                <div className="max-h-[620px] overflow-y-auto divide-y divide-[#efefef]">
                  {selectedGroup?.items.map((w) => {
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
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {categoryGroups.map((group) => {
                const priceRange = group.minStudentPrice == null
                  ? "-"
                  : group.minStudentPrice === group.maxStudentPrice
                    ? formatPrice(group.minStudentPrice)
                    : `${formatPrice(group.minStudentPrice)} ~ ${formatPrice(group.maxStudentPrice)}`;
                const expanded = expandedGridCategory === group.category;

                return (
                  <button
                    key={group.category}
                    type="button"
                    onClick={() => {
                      setExpandedGridCategory(group.category);
                      if (selectedCategory !== group.category) setCategoryOnServer(group.category);
                    }}
                    className={`text-left rounded-xl border p-3 transition-colors ${expanded ? "border-[#cfcfcf] bg-white" : "border-[#e3e3e3] bg-[#fafafa] hover:bg-white"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#2e2e2e] truncate">{group.category}</p>
                      <ChevronDown className={`w-4 h-4 text-[#777] transition-transform ${expanded ? "rotate-180" : ""}`} />
                    </div>
                    <p className="mt-1 text-xs text-[#666]">{group.count} choices</p>
                    <p className="mt-1 text-xs text-[#666]">Student: {priceRange}</p>
                  </button>
                );
              })}
            </div>

            {expandedGridCategory === selectedCategory ? (
              <div className="rounded-xl border border-[#e3e3e3] bg-[#fcfcfc] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[#2e2e2e]">{selectedCategory} choices</p>
                  {selectedActionHref ? (
                    <a href={selectedActionHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded border border-[#d6d6d6] bg-white px-2 py-1 text-xs text-[#444] hover:bg-[#f4f4f4]">
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : null}
                </div>
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
              </div>
            ) : null}
          </div>
        )}

        {workouts.length === 0 && (
          <div className="text-center py-16">
            <h3 className="text-sm font-semibold text-slate-900">{dict?.empty_header || "No matches found"}</h3>
            <p className="text-sm text-slate-500 mt-1">{dict?.empty_desc || "Try adjusting your current filters."}</p>
          </div>
        )}
      </div>

      
    </main>
  );
}
