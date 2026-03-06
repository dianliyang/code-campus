"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dictionary } from "@/lib/dictionary";
import {
  ArrowUpDown,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
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

  const activeFilterCount =
    selectedUniversities.length +
    selectedSemesters.length +
    (showEnrolledOnly ? 1 : 0);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          data-testid="course-toolbar-leading"
        >
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as "list" | "grid")}
            className="hidden md:block md:w-auto"
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

          <ButtonGroup className="xl:hidden">
            <Button
              variant="outline"
              size="icon"
              type="button"
              className="size-9"
              aria-label="Search courses"
              title="Search courses"
              onClick={() => setMobileSearchOpen((prev) => !prev)}
            >
              <Search className="size-4 shrink-0" />
            </Button>
          </ButtonGroup>

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
          className="flex items-center justify-end gap-2"
          data-testid="course-toolbar-trailing"
        >
          <ButtonGroup className="w-auto text-[13px] text-[#6a6a6a]">
            <ButtonGroup>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="size-9 p-0 xl:hidden"
                    aria-label="Sort"
                    title="Sort"
                  >
                    <ArrowUpDown className="size-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortChange("title")}>
                    {dict?.sort_title || "Title (A-Z)"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortChange("popularity")}
                  >
                    {dict?.sort_popularity || "Popularity"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange("newest")}>
                    {dict?.sort_newest || "Newest"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden xl:block">
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[150px]">
                    <ArrowUpDown className="size-4 shrink-0" />
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
            </ButtonGroup>

            <ButtonGroup>
              <Button variant="outline" asChild>
                <Link href="/settings/import" aria-label="New course" title="New course">
                  <Plus className="size-4 shrink-0" />
                  <span className="hidden xl:inline">New course</span>
                </Link>
              </Button>
            </ButtonGroup>

            <ButtonGroup>
              <Drawer direction="right" open={filtersOpen} onOpenChange={setFiltersOpen}>
                <ButtonGroup className="group">
                  <DrawerTrigger asChild>
                    <Button variant="outline" type="button" aria-label="Filter" title="Filter">
                      <SlidersHorizontal className="size-4 shrink-0" />
                      <span className="hidden xl:inline">Filter</span>
                      {activeFilterCount > 0 ? (
                        <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                          {activeFilterCount}
                        </Badge>
                      ) : null}
                    </Button>
                  </DrawerTrigger>
                  {activeFilterCount > 0 ? (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={clearFilters}
                      title="Clear filters"
                      aria-label="Clear filters"
                    >
                      <X />
                    </Button>
                  ) : null}
                </ButtonGroup>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Filters</DrawerTitle>
                    <DrawerDescription>Refine course results</DrawerDescription>
                  </DrawerHeader>
                  <div className="no-scrollbar overflow-y-auto px-4 pb-2">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        Universities
                      </p>
                      <div className="max-h-40 space-y-1.5 overflow-y-auto">
                        {filterUniversities.map((name) => (
                          <label
                            key={name}
                            className="flex items-center gap-2.5 text-sm text-foreground"
                          >
                            <Checkbox
                              checked={selectedUniversities.includes(name)}
                              onCheckedChange={() =>
                                pushWith({
                                  universities: toggleItem(selectedUniversities, name),
                                })
                              }
                            />

                            <span>{name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        Semesters
                      </p>
                      <div className="max-h-40 space-y-1.5 overflow-y-auto">
                        {filterSemesters.map((name) => (
                          <label
                            key={name}
                            className="flex items-center gap-2.5 text-sm text-foreground"
                          >
                            <Checkbox
                              checked={selectedSemesters.includes(name)}
                              onCheckedChange={() =>
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

                    <div className="mt-5 border-t pt-3">
                      <label className="flex items-center gap-2.5 text-sm text-foreground">
                        <Checkbox
                          checked={showEnrolledOnly}
                          onCheckedChange={(checked) =>
                            pushWith({ enrolled: checked === true })
                          }
                        />

                        <span>{dict?.sidebar_enrolled || "Enrolled Only"}</span>
                      </label>
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            </ButtonGroup>
          </ButtonGroup>
        </div>
      </div>
      {mobileSearchOpen ? (
        <div className="xl:hidden">
          <InputGroup className="w-full">
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
                  } else {
                    setMobileSearchOpen(false);
                  }
                }}
                aria-label={query ? "Clear search" : "Close search"}
                title={query ? "Clear search" : "Close search"}
              >
                <X className="size-4" />
              </button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      ) : null}
    </div>
  );
}
