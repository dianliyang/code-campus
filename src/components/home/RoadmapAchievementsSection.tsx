"use client";

import { useEffect, useMemo } from "react";
import AchievementCard from "@/components/home/AchievementCard";
import { useRoadmapStore } from "@/store/useRoadmapStore";

interface CompletedCourse {
  id: number;
  title: string;
  courseCode: string;
  university: string;
  credit?: number;
  gpa?: number;
  score?: number;
  attendance?: { attended: number; total: number };
  semesters: string[];
  updated_at: string;
}

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
  emptyText,
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
    <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-3 sm:p-4">
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-base font-semibold text-[#1f1f1f]">{title}</h3>

        {availableSemesters.length > 0 && (
          <div className="relative min-w-[180px]">
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="h-8 w-full appearance-none rounded-md border border-[#d3d3d3] bg-white px-3 text-[13px] text-[#3b3b3b] outline-none transition-colors hover:bg-[#f8f8f8] focus:border-[#c8c8c8]"
            >
              <option value="all">All Semesters</option>
              {availableSemesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredAchievements.length > 0 ? (
          filteredAchievements.map((course) => (
            <AchievementCard key={course.id} course={course} completionDate={course.updated_at} />
          ))
        ) : (
          <p className="text-sm text-[#8a8a8a]">{emptyText}</p>
        )}
      </div>
    </section>
  );
}
