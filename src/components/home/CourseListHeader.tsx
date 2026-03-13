"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import {
  ArrowDownWideNarrow,
  LayoutGrid,
  List,
  Search,
  X,
} from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

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
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const lastPushedQuery = useRef(searchParams.get("q") || "");
  const isComposing = useRef(false);

  const selectedUniversities =
    searchParams.get("universities")?.split(",").filter(Boolean) || [];
  const selectedSemesters =
    searchParams.get("semesters")?.split(",").filter(Boolean) || [];
  const showEnrolledOnly = searchParams.get("enrolled") === "true";

  useEffect(() => {
    const saved = localStorage.getItem("athena_course_filters");
    const current = searchParams.toString();
    if (saved && !current) {
      router.replace(`?${saved}`, { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    const current = searchParams.toString();
    if (current) {
      localStorage.setItem("athena_course_filters", current);
    }
  }, [searchParams]);

  const pushWith = (
    patch: Record<string, string | string[] | boolean | null>,
  ) => {
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
    list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];

  const handleSortChange = (value: string) => pushWith({ sort: value });

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
      lastPushedQuery.current = urlQuery;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (query === lastPushedQuery.current || isComposing.current) return;

    const timer = setTimeout(() => {
      if (isComposing.current) return;
      const currentUrlQuery = searchParams.get("q") || "";
      if (query === currentUrlQuery) {
        lastPushedQuery.current = query;
        return;
      }

      lastPushedQuery.current = query;
      pushWith({ q: query || null });
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const commitSearch = (q: string) => {
    lastPushedQuery.current = q;
    pushWith({ q: q || null });
  };

  const clearFilters = () => {
    pushWith({
      universities: null,
      semesters: null,
      enrolled: false,
      fields: null,
    });
  };

  const activeFilterCount =
    (selectedUniversities.length > 0 ? 1 : 0) +
    (selectedSemesters.length > 0 ? 1 : 0) +
    (showEnrolledOnly ? 1 : 0);

  // Get latest 4 semesters
  const latestSemesters = useMemo(() => {
    const termOrder: Record<string, number> = {
      spring: 1,
      summer: 2,
      fall: 3,
      winter: 4,
    };

    const parsed = filterSemesters
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
  }, [filterSemesters]);

  const handleUniversityChange = (value: string) => {
    pushWith({ universities: value === "__all__" ? null : [value] });
  };

  const handleSemesterChange = (value: string) => {
    pushWith({ semesters: value === "__all__" ? null : [value] });
  };

  return (
    <div className="sticky top-0 z-30 flex flex-col gap-2.5 bg-white/95 backdrop-blur-xl py-4 mb-0">
      <div className="flex w-full items-center justify-between gap-2 md:flex-row md:items-center md:justify-between">
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          data-testid="course-toolbar-leading"
        >
          {!isMobileViewport ? (
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as "list" | "grid")}
              className="md:w-auto"
            >
              <TabsList>
                <TabsTrigger value="list" aria-label="List view">
                  <List className="size-4 shrink-0" />
                  <span className="hidden xl:inline">List</span>
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="Grid view">
                  <LayoutGrid className="size-4 shrink-0" />
                  <span className="hidden xl:inline">Grid</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          {isMobileViewport ? (
            <InputGroup className="w-full xl:hidden" data-testid="course-mobile-search">
              <InputGroupInput
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onCompositionStart={() => {
                  isComposing.current = true;
                }}
                onCompositionEnd={(e) => {
                  isComposing.current = false;
                  setQuery(e.currentTarget.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitSearch(query);
                  if (e.key === "Escape" && query) {
                    setQuery("");
                    commitSearch("");
                  }
                }}
                placeholder="Search courses..."
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => {
                    if (query) {
                      setQuery("");
                      commitSearch("");
                    }
                  }}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X className="size-4" />
                </button>
              </InputGroupAddon>
            </InputGroup>
          ) : null}

          <ButtonGroup className="hidden xl:flex">
            <InputGroup className="w-full min-w-[220px] md:w-[220px] lg:w-[280px]">
              <InputGroupInput
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onCompositionStart={() => {
                  isComposing.current = true;
                }}
                onCompositionEnd={(e) => {
                  isComposing.current = false;
                  setQuery(e.currentTarget.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitSearch(query);
                  if (e.key === "Escape" && query) {
                    setQuery("");
                    commitSearch("");
                  }
                }}
                placeholder="Search courses..."
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      commitSearch("");
                    }}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </InputGroupAddon>
            </InputGroup>
          </ButtonGroup>
        </div>

        <div
          className="flex shrink-0 items-center justify-end gap-2"
          data-testid="course-toolbar-trailing"
        >
          <div className="flex items-center gap-2 text-[13px] text-[#6a6a6a]">
            <Select
              value={selectedUniversities[0] || "__all__"}
              onValueChange={handleUniversityChange}
            >
              <SelectTrigger className={isMobileViewport ? "w-[120px]" : "w-[160px]"}>
                <SelectValue placeholder="All Universities" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="__all__">All Universities</SelectItem>
                {filterUniversities.map((uni) => (
                  <SelectItem key={uni} value={uni}>
                    {uni}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

            <div className="hidden xl:block">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="title">
                    {dict?.sort_title || "Title (A-Z)"}
                  </SelectItem>
                  <SelectItem value="popularity">
                    {dict?.sort_popularity || "Popularity"}
                  </SelectItem>
                  <SelectItem value="newest">
                    {dict?.sort_newest || "Newest"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={clearFilters}
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
    </div>
  );
}
