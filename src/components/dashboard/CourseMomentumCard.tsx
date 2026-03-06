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

      <div className="flex flex-1 border-b border-border p-5 items-end justify-between gap-4">
        <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
          <div className="w-full relative flex flex-col items-center justify-end h-24">
            <div 
              className="w-full max-w-[40px] rounded-t-sm bg-stone-100 transition-colors group-hover:bg-stone-200" 
              style={{ height: `${Math.min(100, (routineItems.length / 15) * 100)}%` }}
            />
            <p className="absolute bottom-2 text-lg font-bold text-stone-900">{routineItems.length}</p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">Today</p>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
          <div className="w-full relative flex flex-col items-center justify-end h-24">
            <div 
              className="w-full max-w-[40px] rounded-t-sm bg-blue-50 transition-colors group-hover:bg-blue-100" 
              style={{ height: `${Math.min(100, (inProgressCount / 15) * 100)}%` }}
            />
            <p className="absolute bottom-2 text-lg font-bold text-blue-900">{inProgressCount}</p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80">In Progress</p>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2 group cursor-default">
          <div className="w-full relative flex flex-col items-center justify-end h-24">
            <div 
              className="w-full max-w-[40px] rounded-t-sm bg-emerald-50 transition-colors group-hover:bg-emerald-100" 
              style={{ height: `${Math.min(100, (attendedToday / 15) * 100 || 5)}%` }}
            />
            <p className="absolute bottom-2 text-lg font-bold text-emerald-900">{attendedToday}</p>
          </div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 whitespace-nowrap">Checked In</p>
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
