"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search } from "lucide-react";

interface ProjectsSeminarsToolbarProps {
  categories: string[];
}

export default function ProjectsSeminarsToolbar({ categories }: ProjectsSeminarsToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const view = searchParams.get("view") === "grid" ? "grid" : "list";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "title";
  const lastPushedQuery = useRef(searchParams.get("q") || "");

  const pushWith = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
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
      lastPushedQuery.current = query;
      pushWith({ q: query || null });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
      <div className="inline-flex h-8 items-center rounded-md border border-[#dddddd] overflow-hidden bg-white">
        <button
          onClick={() => pushWith({ view: "list" })}
          className={`inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] transition-colors ${
            view === "list"
              ? "bg-[#e9e9e9] text-[#1f1f1f] font-medium shadow-[inset_0_0_0_1px_#d8d8d8]"
              : "text-[#7b7b7b] hover:bg-[#f6f6f6]"
          }`}
        >
          <List className="h-3.5 w-3.5" />
          List
        </button>
        <button
          onClick={() => pushWith({ view: "grid" })}
          className={`inline-flex h-8 items-center gap-1.5 px-2.5 text-[13px] transition-colors ${
            view === "grid"
              ? "bg-[#e9e9e9] text-[#1f1f1f] font-medium shadow-[inset_0_0_0_1px_#d8d8d8]"
              : "text-[#7b7b7b] hover:bg-[#f6f6f6]"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Grid
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search seminars..."
            className="h-8 w-[220px] rounded-md border border-[#dddddd] bg-white pl-8 pr-2 text-[13px] text-[#333] placeholder:text-[#a3a3a3] outline-none focus:border-[#c8c8c8]"
          />
        </div>
        <select
          value={category}
          onChange={(e) => pushWith({ category: e.target.value || null })}
          className="h-8 min-w-[170px] appearance-none rounded-md border border-[#d7d7d7] bg-white px-2 pr-7 text-[13px] font-medium text-[#454545] outline-none transition-colors hover:border-[#c7c7c7] focus:border-[#bcbcbc]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23909090' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          <option value="">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => pushWith({ sort: e.target.value })}
          className="h-8 min-w-[150px] appearance-none rounded-md border border-[#d7d7d7] bg-white px-2 pr-7 text-[13px] font-medium text-[#454545] outline-none transition-colors hover:border-[#c7c7c7] focus:border-[#bcbcbc]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23909090' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 8px center",
          }}
        >
          <option value="title">Sort by Title</option>
          <option value="category">Sort by Category</option>
          <option value="credit">Sort by Credit</option>
          <option value="newest">Sort by Newest</option>
        </select>
      </div>
    </div>
  );
}
