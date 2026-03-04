"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FilterOption {
  name: string;
  count: number;
}

interface WorkoutSidebarProps {
  categories: FilterOption[];
  statuses: FilterOption[];
  dict: Dictionary["dashboard"]["workouts"];
}

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INITIAL_CATEGORY_LIMIT = 8;

export default function WorkoutSidebar({
  categories,
  statuses,
  dict,
}: WorkoutSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const filtersOpen = searchParams.get("filters") === "open";

  const selectedCategories =
    searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const selectedDays =
    searchParams.get("days")?.split(",").filter(Boolean) || [];
  const selectedStatuses =
    searchParams.get("status")?.split(",").filter(Boolean) || [];

  const updateParams = (key: string, value: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.length > 0) params.set(key, value.join(","));
    else params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleToggle = (list: string[], item: string) => {
    return list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item];
  };

  const displayedCategories = isExpanded
    ? categories
    : categories.slice(0, INITIAL_CATEGORY_LIMIT);
  const totalFilters =
    selectedCategories.length + selectedDays.length + selectedStatuses.length;

  const closeDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filters");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (!filtersOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <Button
        variant="outline"
        onClick={closeDrawer}
        aria-label="Close filters"
      />

      <aside className="absolute inset-0 overflow-y-auto bg-white px-4 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] shadow-xl animate-[fadeUp_220ms_ease-out] md:inset-y-0 md:right-0 md:left-auto md:w-[320px] md:max-h-none md: md:border-l md:border-slate-200 md:animate-[fadeIn_180ms_ease-out] md:py-4">
        <div className="md:hidden flex justify-center mb-5">
          <div className="w-12 h-1.5 bg-gray-100" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold tracking-tight text-slate-900">
            Filters
          </h2>
          <Button variant="outline" size="icon" onClick={closeDrawer}>
            <X />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                Filters
              </h3>
              <span className="text-[12px] text-slate-400">{totalFilters}</span>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {dict?.sidebar_categories || "Category"}
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {displayedCategories.map((cat) => (
                <label
                  key={cat.name}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.name)}
                      onChange={() =>
                        updateParams(
                          "categories",
                          handleToggle(selectedCategories, cat.name),
                        )
                      }
                    />

                    <span
                      className={`text-[13px] font-medium tracking-tight transition-colors ${selectedCategories.includes(cat.name) ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}
                    >
                      {cat.name}
                    </span>
                  </div>
                  <span
                    className={`text-[12px] font-medium transition-colors ${selectedCategories.includes(cat.name) ? "text-brand-blue" : "text-gray-300"}`}
                  >
                    {cat.count}
                  </span>
                </label>
              ))}

              {categories.length > INITIAL_CATEGORY_LIMIT ? (
                <Button
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp />
                    </>
                  ) : (
                    <>
                      Show all ({categories.length}) <ChevronDown />
                    </>
                  )}
                </Button>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {dict?.sidebar_days || "Day of Week"}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {DAY_OPTIONS.map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-3 group cursor-pointer"
                >
                  <Input
                    type="checkbox"
                    checked={selectedDays.includes(day)}
                    onChange={() =>
                      updateParams("days", handleToggle(selectedDays, day))
                    }
                  />

                  <span
                    className={`text-[13px] font-medium tracking-tight transition-colors ${selectedDays.includes(day) ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}
                  >
                    {day}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {dict?.sidebar_status || "Status"}
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {statuses.map((s) => {
                const statusMap: Record<
                  string,
                  keyof Dictionary["dashboard"]["workouts"]
                > = {
                  available: "status_available",
                  fully_booked: "status_full",
                  expired: "status_expired",
                  waitlist: "status_waitlist",
                  cancelled: "status_cancelled",
                  see_text: "status_details",
                };
                const key = statusMap[s.name];
                const label = key && dict[key] ? String(dict[key]) : s.name;

                return (
                  <label
                    key={s.name}
                    className="flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Input
                        type="checkbox"
                        checked={selectedStatuses.includes(s.name)}
                        onChange={() =>
                          updateParams(
                            "status",
                            handleToggle(selectedStatuses, s.name),
                          )
                        }
                      />

                      <span
                        className={`text-[13px] font-medium tracking-tight transition-colors ${selectedStatuses.includes(s.name) ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}
                      >
                        {label}
                      </span>
                    </div>
                    <span
                      className={`text-[12px] font-medium transition-colors ${selectedStatuses.includes(s.name) ? "text-brand-blue" : "text-gray-300"}`}
                    >
                      {s.count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
