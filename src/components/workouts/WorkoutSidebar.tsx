"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/dictionary";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface FilterOption {
  name: string;
  count: number;
}

interface WorkoutSidebarProps {
  providers: FilterOption[];
  statuses: FilterOption[];
  dict: Dictionary["dashboard"]["workouts"];
}

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WorkoutSidebar({
  providers,
  statuses,
  dict,
}: WorkoutSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filtersOpen = searchParams.get("filters") === "open";

  const selectedProvider = searchParams.get("provider") || "";
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

  const updateSingleParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleToggle = (list: string[], item: string) => {
    return list.includes(item)
      ? list.filter((i) => i !== item)
      : [...list, item];
  };

  const totalFilters =
    (selectedProvider ? 1 : 0) + selectedDays.length + selectedStatuses.length;

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
              Provider
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {providers.map((provider) => (
                <label
                  key={provider.name}
                  className="flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedProvider === provider.name}
                      onCheckedChange={() =>
                        updateSingleParam(
                          "provider",
                          selectedProvider === provider.name ? "" : provider.name,
                        )
                      }
                    />

                    <span
                      className={`text-[13px] font-medium tracking-tight transition-colors ${selectedProvider === provider.name ? "text-slate-900" : "text-slate-600 group-hover:text-slate-900"}`}
                    >
                      {provider.name}
                    </span>
                  </div>
                  <span
                    className={`text-[12px] font-medium transition-colors ${selectedProvider === provider.name ? "text-brand-blue" : "text-gray-300"}`}
                  >
                    {provider.count}
                  </span>
                </label>
              ))}
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
                  <Checkbox
                    checked={selectedDays.includes(day)}
                    onCheckedChange={() =>
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
                const statusMap: Record<string, string> = {
                  available: "status_available",
                  fully_booked: "status_full",
                  expired: "status_expired",
                  waitlist: "status_waitlist",
                  cancelled: "status_cancelled",
                  see_text: "status_details",
                  scheduled: "status_scheduled",
                  tbd: "status_tbd",
                };
                const key = statusMap[s.name];
                const label = key && key in dict
                  ? String(dict[key as keyof Dictionary["dashboard"]["workouts"]])
                  : s.name === "scheduled"
                    ? "Scheduled"
                    : s.name === "tbd"
                      ? "TBD"
                      : s.name;

                return (
                  <label
                    key={s.name}
                    className="flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedStatuses.includes(s.name)}
                        onCheckedChange={() =>
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
