"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  return (
    <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
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

        <div className="flex-1 min-w-0 sm:max-w-[360px]">
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

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" type="button" className="flex-1 sm:flex-none">
                <SlidersHorizontal />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>
                Category
              </DropdownMenuLabel>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {categories.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedCategories.includes(name)}
                      onCheckedChange={() =>
                        pushWith({
                          category: toggleItem(selectedCategories, name),
                        })
                      }
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuLabel>
                Semesters
              </DropdownMenuLabel>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {semesters.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedSemesters.includes(name)}
                      onCheckedChange={() =>
                        pushWith({
                          semester: toggleItem(selectedSemesters, name),
                        })
                      }
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Select value={sort} onValueChange={(next) => pushWith({ sort: next })}>
            <SelectTrigger className="w-full sm:w-[160px]">
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
      </div>
    </div>);

}
