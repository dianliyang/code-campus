"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { ChevronDown, ChevronUp, X } from "lucide-react";

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

export default function WorkoutSidebar({ categories, statuses, dict }: WorkoutSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const filtersOpen = searchParams.get("filters") === "open";

  const selectedCategories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const selectedDays = searchParams.get("days")?.split(",").filter(Boolean) || [];
  const selectedStatuses = searchParams.get("status")?.split(",").filter(Boolean) || [];

  const updateParams = (key: string, value: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value.length > 0) params.set(key, value.join(","));
    else params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleToggle = (list: string[], item: string) => {
    return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
  };

  const displayedCategories = isExpanded ? categories : categories.slice(0, INITIAL_CATEGORY_LIMIT);
  const totalFilters = selectedCategories.length + selectedDays.length + selectedStatuses.length;

  const closeDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("filters");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  if (!filtersOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        onClick={closeDrawer}
        aria-label="Close filters"
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px] animate-[fadeIn_180ms_ease-out]"
      />

      <aside className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white px-4 pt-4 pb-0 shadow-xl animate-[fadeUp_220ms_ease-out] md:inset-y-0 md:right-0 md:left-auto md:w-[320px] md:max-h-none md:rounded-none md:border-l md:border-slate-200 md:animate-[fadeIn_180ms_ease-out] md:py-4">
        <div className="md:hidden flex justify-center mb-5">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[14px] font-semibold tracking-tight text-slate-900">Filters</h2>
          <button
            onClick={closeDrawer}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Filters</h3>
              <span className="text-[12px] text-slate-400">{totalFilters}</span>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {dict?.sidebar_categories || "Category"}
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {displayedCategories.map((cat) => (
                <label key={cat.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                      checked={selectedCategories.includes(cat.name)}
                      onChange={() => updateParams("categories", handleToggle(selectedCategories, cat.name))}
                    />
                    <span className={`text-[13px] font-medium tracking-tight transition-colors ${selectedCategories.includes(cat.name) ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}>
                      {cat.name}
                    </span>
                  </div>
                  <span className={`text-[12px] font-medium transition-colors ${selectedCategories.includes(cat.name) ? "text-brand-blue" : "text-gray-300"}`}>
                    {cat.count}
                  </span>
                </label>
              ))}

              {categories.length > INITIAL_CATEGORY_LIMIT ? (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 text-[12px] font-medium text-slate-600 hover:text-slate-900 transition-colors pt-1"
                >
                  {isExpanded ? (
                    <>
                      Show less <ChevronUp className="w-3 h-3" />
                    </>
                  ) : (
                    <>
                      Show all ({categories.length}) <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {dict?.sidebar_days || "Day of Week"}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {DAY_OPTIONS.map((day) => (
                <label key={day} className="flex items-center gap-3 group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                    checked={selectedDays.includes(day)}
                    onChange={() => updateParams("days", handleToggle(selectedDays, day))}
                  />
                  <span className={`text-[13px] font-medium tracking-tight transition-colors ${selectedDays.includes(day) ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}>
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
                const statusMap: Record<string, keyof Dictionary["dashboard"]["workouts"]> = {
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
                  <label key={s.name} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                        checked={selectedStatuses.includes(s.name)}
                        onChange={() => updateParams("status", handleToggle(selectedStatuses, s.name))}
                      />
                      <span className={`text-[13px] font-medium tracking-tight transition-colors ${selectedStatuses.includes(s.name) ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}>
                        {label}
                      </span>
                    </div>
                    <span className={`text-[12px] font-medium transition-colors ${selectedStatuses.includes(s.name) ? "text-brand-blue" : "text-gray-300"}`}>
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
