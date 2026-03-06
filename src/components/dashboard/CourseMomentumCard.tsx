"use client";

import { Activity, CalendarClock, Dumbbell } from "lucide-react";
import type { OverviewRoutineItem } from "@/lib/overview-routine";

interface CourseMomentumCardProps {
  routineItems: OverviewRoutineItem[];
  inProgressCount: number;
  attendedToday: number;
}

export default function CourseMomentumCard({
  routineItems,
  inProgressCount,
  attendedToday
}: CourseMomentumCardProps) {
  // Find the "Now" item: either something happening now or the next upcoming item
  const now = new Date();
  const currentHourMin = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  
  const upcomingItem = routineItems.find(item => item.startsAtSort >= currentHourMin && !item.isDone);
  const nextItem = upcomingItem || routineItems[0];

  const studyCount = routineItems.filter((item) => item.sourceType === "study_plan").length;
  const workoutCount = routineItems.filter((item) => item.sourceType === "workout").length;
  const assignmentCount = routineItems.filter((item) => item.sourceType === "assignment").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background flex flex-col h-full">
      <div className="border-b border-border p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Now</p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-foreground line-clamp-2">
          {nextItem
            ? `Start with ${nextItem.title} at ${nextItem.timeLabel}.`
            : "No scheduled work is waiting right now."}
        </p>
      </div>

      <div className="grid flex-1 border-b border-border grid-cols-3 divide-x divide-border">
        <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground truncate">Today</p>
            <p className="text-xl font-bold text-foreground leading-none mt-0.5">{routineItems.length}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground truncate">In Progress</p>
            <p className="text-xl font-bold text-foreground leading-none mt-0.5">{inProgressCount}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 p-4 text-center">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground truncate">Checked In</p>
            <p className="text-xl font-bold text-foreground leading-none mt-0.5">{attendedToday}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/5">
        {studyCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
            {studyCount} study
          </span>
        )}
        {workoutCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
            {workoutCount} workouts
          </span>
        )}
        {assignmentCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
            {assignmentCount} due
          </span>
        )}
        {studyCount === 0 && workoutCount === 0 && assignmentCount === 0 && (
          <span className="text-[10px] text-muted-foreground italic">Clean slate today</span>
        )}
      </div>
    </div>
  );
}
