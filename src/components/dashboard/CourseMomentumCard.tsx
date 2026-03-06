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
    <div className="overflow-hidden rounded-2xl border border-border bg-background flex flex-col h-full shadow-sm">
      <div className="border-b border-border p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 leading-none mb-3">Now</p>
        <div className="space-y-1">
          <p className="text-sm font-bold leading-tight text-foreground line-clamp-2">
            {nextItem ? nextItem.title : "No scheduled work is waiting right now."}
          </p>
          {nextItem && (
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/70">
              {nextItem.meta.split(' · ')[0]} · {nextItem.timeLabel}
            </p>
          )}
        </div>
      </div>

      <div className="grid flex-1 border-b border-border grid-cols-3 divide-x divide-border">
        <div className="flex flex-col items-center justify-center gap-2 p-5 text-center transition-colors hover:bg-muted/5">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 truncate">Today</p>
            <p className="text-xl font-bold text-foreground leading-none mt-1">{routineItems.length}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 p-5 text-center transition-colors hover:bg-muted/5">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 truncate">In Progress</p>
            <p className="text-xl font-bold text-foreground leading-none mt-1">{inProgressCount}</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 p-5 text-center transition-colors hover:bg-muted/5">
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80 truncate">Checked In</p>
            <p className="text-xl font-bold text-foreground leading-none mt-1">{attendedToday}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-5 bg-muted/5">
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
