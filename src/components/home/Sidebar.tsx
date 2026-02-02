"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { University, Field } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { Plus } from "lucide-react";

interface SidebarProps {
  universities: University[];
  fields: Field[];
  enrolledCount: number;
  dict: Dictionary['dashboard']['courses'];
}

export default function Sidebar({ universities, fields, enrolledCount, dict }: SidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <div className="sticky top-24 space-y-12">
        {/* Library Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-[0.3em]">
              {dict?.sidebar_library || "Personal Library"}
            </h3>
            <Link 
              href="/import" 
              className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-blue hover:border-brand-blue/30 transition-all group/plus"
              title="Import Data"
            >
              <Plus className="w-2.5 h-2.5 group-hover/plus:rotate-90 transition-transform duration-300" />
            </Link>
          </div>
          
          <label className="flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                checked={showEnrolledOnly} 
                onChange={(e) => updateParams("enrolled", e.target.checked)} 
              />
              <span className={`text-[15px] transition-colors ${showEnrolledOnly ? 'text-brand-blue' : 'text-gray-700 group-hover:text-brand-blue'}`}>
                {dict?.sidebar_enrolled || "Enrolled Only"}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
              {enrolledCount}
            </span>
          </label>
        </div>

        {/* University Section */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-[0.3em] mb-6">
            {dict?.sidebar_universities || "Universities"}
          </h3>
          <div className="space-y-4 max-h-64 overflow-y-auto custom-scroll pr-4">
            {universities.map((uni) => (
              <label key={uni.name} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                    checked={selectedUniversities.includes(uni.name)} 
                    onChange={() => updateParams("universities", handleToggle(selectedUniversities, uni.name))} 
                  />
                  <span className={`text-sm tracking-tight transition-colors ${selectedUniversities.includes(uni.name) ? 'text-brand-blue' : 'text-gray-700 group-hover:text-brand-blue'}`}>
                    {uni.name}
                  </span>
                </div>
                <span className={`text-[11px] font-medium transition-colors ${selectedUniversities.includes(uni.name) ? 'text-brand-blue' : 'text-gray-400'}`}>
                  {uni.count}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Focus Area Section */}
        <div>
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-[0.3em] mb-6">
            {dict?.sidebar_fields || "Focus Area"}
          </h3>
          <div className="space-y-4">
            {fields.map((field) => (
              <label key={field.name} className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-200 text-brand-blue focus:ring-brand-blue/20 cursor-pointer" 
                    checked={selectedFields.includes(field.name)} 
                    onChange={() => updateParams("fields", handleToggle(selectedFields, field.name))} 
                  />
                  <span className={`text-sm tracking-tight transition-colors ${selectedFields.includes(field.name) ? 'text-brand-blue' : 'text-gray-700 group-hover:text-brand-blue'}`}>
                    {field.name}
                  </span>
                </div>
                <span className={`text-[11px] font-medium transition-colors ${selectedFields.includes(field.name) ? 'text-brand-blue' : 'text-gray-400'}`}>
                  {field.count}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}