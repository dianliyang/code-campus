"use client";

import { useEffect, useMemo } from "react";
import AchievementCard from "@/components/home/AchievementCard";
import { useRoadmapStore } from "@/store/useRoadmapStore";
import { Course } from "@/types";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

type CompletedCourse = Course & {
  gpa?: number;
  score?: number;
  attendance?: {attended: number;total: number;};
  updated_at: string;
};

interface RoadmapAchievementsSectionProps {
  availableSemesters: string[];
  completed: CompletedCourse[];
  title: string;
  emptyText: string;
}

export default function RoadmapAchievementsSection({
  availableSemesters,
  completed,
  title,
  emptyText
}: RoadmapAchievementsSectionProps) {
  const selectedSemester = useRoadmapStore((s) => s.selectedSemester);
  const setSelectedSemester = useRoadmapStore((s) => s.setSelectedSemester);

  useEffect(() => {
    if (selectedSemester === "all") return;
    if (!availableSemesters.includes(selectedSemester)) {
      setSelectedSemester("all");
    }
  }, [availableSemesters, selectedSemester, setSelectedSemester]);

  const filteredAchievements = useMemo(() => {
    if (selectedSemester === "all") return completed;
    return completed.filter((c) => c.semesters.includes(selectedSemester));
  }, [completed, selectedSemester]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-base font-semibold text-[#1f1f1f]">{title}</h3>

        {availableSemesters.length > 0 &&
        <div className="relative ml-auto min-w-[180px]">
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Semesters</SelectLabel>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {availableSemesters.map((sem) =>
                <SelectItem key={sem} value={sem}>
                      {sem}
                    </SelectItem>
                )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        }
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-1.5">
        {filteredAchievements.length > 0 ?
        filteredAchievements.map((course) =>
        <AchievementCard key={course.id} course={course} completionDate={course.updated_at} />
        ) :

        <p className="text-sm text-[#8a8a8a]">{emptyText}</p>
        }
      </div>
    </div>);

}
