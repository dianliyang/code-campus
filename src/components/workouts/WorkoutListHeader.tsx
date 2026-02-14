"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { List, LayoutGrid } from "lucide-react";

interface WorkoutListHeaderProps {
  totalItems: number;
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  dict: Dictionary['dashboard']['workouts'];
}

export default function WorkoutListHeader({ totalItems, viewMode, setViewMode, dict }: WorkoutListHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sort") || "title";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const sortOptions = [
    { value: "title", label: dict?.sort_title || "Title" },
    { value: "price", label: dict?.sort_price || "Price" },
    { value: "day", label: dict?.sort_day || "Schedule" },
    { value: "newest", label: dict?.sort_newest || "New" },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex items-center justify-between md:justify-start gap-4">
        <span className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] whitespace-nowrap">
          {totalItems} {dict?.found_suffix || "workouts..."}
        </span>
        
        {/* View Mode Switcher */}
        <div className="flex bg-gray-50 border border-gray-100 rounded-lg p-0.5 gap-0.5">
          <button 
            onClick={() => setViewMode("list")} 
            className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-brand-blue" : "text-gray-400 hover:text-gray-600"}`}
            title="List View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setViewMode("grid")} 
            className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-brand-blue" : "text-gray-400 hover:text-gray-600"}`}
            title="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modern Pill Sort UI */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
        <span className="hidden md:inline text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Sort:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSortChange(opt.value)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all active:scale-95 ${
              sortBy === opt.value
                ? "bg-gray-900 text-white border-gray-900 shadow-md"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
