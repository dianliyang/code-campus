"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";import { Card } from "@/components/ui/card";

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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  const pushWith = (patch: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) params.delete(key);else
        params.set(key, value.join(","));
      } else if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const toggleItem = (list: string[], value: string) =>
  list.includes(value) ?
  list.filter((item) => item !== value) :
  [...list, value];

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
      const currentUrlQuery = searchParams.get("q") || "";
      if (query === currentUrlQuery) {
        lastPushedQuery.current = query;
        return;
      }

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

  return (
    <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
      <Tabs value={view} onValueChange={(next) => pushWith({ view: next })}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-3.5 w-3.5" />
            List
          </TabsTrigger>
          <TabsTrigger value="grid">
            <LayoutGrid className="h-3.5 w-3.5" />
            Grid
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9a9a9a]" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search seminars..." />
          
        </div>
        <div className="relative" ref={filtersRef}>
          <Button variant="outline"
          type="button"
          onClick={() => setFiltersOpen((prev) => !prev)}>

            
            <SlidersHorizontal />
            Filters
          </Button>
          {filtersOpen ?
          <Card>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
                  Category
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {categories.map((name) =>
                <label
                  key={name}
                  className="flex items-center gap-2 text-[13px] text-[#444]">
                  
                      <Input
                    type="checkbox"
                    checked={selectedCategories.includes(name)}
                    onChange={() =>
                    pushWith({
                      category: toggleItem(selectedCategories, name)
                    })
                    }
                    className="h-3.5 w-3.5 border-[#cfcfcf] accent-[#2f2f2f]" />
                  
                      <span>{name}</span>
                    </label>
                )}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a7a7a]">
                  Semesters
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {semesters.map((name) =>
                <label
                  key={name}
                  className="flex items-center gap-2 text-[13px] text-[#444]">
                  
                      <Input
                    type="checkbox"
                    checked={selectedSemesters.includes(name)}
                    onChange={() =>
                    pushWith({
                      semester: toggleItem(selectedSemesters, name)
                    })
                    }
                    className="h-3.5 w-3.5 border-[#cfcfcf] accent-[#2f2f2f]" />
                  
                      <span>{name}</span>
                    </label>
                )}
                </div>
              </div>
            </Card> :
          null}
        </div>
        <Select value={sort} onValueChange={(next) => pushWith({ sort: next })}>
          <SelectTrigger>
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
      </div>
    </div>);

}