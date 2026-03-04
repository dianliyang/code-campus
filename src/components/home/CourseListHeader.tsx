"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dictionary } from "@/lib/dictionary";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

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
  const lastPushedQuery = useRef(searchParams.get("q") || "");
  const isComposing = useRef(false);

  const selectedUniversities =
    searchParams.get("universities")?.split(",").filter(Boolean) || [];
  const selectedSemesters =
    searchParams.get("semesters")?.split(",").filter(Boolean) || [];
  const showEnrolledOnly = searchParams.get("enrolled") === "true";

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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <Tabs
          value={viewMode}
          onValueChange={(value) => setViewMode(value as "list" | "grid")}
          className="w-full md:w-auto"
        >
          <TabsList>
            <TabsTrigger value="list" aria-label="List view">
              <List className="h-3.5 w-3.5" />
              List
            </TabsTrigger>
            <TabsTrigger value="grid" aria-label="Grid view">
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="w-full md:w-auto space-y-2 md:space-y-0 md:flex md:items-center md:gap-2">
          <div className="grid grid-cols-2 md:flex items-center gap-2 text-[13px] text-[#6a6a6a]">
            <Button variant="outline" asChild>
              <Link href="/settings/import">
                <Plus />
                New course
              </Link>
            </Button>
            <Drawer
              direction="right"
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
            >
              <DrawerTrigger asChild>
                <Button variant="outline" type="button">
                  <SlidersHorizontal />
                  Filter
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Filters</DrawerTitle>
                  <DrawerDescription>Refine course results</DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-2 space-y-4 overflow-y-auto">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
                      Universities
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filterUniversities.map((name) => (
                        <label
                          key={name}
                          className="flex items-center gap-2 text-[13px] text-[#444]"
                        >
                          <Input
                            type="checkbox"
                            checked={selectedUniversities.includes(name)}
                            onChange={() =>
                              pushWith({
                                universities: toggleItem(
                                  selectedUniversities,
                                  name,
                                ),
                              })
                            }
                          />

                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
                      Semesters
                    </p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {filterSemesters.map((name) => (
                        <label
                          key={name}
                          className="flex items-center gap-2 text-[13px] text-[#444]"
                        >
                          <Input
                            type="checkbox"
                            checked={selectedSemesters.includes(name)}
                            onChange={() =>
                              pushWith({
                                semesters: toggleItem(selectedSemesters, name),
                              })
                            }
                          />

                          <span>{name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#efefef] pt-2">
                    <label className="flex items-center gap-2 text-[13px] text-[#444]">
                      <Input
                        type="checkbox"
                        checked={showEnrolledOnly}
                        onChange={(e) =>
                          pushWith({ enrolled: e.target.checked })
                        }
                      />

                      <span>{dict?.sidebar_enrolled || "Enrolled Only"}</span>
                    </label>
                  </div>
                </div>
                <DrawerFooter>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                  <DrawerClose asChild>
                    <Button variant="outline" type="button">
                      Done
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </div>

          <div className="grid grid-cols-1 md:flex items-center gap-2">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sort</SelectLabel>
                  <SelectItem value="title">
                    {dict?.sort_title || "Title (A-Z)"}
                  </SelectItem>
                  <SelectItem value="popularity">
                    {dict?.sort_popularity || "Popularity"}
                  </SelectItem>
                  <SelectItem value="newest">
                    {dict?.sort_newest || "Newest"}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <div className="relative w-full md:min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a]" />
              <Input
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
                }}
                placeholder="Search..."
              />

              {query ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    commitSearch("");
                  }}
                  aria-label="Clear search"
                >
                  <X />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
