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
  enrolledCount: number;
  dict: Dictionary['dashboard']['courses'];
}

export default function Sidebar({ universities, fields, enrolledCount, dict }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const selectedUniversities = searchParams.get("universities")?.split(",") || [];
  const selectedFields = searchParams.get("fields")?.split(",") || [];
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
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  const totalFilters = selectedUniversities.length + selectedFields.length + (showEnrolledOnly ? 1 : 0);

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
            <span className="absolute -top-1 -left-1 bg-gray-900 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
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
          <h2 className="text-xl font-black uppercase tracking-tighter text-gray-900">Filters</h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-12">
          {/* Library Section */}
          <div className="space-y-8 md:space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">
                {dict?.sidebar_library || "Personal Library"}
              </h3>
              <Link 
                href="/import" 
                className="w-10 h-10 md:w-6 md:h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-blue hover:border-brand-blue/30 transition-all group/plus"
                title="Import Data"
              >
                <Plus className="w-4 h-4 md:w-2.5 md:h-2.5 group-hover/plus:rotate-90 transition-transform duration-300" />
              </Link>
            </div>
            
            <label className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4 md:gap-3">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                  checked={showEnrolledOnly} 
                  onChange={(e) => updateParams("enrolled", e.target.checked)} 
                />
                <span className={`text-[15px] md:text-[15px] font-bold md:font-normal transition-colors ${showEnrolledOnly ? 'text-brand-blue' : 'text-gray-700 group-hover:text-brand-blue'}`}>
                  {dict?.sidebar_enrolled || "Enrolled Only"}
                </span>
              </div>
              <span className="text-xs font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                {enrolledCount}
              </span>
            </label>
          </div>

          {/* University Section */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-8 md:mb-6">
              {dict?.sidebar_universities || "Universities"}
            </h3>
            <div className="grid grid-cols-1 gap-5 md:block md:space-y-4 max-h-[40vh] md:max-h-64 overflow-y-auto custom-scroll pr-4">
              {universities.map((uni) => (
                <label key={uni.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4 md:gap-3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                      checked={selectedUniversities.includes(uni.name)} 
                      onChange={() => updateParams("universities", handleToggle(selectedUniversities, uni.name))} 
                    />
                    <span className={`text-[15px] md:text-sm font-bold md:font-normal tracking-tight transition-colors ${selectedUniversities.includes(uni.name) ? 'text-brand-blue' : 'text-gray-700 group-hover:text-brand-blue'}`}>
                      {uni.name}
                    </span>
                  </div>
                  <span className={`text-[11px] font-black transition-colors ${selectedUniversities.includes(uni.name) ? 'text-brand-blue' : 'text-gray-400'}`}>
                    {uni.count}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Focus Area Section */}
          <div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-8 md:mb-6">
              {dict?.sidebar_fields || "Focus Area"}
            </h3>
            <div className="grid grid-cols-1 gap-5 md:block md:space-y-4">
              {fields.map((field) => (
                <label key={field.name} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-4 md:gap-3">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 md:w-4 md:h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                      checked={selectedFields.includes(field.name)} 
                      onChange={() => updateParams("fields", handleToggle(selectedFields, field.name))} 
                    />
                    <span className={`text-[15px] md:text-sm font-bold md:font-normal tracking-tight transition-colors ${selectedFields.includes(field.name) ? 'text-brand-blue' : 'text-gray-700 group-hover:text-brand-blue'}`}>
                      {field.name}
                    </span>
                  </div>
                  <span className={`text-[11px] font-black transition-colors ${selectedFields.includes(field.name) ? 'text-brand-blue' : 'text-gray-400'}`}>
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