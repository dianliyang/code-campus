"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";

interface FilterOption {
  name: string;
  count: number;
}

interface WorkoutSidebarProps {
  categories: FilterOption[];
  statuses: FilterOption[];
  dict: Dictionary['dashboard']['workouts'];
}

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INITIAL_CATEGORY_LIMIT = 8;

export default function WorkoutSidebar({ categories, statuses, dict }: WorkoutSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  const displayedCategories = isExpanded ? categories : categories.slice(0, INITIAL_CATEGORY_LIMIT);
  const totalFilters = selectedCategories.length + selectedDays.length + selectedStatuses.length;

  return (
    <>
      {/* Mobile Fixed Toggle Button (Floating Right) */}
      <div className="md:hidden fixed bottom-24 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="relative flex items-center justify-center w-14 h-14 bg-white text-gray-900 rounded-full shadow-2xl active:scale-90 transition-all border border-gray-200 group"
        >
          <Filter className="w-5 h-5 group-hover:scale-110 transition-transform" />
          {totalFilters > 0 && (
            <span className="absolute -top-1 -left-1 bg-gray-900 text-white text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
              {totalFilters}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Drawer Content */}
      <aside className={`
        fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-[2.5rem] p-8 pb-12 transition-transform duration-500 ease-out md:static md:z-0 md:bg-transparent md:rounded-none md:p-0 md:translate-y-0 md:block md:w-64 md:flex-shrink-0
        ${isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        max-h-[85vh] overflow-y-auto custom-scroll
      `}>
        {/* Drawer Handle (Mobile Only) */}
        <div className="md:hidden flex justify-center mb-8">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full" />
        </div>

        <div className="flex items-center justify-between md:hidden mb-10">
          <h2 className="text-xl font-semibold uppercase tracking-tighter text-gray-900">Filters</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-12">
          {/* Category Section */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              {dict?.sidebar_categories || "Category"}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:gap-2.5">
              {displayedCategories.map((cat) => (
                <label key={cat.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                      checked={selectedCategories.includes(cat.name)}
                      onChange={() => updateParams("categories", handleToggle(selectedCategories, cat.name))}
                    />
                    <span className={`text-[13px] md:text-[12px] font-semibold tracking-tight transition-colors ${selectedCategories.includes(cat.name) ? 'text-brand-blue' : 'text-gray-600 group-hover:text-brand-blue'}`}>
                      {cat.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black transition-colors ${selectedCategories.includes(cat.name) ? 'text-brand-blue' : 'text-gray-300'}`}>
                    {cat.count}
                  </span>
                </label>
              ))}
              
              {categories.length > INITIAL_CATEGORY_LIMIT && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-brand-blue hover:text-blue-700 transition-colors pt-4 md:pt-2"
                >
                  {isExpanded ? (
                    <>Show Less <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Show All ({categories.length}) <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Day of Week Section */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              {dict?.sidebar_days || "Day of Week"}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-2.5">
              {DAY_OPTIONS.map((day) => (
                <label key={day} className="flex items-center gap-3 group cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                    checked={selectedDays.includes(day)}
                    onChange={() => updateParams("days", handleToggle(selectedDays, day))}
                  />
                  <span className={`text-[13px] md:text-[12px] font-semibold tracking-tight transition-colors ${selectedDays.includes(day) ? 'text-brand-blue' : 'text-gray-600 group-hover:text-brand-blue'}`}>
                    {day}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Booking Status Section */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              {dict?.sidebar_status || "Status"}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:gap-2.5">
              {statuses.map((s) => {
                const statusKey = Object.entries({
                  available: "status_available",
                  fully_booked: "status_full",
                  expired: "status_expired",
                  waitlist: "status_waitlist",
                  cancelled: "status_cancelled",
                  see_text: "status_details",
                }).find(([val]) => val === s.name)?.[1] as keyof Dictionary['dashboard']['workouts'];
                
                const label = statusKey && dict[statusKey] ? String(dict[statusKey]) : s.name;

                return (
                  <label key={s.name} className="flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
                        checked={selectedStatuses.includes(s.name)}
                        onChange={() => updateParams("status", handleToggle(selectedStatuses, s.name))}
                      />
                      <span className={`text-[13px] md:text-[12px] font-semibold tracking-tight transition-colors ${selectedStatuses.includes(s.name) ? 'text-brand-blue' : 'text-gray-600 group-hover:text-brand-blue'}`}>
                        {label}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black transition-colors ${selectedStatuses.includes(s.name) ? 'text-brand-blue' : 'text-gray-300'}`}>
                      {s.count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
