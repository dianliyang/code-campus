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
  X,
} from "lucide-react";
import { useAppToast } from "@/components/common/AppToastProvider";
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

interface WorkoutListHeaderProps {
  viewMode: "list" | "grid";
  setViewMode: (mode: "list" | "grid") => void;
  dict: Dictionary["dashboard"]["workouts"];
}

export default function WorkoutListHeader({
  viewMode,
  setViewMode,
  dict,
}: WorkoutListHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get("sort") || "title";
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { showToast } = useAppToast();
  const lastPushedQuery = useRef(searchParams.get("q") || "");
  const isComposing = useRef(false);

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

  const refreshList = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/workouts/refresh", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to refresh workouts");
      }
      const count = typeof body?.count === "number" ? body.count : null;
      showToast({
        message:
          count !== null
            ? `Refresh complete: ${count} records synced`
            : "Refresh complete",
        type: "success",
      });
      router.refresh();
    } catch (error) {
      console.error("[WorkoutListHeader] Refresh failed:", error);
      showToast({
        message: error instanceof Error ? error.message : "Refresh failed",
        type: "error",
      });
    } finally {
      setIsRefreshing(false);
    }
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
          <div className="grid grid-cols-2 md:flex items-center gap-2">
            <Button
              variant="outline"
              onClick={refreshList}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" onClick={openFilters}>
              <SlidersHorizontal />
              Filter
            </Button>
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

            <div className="w-full md:min-w-[280px]">
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
                      <X />
                    </button>
                  ) : null}
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
