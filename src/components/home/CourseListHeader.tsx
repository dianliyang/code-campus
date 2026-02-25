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
  filterUniversities: string[];
  filterSemesters: string[];
}

export default function CourseListHeader({
  viewMode,
  setViewMode,
  dict,
  filterUniversities,
  filterSemesters,
}: CourseListHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sort") || "title";
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const lastPushedQuery = useRef(searchParams.get("q") || "");

  const selectedUniversities = searchParams.get("universities")?.split(",").filter(Boolean) || [];
  const selectedSemesters = searchParams.get("semesters")?.split(",").filter(Boolean) || [];
  const showEnrolledOnly = searchParams.get("enrolled") === "true";

  const pushWith = (patch: Record<string, string | string[] | boolean | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) params.delete(key);
        else params.set(key, value.join(","));
        return;
      }
      if (typeof value === "boolean") {
        if (value) params.set(key, "true");
        else params.delete(key);
        return;
      }
      if (!value) params.delete(key);
      else params.set(key, value);
    });

    // Remove legacy disciplines filter from URL whenever filters update.
    params.delete("fields");
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const toggleItem = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const handleSortChange = (value: string) => pushWith({ sort: value });

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
      lastPushedQuery.current = query;
      pushWith({ q: query || null });
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!filtersRef.current) return;
      if (!filtersRef.current.contains(event.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const commitSearch = (q: string) => {
    lastPushedQuery.current = q;
    pushWith({ q: q || null });
  };

  const clearFilters = () => {
    pushWith({ universities: null, semesters: null, enrolled: false, fields: null });
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
            <div className="relative" ref={filtersRef}>
              <button
                type="button"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="inline-flex h-9 md:h-8 items-center justify-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filter
              </button>
              {filtersOpen ? (
                <div className="absolute right-0 z-30 mt-1.5 w-[320px] rounded-md border border-[#e1e1e1] bg-white p-3 shadow-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">Universities</p>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-[11px] text-[#7a7a7a] hover:text-[#1f1f1f]"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {filterUniversities.map((name) => (
                        <label key={name} className="flex items-center gap-2 text-[13px] text-[#444]">
                          <input
                            type="checkbox"
                            checked={selectedUniversities.includes(name)}
                            onChange={() => pushWith({ universities: toggleItem(selectedUniversities, name) })}
                            className="h-3.5 w-3.5 rounded border-[#cfcfcf] accent-[#2f2f2f]"
                          />
                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">Semesters</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                      {filterSemesters.map((name) => (
                        <label key={name} className="flex items-center gap-2 text-[13px] text-[#444]">
                          <input
                            type="checkbox"
                            checked={selectedSemesters.includes(name)}
                            onChange={() => pushWith({ semesters: toggleItem(selectedSemesters, name) })}
                            className="h-3.5 w-3.5 rounded border-[#cfcfcf] accent-[#2f2f2f]"
                          />
                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[#efefef] pt-2">
                    <label className="flex items-center gap-2 text-[13px] text-[#444]">
                      <input
                        type="checkbox"
                        checked={showEnrolledOnly}
                        onChange={(e) => pushWith({ enrolled: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-[#cfcfcf] accent-[#2f2f2f]"
                      />
                      <span>{dict?.sidebar_enrolled || "Enrolled Only"}</span>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitSearch(query);
                }}
                placeholder="Search..."
                className="h-9 md:h-8 w-full rounded-md border border-[#dddddd] bg-white pl-8 pr-8 text-[16px] md:text-[13px] text-[#333] placeholder:text-[#a3a3a3] outline-none focus:border-[#c8c8c8]"
              />
              {query ? (
                <button
                  onClick={() => {
                    setQuery("");
                    commitSearch("");
                  }}
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
