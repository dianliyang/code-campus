"use client";

import { cn } from "@/lib/utils";
import type { OverviewRoutineItem } from "@/lib/overview-routine";

interface CourseMomentumCardProps {
  routineItems: OverviewRoutineItem[];
  inProgressCount: number;
  attendedToday: number;
}

function MomentumBar({ label, count, colorClass, activeColorClass, max = 15 }: { label: string, count: number, colorClass: string, activeColorClass: string, max?: number }) {
  const squares = Array.from({ length: 10 });
  const activeCount = Math.min(10, Math.ceil((count / max) * 10));

  return (
    <div className="flex-1 flex flex-col items-center gap-3 group cursor-default">
      <div className="w-full flex flex-col-reverse items-center gap-1 h-28 justify-start">
        {squares.map((_, i) => (
          <div 
            key={i}
            className={cn(
              "w-full max-w-[32px] h-1.5 rounded-[1px] transition-all duration-300",
              i < activeCount ? activeColorClass : colorClass
            )}
            style={{ transitionDelay: `${i * 30}ms` }}
          />
        ))}
      </div>
      <div className="text-center space-y-1">
        <p className="text-xl font-bold text-foreground leading-none">{count}</p>
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/80 whitespace-nowrap">{label}</p>
      </div>
    </div>
  );
}

export default function CourseMomentumCard({
  routineItems,
  studyDoneToday = 0,
  attendedToday
}: CourseMomentumCardProps & { studyDoneToday?: number }) {
  // Find the "Now" item: either something happening now or the next upcoming item
  const now = new Date();
  const currentHourMin = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
  
  const upcomingItem = routineItems.find(item => item.startsAtSort >= currentHourMin && !item.isDone);
  const nextItem = upcomingItem || routineItems.find(item => !item.isDone) || routineItems[0];

  const studyItems = routineItems.filter((item) => item.sourceType === "study_plan" || item.sourceType === "assignment");
  const studyCount = studyItems.length;
  
  const workoutCount = routineItems.filter((item) => item.sourceType === "workout").length;
  const assignmentCount = routineItems.filter((item) => item.sourceType === "assignment").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background flex flex-col h-full shadow-sm">
      <div className="border-b border-border p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80 leading-none mb-3">Now</p>
        <div className="space-y-1">
          <p className="text-sm font-medium tracking-tight text-foreground line-clamp-2">
            {nextItem ? nextItem.title : "No scheduled work is waiting right now."}
          </p>
          {nextItem && (
            <p className="text-[10px] font-medium text-muted-foreground/70">
              {nextItem.meta.split(' · ')[0]} · {nextItem.timeLabel}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 border-b border-border p-5 items-end justify-between gap-4">
        <MomentumBar 
          label="Routine" 
          count={routineItems.length} 
          colorClass="bg-stone-100" 
          activeColorClass="bg-stone-900" 
        />
        <MomentumBar 
          label="Completed" 
          count={studyDoneToday} 
          max={Math.max(studyCount, 1)}
          colorClass="bg-blue-50" 
          activeColorClass="bg-blue-600" 
        />
        <MomentumBar 
          label="Attended" 
          count={attendedToday} 
          max={Math.max(workoutCount, 1)}
          colorClass="bg-emerald-50" 
          activeColorClass="bg-emerald-600" 
        />
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
