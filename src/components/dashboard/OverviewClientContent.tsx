"use client";

import { useEffect, useState } from "react";
import LearningProfileChart from "@/components/identity/LearningProfileChart";
import CourseStatusChart from "@/components/identity/CourseStatusChart";
import AttendanceLearningChart from "@/components/dashboard/AttendanceLearningChart";
import OverviewRoutineList from "@/components/dashboard/OverviewRoutineList";
import CourseMomentumCard from "@/components/dashboard/CourseMomentumCard";
import { Loader2 } from "lucide-react";

interface DashboardStats {
  routine: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  momentum: {
    statusCounts: Record<string, number>;
    recentUpdates30: number;
    stalledCount: number;
    avgProgress: number;
    weeklyActivity: number[];
    studyDoneToday: number;
    attendedToday: number;
    inProgressCount: number;
  };
  execution: {
    studyLogs: Array<{ log_date: string; is_completed: boolean }>;
    workoutLogs: Array<{ log_date: string; is_attended: boolean }>;
  };
  identity: {
    fieldStats: Array<{ name: string; count: number }>;
    primaryFocus: string;
  };
}

export default function OverviewClientContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (!res.ok) throw new Error("Failed to fetch dashboard metrics");
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    void fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] w-full flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Syncing dashboard data...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-destructive/50 bg-destructive/5 p-8 text-center">
        <div className="max-w-md space-y-2">
          <p className="font-semibold text-destructive">Failed to load overview data</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 pb-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-background flex flex-col h-full">
          <div className="border-b border-border px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Today&apos;s Routine</h2>
                <p className="text-sm text-muted-foreground">
                  Specific tasks and routine items, ordered by time.
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Primary focus</p>
                <p className="mt-1 text-sm font-bold text-foreground truncate max-w-[280px]">
                  {stats.identity.primaryFocus}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-4 p-5 overflow-auto">
            <OverviewRoutineList initialItems={stats.routine} />
          </div>
        </section>
        
        <aside className="h-full">
          <CourseMomentumCard 
            routineItems={stats.routine} 
            inProgressCount={stats.momentum.inProgressCount} 
            studyDoneToday={stats.momentum.studyDoneToday}
            attendedToday={stats.momentum.attendedToday} 
          />
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-background relative">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Course momentum</h2>
            <p className="text-sm text-muted-foreground">
              Status mix, update cadence, and current progress.
            </p>
          </div>
          <div className="p-4">
            <CourseStatusChart
              data={Object.entries(stats.momentum.statusCounts)}
              emptyText="No course status data yet"
              recentUpdates30={stats.momentum.recentUpdates30}
              inProgressCount={stats.momentum.inProgressCount}
              stalledCount={stats.momentum.stalledCount}
              avgProgress={stats.momentum.avgProgress}
              weeklyActivity={stats.momentum.weeklyActivity}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background relative">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Execution metrics</h2>
            <p className="text-sm text-muted-foreground">
              Attendance and study consistency over last 7 days.
            </p>
          </div>
          <div className="p-4">
            <AttendanceLearningChart
              studyLogs={stats.execution.studyLogs}
              workoutLogs={stats.execution.workoutLogs}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-background relative">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Learning identity</h2>
            <p className="text-sm text-muted-foreground">
              Field distribution across your current learning graph.
            </p>
          </div>
          <div className="p-4">
            <LearningProfileChart
              data={stats.identity.fieldStats}
              unitLabel="units"
              emptyText="No learning units yet"
            />
          </div>
        </section>
      </section>
    </div>
  );
}
