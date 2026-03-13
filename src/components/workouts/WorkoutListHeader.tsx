"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import {
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ArrowDownWideNarrow,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Badge } from "@/components/ui/badge";

interface WorkoutListHeaderProps {
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  dict: Dictionary["dashboard"]["workouts"];
  isRefreshing: boolean;
  refreshingCategory: string | null | undefined;
  refreshList: (options?: { sources?: Array<"cau-sport" | "urban-apes"> }) => Promise<void>;
}

const DEFAULT_REFRESH_SOURCES: Array<"cau-sport" | "urban-apes"> = ["cau-sport"];

export default function WorkoutListHeader({
  viewMode,
  setViewMode,
  dict,
  isRefreshing,
  refreshingCategory,
  refreshList,
}: WorkoutListHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sort") || "title";
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const lastPushedQuery = useRef(searchParams.get("q") || "");
  const isComposing = useRef(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isRefreshMenuOpen, setIsRefreshMenuOpen] = useState(false);
  const [refreshSources, setRefreshSources] = useState<Array<"cau-sport" | "urban-apes">>(
    DEFAULT_REFRESH_SOURCES,
  );
  const selectedProvider = searchParams.get("provider") || "";
  const selectedDays = searchParams.get("days")?.split(",").filter(Boolean) || [];
  const selectedStatuses = searchParams.get("status")?.split(",").filter(Boolean) || [];
  const activeFilterCount =
    (selectedProvider ? 1 : 0) + selectedDays.length + selectedStatuses.length;

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const toggleRefreshSource = (source: "cau-sport" | "urban-apes") => {
    setRefreshSources((current) => {
      if (current.includes(source)) {
        const next = current.filter((item) => item !== source);
        return next.length > 0 ? next : DEFAULT_REFRESH_SOURCES;
      }

      return [...current, source];
    });
  };

  const runRefresh = async () => {
    setIsRefreshMenuOpen(false);
    await refreshList({ sources: refreshSources });
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const openFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filters", "open");
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
    if (query === lastPushedQuery.current || isComposing.current) return;

    const timer = setTimeout(() => {
      if (isComposing.current) return;
      const currentUrlQuery = searchParams.get("q") || "";
      if (query === currentUrlQuery) {
        lastPushedQuery.current = query;
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      if (query) params.set("q", query);
      else params.delete("q");
      params.set("page", "1");
      lastPushedQuery.current = query;
      router.push(`?${params.toString()}`, { scroll: false });
    }, 500);

    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0" data-testid="workout-toolbar-leading">
          {!isMobileViewport ? (
            <Tabs
              value={viewMode}
              onValueChange={(value) => setViewMode(value as "list" | "grid")}
              className="shrink-0"
            >
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="list" aria-label="List view" className="flex-1 sm:flex-none">
                  <List className="h-3.5 w-3.5" />
                  List
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="Grid view" className="flex-1 sm:flex-none">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Grid
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}

          {isMobileViewport ? (
            <InputGroup className="w-full" data-testid="workout-mobile-search">
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
                placeholder="Search workouts..."
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
                  <X className="size-4" />
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
                onCompositionStart={() => {
                  isComposing.current = true;
                }}
                onCompositionEnd={(e) => {
                  isComposing.current = false;
                  setQuery(e.currentTarget.value);
                }}
                placeholder="Search workouts..."
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" data-testid="workout-toolbar-trailing">
          {isMobileViewport ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="size-9 p-0"
                  aria-label="Sort"
                  title="Sort"
                >
                  <ArrowDownWideNarrow className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange("title")}>
                  {dict?.sort_title || "Title (A-Z)"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("price")}>
                  {dict?.sort_price || "Price (Low-High)"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("day")}>
                  {dict?.sort_day || "Day of Week"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("newest")}>
                  {dict?.sort_newest || "Newest"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <div className="flex items-center gap-2">
            <DropdownMenu
              open={isRefreshMenuOpen}
              onOpenChange={(open) => {
                setIsRefreshMenuOpen(open);
                if (!open) setRefreshSources(DEFAULT_REFRESH_SOURCES);
              }}
            >
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsRefreshMenuOpen((current) => !current)}
                  disabled={isRefreshing}
                  className={isMobileViewport ? "size-9 p-0" : "flex-1 sm:flex-none"}
                  title="Refresh all workout categories"
                  aria-label="Refresh all workout categories"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshingCategory === null ? "animate-spin" : ""}`}
                  />
                  <span className={isMobileViewport ? "sr-only" : ""}>
                    {isRefreshing && refreshingCategory === null ? "Refreshing..." : "Refresh All"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Providers</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={refreshSources.includes("cau-sport")}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => toggleRefreshSource("cau-sport")}
                >
                  CAU
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={refreshSources.includes("urban-apes")}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={() => toggleRefreshSource("urban-apes")}
                >
                  Urban Apes
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void runRefresh()}>
                  Refresh selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={activeFilterCount > 0 ? "default" : "outline"}
              onClick={openFilters}
              className={isMobileViewport ? "relative size-9 p-0" : "flex-1 sm:flex-none"}
              aria-label="Filter"
              title="Filter"
            >
              <SlidersHorizontal />
              {activeFilterCount > 0 ? (
                isMobileViewport ? (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold leading-none text-white">
                    {activeFilterCount}
                  </span>
                ) : (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1.5">
                    {activeFilterCount}
                  </Badge>
                )
              ) : null}
              <span className={isMobileViewport ? "sr-only" : ""}>
                {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
              </span>
            </Button>
          </div>

          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className={`${isMobileViewport ? "hidden" : "w-full sm:w-[160px]"}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort</SelectLabel>
                <SelectItem value="title">
                  {dict?.sort_title || "Title (A-Z)"}
                </SelectItem>
                <SelectItem value="price">
                  {dict?.sort_price || "Price (Low-High)"}
                </SelectItem>
                <SelectItem value="day">
                  {dict?.sort_day || "Day of Week"}
                </SelectItem>
                <SelectItem value="newest">
                  {dict?.sort_newest || "Newest"}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
