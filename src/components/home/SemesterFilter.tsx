"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      <Select value={selectedSemester} onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Semesters</SelectLabel>
            <SelectItem value="all">All Semesters</SelectItem>
            {availableSemesters.map((sem) => (
              <SelectItem key={sem} value={sem}>
                {sem}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
