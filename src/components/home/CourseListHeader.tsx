"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dictionary } from "@/lib/dictionary";
import { LayoutGrid, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";

interface CourseListHeaderProps {
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  dict: Dictionary["dashboard"]["courses"];
}

export default function CourseListHeader({ viewMode, setViewMode, dict }: CourseListHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sort") || "title";
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const lastPushedQuery = useRef(searchParams.get("q") || "");

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const openFilters = () => {
    window.dispatchEvent(new Event("course-filters:open"));
  };

  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
      lastPushedQuery.current = urlQuery;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (query === lastPushedQuery.current) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("q", query);
      else params.delete("q");
      params.set("page", "1");
      lastPushedQuery.current = query;
      router.push(`?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  const commitSearch = (q: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (q) params.set("q", q);
    else params.delete("q");
    params.set("page", "1");
    lastPushedQuery.current = q;
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="inline-flex h-9 md:h-8 w-full md:w-auto items-center rounded-md border border-[#dddddd] overflow-hidden bg-white">
          <button
            onClick={() => setViewMode("list")}
            className={`inline-flex h-9 md:h-8 flex-1 md:flex-none items-center justify-center gap-1.5 px-3 md:px-2.5 text-[13px] transition-colors ${
              viewMode === "list"
                ? "bg-[#e9e9e9] text-[#1f1f1f] font-medium shadow-[inset_0_0_0_1px_#d8d8d8]"
                : "text-[#7b7b7b] hover:bg-[#f6f6f6]"
            }`}
            aria-label="List view"
          >
            <List className="h-3.5 w-3.5" />
            List
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`inline-flex h-9 md:h-8 flex-1 md:flex-none items-center justify-center gap-1.5 px-3 md:px-2.5 text-[13px] transition-colors ${
              viewMode === "grid"
                ? "bg-[#e9e9e9] text-[#1f1f1f] font-medium shadow-[inset_0_0_0_1px_#d8d8d8]"
                : "text-[#7b7b7b] hover:bg-[#f6f6f6]"
            }`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </button>
        </div>

        <div className="w-full md:w-auto space-y-2 md:space-y-0 md:flex md:items-center md:gap-2">
          <div className="grid grid-cols-2 md:flex items-center gap-2 text-[13px] text-[#6a6a6a]">
            <Link
              href="/import"
              className="inline-flex h-9 md:h-8 items-center justify-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New course
            </Link>
            <button
              onClick={openFilters}
              className="inline-flex h-9 md:h-8 items-center justify-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
            </button>
          </div>

          <div className="grid grid-cols-1 md:flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="h-9 md:h-8 w-full md:min-w-[150px] appearance-none rounded-md border border-[#d7d7d7] bg-white px-2 pr-7 text-[13px] font-medium text-[#454545] outline-none transition-colors hover:border-[#c7c7c7] focus:border-[#bcbcbc]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23909090' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              <option value="title">{dict?.sort_title || "Title (A-Z)"}</option>
              <option value="popularity">{dict?.sort_popularity || "Popularity"}</option>
              <option value="newest">{dict?.sort_newest || "Newest"}</option>
            </select>

            <div className="relative w-full md:min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitSearch(query); }}
                placeholder="Search..."
                className="h-9 md:h-8 w-full rounded-md border border-[#dddddd] bg-white pl-8 pr-8 text-[16px] md:text-[13px] text-[#333] placeholder:text-[#a3a3a3] outline-none focus:border-[#c8c8c8]"
              />
              {query ? (
                <button
                  onClick={() => { setQuery(""); commitSearch(""); }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#9a9a9a] hover:text-[#555]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
