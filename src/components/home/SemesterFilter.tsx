"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronDown } from "lucide-react";

interface SemesterFilterProps {
  availableSemesters: string[];
  selectedSemester: string;
}

export default function SemesterFilter({ availableSemesters, selectedSemester }: SemesterFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("semester");
    } else {
      params.set("semester", value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="relative min-w-[180px]">
      <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none">
        <CalendarDays className="w-3.5 h-3.5 text-[#8a8a8a]" />
      </div>
      <select
        value={selectedSemester}
        onChange={(e) => handleChange(e.target.value)}
        className="h-8 w-full appearance-none rounded-md border border-[#d3d3d3] bg-white pl-8 pr-8 text-[13px] text-[#3b3b3b] outline-none transition-colors hover:bg-[#f8f8f8] focus:border-[#c8c8c8]"
      >
        <option value="all">All Semesters</option>
        {availableSemesters.map((sem) => (
          <option key={sem} value={sem}>
            {sem}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
        <ChevronDown className="w-3.5 h-3.5 text-[#8a8a8a]" />
      </div>
    </div>
  );
}
