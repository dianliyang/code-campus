"use client";

import { useMemo } from "react";
import { CheckCircle2, Clock, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceLearningChartProps {
  studyLogs: Array<{ log_date: string; is_completed: boolean | null }>;
  workoutLogs: Array<{ log_date: string; is_attended: boolean | null }>;
}

export default function AttendanceLearningChart({ studyLogs, workoutLogs }: AttendanceLearningChartProps) {
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
  }, []);

  const data = useMemo(() => {
    return last7Days.map((date) => {
      const studyCount = studyLogs.filter((l) => l.log_date === date && l.is_completed).length;
      const workoutCount = workoutLogs.filter((l) => l.log_date === date && l.is_attended).length;
      return {
        date,
        dayLabel: new Date(date).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
        studyCount,
        workoutCount,
      };
    });
  }, [last7Days, studyLogs, workoutLogs]);

  const maxVal = Math.max(1, ...data.map((d) => d.studyCount + d.workoutCount));
  const thisWeekStudy = data.reduce((acc, d) => acc + d.studyCount, 0);
  const thisWeekWorkout = data.reduce((acc, d) => acc + d.workoutCount, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Execution History</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-[9px] font-medium text-muted-foreground uppercase">Study</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-medium text-muted-foreground uppercase">Workouts</span>
            </div>
          </div>
        </div>

        <div className="flex h-24 items-end justify-between gap-2 px-1">
          {data.map((d, i) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group relative">
              <div className="w-full flex flex-col-reverse gap-0.5 h-16 justify-start items-center">
                {/* Study block */}
                <div 
                  className="w-full max-w-[12px] rounded-[1px] bg-blue-500/80 transition-all group-hover:bg-blue-500"
                  style={{ height: `${(d.studyCount / maxVal) * 100}%`, minHeight: d.studyCount > 0 ? '4px' : '0' }}
                />
                {/* Workout block */}
                <div 
                  className="w-full max-w-[12px] rounded-[1px] bg-emerald-500/80 transition-all group-hover:bg-emerald-500"
                  style={{ height: `${(d.workoutCount / maxVal) * 100}%`, minHeight: d.workoutCount > 0 ? '4px' : '0' }}
                />
              </div>
              <span className="text-[9px] font-bold text-muted-foreground/60">{d.dayLabel}</span>
              
              {/* Tooltip */}
              <div className={cn(
                "absolute -top-10 hidden group-hover:block z-20",
                i === 0 ? "left-0 translate-x-0" : 
                i === data.length - 1 ? "right-0 translate-x-0" : 
                "left-1/2 -translate-x-1/2"
              )}>
                <div className="bg-stone-900 text-white text-[9px] py-1 px-2 rounded whitespace-nowrap shadow-xl">
                  {d.studyCount} Study · {d.workoutCount} Workout
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-muted/5 p-3 flex flex-col justify-between h-20">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mastery sessions</span>
          </div>
          <p className="mt-auto text-xl font-bold tracking-tight">{thisWeekStudy}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/5 p-3 flex flex-col justify-between h-20">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gym consistency</span>
          </div>
          <p className="mt-auto text-xl font-bold tracking-tight">{thisWeekWorkout}</p>
        </div>
      </div>
    </div>
  );
}
