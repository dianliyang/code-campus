"use client";

import { useMemo } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search, ArrowDownWideNarrow, X } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

interface ProjectsSeminarsToolbarProps {
  categories: string[];
  semesters: string[];
}

export default function ProjectsSeminarsToolbar({
  categories,
  semesters
}: ProjectsSeminarsToolbarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const view = searchParams.get("view") === "grid" ? "grid" : "list";
  const selectedCategories =
  searchParams.get("category")?.split(",").filter(Boolean) || [];
  const selectedSemesters =
  searchParams.get("semester")?.split(",").filter(Boolean) || [];
  const sort = searchParams.get("sort") || "title";
  const lastPushedQuery = useRef(searchParams.get("q") || "");
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("athena_sp_filters");
    const current = searchParams.toString();
    if (saved && !current) {
      router.replace(`?${saved}`, { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    const current = searchParams.toString();
    if (current) {
      localStorage.setItem("athena_sp_filters", current);
    }
  }, [searchParams]);

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const activeFilterCount =
    (selectedSemesters.length > 0 ? 1 : 0);

  const pushWith = (patch: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) params.delete(key);
        else params.set(key, value.join(","));
      } else if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  // Get latest 4 semesters
  const latestSemesters = useMemo(() => {
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
        const term = m[1].toLowerCase();
        const year = Number(m[2]);
        const weight = termOrder[term] || 0;
        return { label: value, year, weight };
      })
      .filter((v): v is { label: string; year: number; weight: number } => v !== null);

    parsed.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.weight - a.weight;
    });

    return parsed.slice(0, 4).map(p => p.label);
  }, [semesters]);

  const handleSemesterChange = (value: string) => {
    pushWith({ semester: value === "__all__" ? null : [value] });
  };

  const clearFilters = () => {
    pushWith({
      semester: null,
      category: null,
    });
  };

  return (
    <div className="mb-4 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div
        className="flex w-full flex-nowrap items-center gap-2"
        data-testid="projects-toolbar-row"
      >
      <div className="flex items-center gap-2 flex-1 min-w-0" data-testid="projects-toolbar-leading">
        {!isMobileViewport ? (
          <Tabs value={view} onValueChange={(next) => pushWith({ view: next })} className="shrink-0">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="list" className="flex-1 sm:flex-none">
                <List className="h-3.5 w-3.5" />
                List
              </TabsTrigger>
              <TabsTrigger value="grid" className="flex-1 sm:flex-none">
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        {isMobileViewport ? (
          <InputGroup className="w-full" data-testid="projects-mobile-search">
            <InputGroupInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search seminars..."
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            </InputGroupAddon>
          </InputGroup>
        ) : null}

        <div className={`${isMobileViewport ? "hidden" : "flex-1 min-w-0 sm:max-w-[360px]"}`}>
          <InputGroup>
            <InputGroupInput
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search seminars..."
            />
            <InputGroupAddon align="inline-end">
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0" data-testid="projects-toolbar-trailing">
        <div className="flex items-center gap-2">
          <Select
            value={selectedSemesters[0] || "__all__"}
            onValueChange={handleSemesterChange}
          >
            <SelectTrigger className={isMobileViewport ? "w-[120px]" : "w-[160px]"}>
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="__all__">All Semesters</SelectItem>
              {latestSemesters.map((sem) => (
                <SelectItem key={sem} value={sem}>
                  {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(next) => pushWith({ sort: next })}>
            <SelectTrigger className={`${isMobileViewport ? "hidden" : "w-full sm:w-[160px]"}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort</SelectLabel>
                <SelectItem value="title">Sort by Title</SelectItem>
                <SelectItem value="category">Sort by Category</SelectItem>
                <SelectItem value="credit">Sort by Credit</SelectItem>
                <SelectItem value="newest">Sort by Newest</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {(selectedSemesters.length > 0 || query) && (
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={() => {
                setQuery("");
                clearFilters();
              }}
              title="Clear filters"
              aria-label="Clear filters"
              className="size-9"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      </div>
    </div>);

}
