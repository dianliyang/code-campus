"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { University, Field } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { X } from "lucide-react";

interface SidebarProps {
  universities: University[];
  fields: Field[];
  semesters: string[];
  enrolledCount: number;
  dict: Dictionary['dashboard']['courses'];
}

export default function Sidebar({ universities, fields, semesters, enrolledCount, dict }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedUniversities = searchParams.get("universities")?.split(",").filter(Boolean) || [];
  const selectedFields = searchParams.get("fields")?.split(",").filter(Boolean) || [];
  const selectedSemesters = searchParams.get("semesters")?.split(",").filter(Boolean) || [];
  const showEnrolledOnly = searchParams.get("enrolled") === "true";

  const updateParams = (key: string, value: string | string[] | boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
      else params.delete(key);
    } else if (typeof value === "boolean") {
      if (value) params.set(key, "true");
      else params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleToggle = (list: string[], item: string) => {
    const trimmedList = list.filter(Boolean);
    return trimmedList.includes(item) ? trimmedList.filter(i => i !== item) : [...trimmedList, item];
  };

  const totalFilters = selectedUniversities.length + selectedFields.length + selectedSemesters.length + (showEnrolledOnly ? 1 : 0);

  const closeDrawer = () => {
    setFiltersOpen(false);
  };

  useEffect(() => {
    const openHandler = () => setFiltersOpen(true);
    const closeHandler = () => setFiltersOpen(false);
    window.addEventListener("course-filters:open", openHandler);
    window.addEventListener("course-filters:close", closeHandler);
    return () => {
      window.removeEventListener("course-filters:open", openHandler);
      window.removeEventListener("course-filters:close", closeHandler);
    };
  }, []);

  if (!filtersOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70]">
      <button
        onClick={closeDrawer}
        aria-label="Close filters"
        className="absolute inset-0 bg-black/25 backdrop-blur-[1px]"
      />

      <aside className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white px-4 py-4 shadow-xl md:inset-y-0 md:right-0 md:left-auto md:w-[320px] md:max-h-none md:rounded-none md:border-l md:border-slate-200">
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
          {/* Enrollment Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Filters</h3>
              <span className="text-[12px] text-slate-400">{totalFilters}</span>
            </div>
            <label className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                  checked={showEnrolledOnly} 
                  onChange={(e) => updateParams("enrolled", e.target.checked)} 
                />
                    <span className={`text-[13px] font-medium tracking-tight transition-colors ${showEnrolledOnly ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                  {dict?.sidebar_enrolled || "Enrolled Only"}
                </span>
              </div>
              <span className={`text-[12px] font-medium transition-colors ${showEnrolledOnly ? 'text-brand-blue' : 'text-gray-300'}`}>
                {enrolledCount}
              </span>
            </label>
          </div>

          {/* Eras / Semesters Section */}
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Eras / Semesters
            </h3>
            <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto custom-scroll pr-2">
              {semesters.slice(0, 4).map((sem) => (
                <label key={sem} className="flex items-center gap-3 group cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                    checked={selectedSemesters.includes(sem)} 
                    onChange={() => updateParams("semesters", handleToggle(selectedSemesters, sem))} 
                  />
                    <span className={`text-[13px] font-medium tracking-tight transition-colors ${selectedSemesters.includes(sem) ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                    {sem}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* University Section */}
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {dict?.sidebar_universities || "Universities"}
            </h3>
            <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto custom-scroll pr-2">
              {universities.map((uni) => (
                <label key={uni.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                      checked={selectedUniversities.includes(uni.name)} 
                      onChange={() => updateParams("universities", handleToggle(selectedUniversities, uni.name))} 
                    />
                    <span className={`text-[13px] font-medium tracking-tight transition-colors ${selectedUniversities.includes(uni.name) ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                      {uni.name}
                    </span>
                  </div>
                  <span className={`text-[12px] font-medium transition-colors ${selectedUniversities.includes(uni.name) ? 'text-brand-blue' : 'text-gray-300'}`}>
                    {uni.count}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Focus Area Section */}
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
              {dict?.sidebar_fields || "Focus Area"}
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {fields.map((field) => (
                <label key={field.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                      checked={selectedFields.includes(field.name)} 
                      onChange={() => updateParams("fields", handleToggle(selectedFields, field.name))} 
                    />
                    <span className={`text-[13px] font-medium tracking-tight transition-colors ${selectedFields.includes(field.name) ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
                      {field.name}
                    </span>
                  </div>
                  <span className={`text-[12px] font-medium transition-colors ${selectedFields.includes(field.name) ? 'text-brand-blue' : 'text-gray-300'}`}>
                    {field.count}
                  </span>
                </label>
              ))}
            </div>
          </div>
          </div>
        </aside>
      </div>
    </>
  );
}
