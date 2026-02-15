"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { University, Field } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { Plus, Filter, X } from "lucide-react";

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
  const [isOpen, setIsOpen] = useState(false);

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
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleToggle = (list: string[], item: string) => {
    const trimmedList = list.filter(Boolean);
    return trimmedList.includes(item) ? trimmedList.filter(i => i !== item) : [...trimmedList, item];
  };

  const totalFilters = selectedUniversities.length + selectedFields.length + selectedSemesters.length + (showEnrolledOnly ? 1 : 0);

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
          {/* Library Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                {dict?.sidebar_library || "Personal Library"}
              </h3>
              <Link 
                href="/import" 
                className="text-gray-400 hover:text-brand-blue transition-colors group/plus"
                title="Import Data"
              >
                <Plus className="w-3.5 h-3.5 group-hover/plus:rotate-90 transition-transform duration-300" />
              </Link>
            </div>
            
            <label className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                  checked={showEnrolledOnly} 
                  onChange={(e) => updateParams("enrolled", e.target.checked)} 
                />
                <span className={`text-[13px] md:text-[12px] font-semibold tracking-tight transition-colors ${showEnrolledOnly ? 'text-brand-blue' : 'text-gray-600 group-hover:text-brand-blue'}`}>
                  {dict?.sidebar_enrolled || "Enrolled Only"}
                </span>
              </div>
              <span className={`text-[10px] font-black transition-colors ${showEnrolledOnly ? 'text-brand-blue' : 'text-gray-300'}`}>
                {enrolledCount}
              </span>
            </label>
          </div>

          {/* Eras / Semesters Section */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              Eras / Semesters
            </h3>
            <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto custom-scroll pr-2">
              {semesters.map((sem) => (
                <label key={sem} className="flex items-center gap-3 group cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 md:w-3.5 md:h-3.5 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                    checked={selectedSemesters.includes(sem)} 
                    onChange={() => updateParams("semesters", handleToggle(selectedSemesters, sem))} 
                  />
                  <span className={`text-[13px] md:text-[12px] font-semibold tracking-tight transition-colors ${selectedSemesters.includes(sem) ? 'text-brand-blue' : 'text-gray-600 group-hover:text-brand-blue'}`}>
                    {sem}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* University Section */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
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
                    <span className={`text-[13px] md:text-[12px] font-semibold tracking-tight transition-colors ${selectedUniversities.includes(uni.name) ? 'text-brand-blue' : 'text-gray-600 group-hover:text-brand-blue'}`}>
                      {uni.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black transition-colors ${selectedUniversities.includes(uni.name) ? 'text-brand-blue' : 'text-gray-300'}`}>
                    {uni.count}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Focus Area Section */}
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
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
                    <span className={`text-[13px] md:text-[12px] font-semibold tracking-tight transition-colors ${selectedFields.includes(field.name) ? 'text-brand-blue' : 'text-gray-600 group-hover:text-brand-blue'}`}>
                      {field.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black transition-colors ${selectedFields.includes(field.name) ? 'text-brand-blue' : 'text-gray-300'}`}>
                    {field.count}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
