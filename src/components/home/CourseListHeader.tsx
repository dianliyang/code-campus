"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";

interface CourseListHeaderProps {
  totalItems: number;
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  dict: Dictionary['dashboard']['courses'];
}

export default function CourseListHeader({ totalItems, viewMode, setViewMode, dict }: CourseListHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sort") || "title";

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-sm text-gray-500 font-mono">
        {dict?.found_prefix || "Found"} {totalItems} {dict?.found_suffix || "courses..."}
      </span>
      <div className="flex items-center gap-4">
        <div className="flex bg-gray-100 rounded p-1 gap-1">
          <button 
            onClick={() => setViewMode("list")} 
            className={`p-1 px-2 rounded text-xs ${viewMode === "list" ? "bg-white shadow-sm text-brand-blue" : "text-gray-400"}`}
          >
            <i className="fa-solid fa-list"></i>
          </button>
          <button 
            onClick={() => setViewMode("grid")} 
            className={`p-1 px-2 rounded text-xs ${viewMode === "grid" ? "bg-white shadow-sm text-brand-blue" : "text-gray-400"}`}
          >
            <i className="fa-solid fa-border-all"></i>
          </button>
        </div>
        <select 
          value={sortBy} 
          onChange={(e) => handleSortChange(e.target.value)} 
          className="text-sm border-none bg-transparent font-bold focus:ring-0 cursor-pointer outline-none"
        >
          <option value="relevance">{dict?.sort_relevance || "Relevance"}</option>
          <option value="popularity">{dict?.sort_popularity || "Popularity"}</option>
          <option value="newest">{dict?.sort_newest || "Newest"}</option>
          <option value="title">{dict?.sort_title || "Title (A-Z)"}</option>
        </select>
      </div>
    </div>
  );
}
