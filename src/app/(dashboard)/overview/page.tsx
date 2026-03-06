import { Suspense } from "react";
import Link from "next/link";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { createClient, getUser, mapCourseFromRow } from "@/lib/supabase/server";
import LearningProfileChart from "@/components/identity/LearningProfileChart";
import CourseStatusChart from "@/components/identity/CourseStatusChart";
import OverviewRoutineList from "@/components/dashboard/OverviewRoutineList";
import CourseMomentumCard from "@/components/dashboard/CourseMomentumCard";
import { Button } from "@/components/ui/button";
import { buildOverviewRoutineItems, buildWeeklyActivity } from "@/lib/overview-routine";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [user, lang] = await Promise.all([getUser(), getLanguage()]);
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-mono uppercase tracking-widest">{dict.dashboard.identity.user_not_found}</p>
        <Button variant="outline" asChild>
          <Link href="/login">{dict.dashboard.login.title}</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="h-full w-full px-4 py-4">
      <div className="sticky top-0 z-20 -mx-4 -mt-4 bg-background/95 px-4 pb-5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Course momentum, today&apos;s routine, and learning identity.
          </p>
        </div>
      </div>
      <Suspense fallback={null}>
        <OverviewContent userId={user.id} />
      </Suspense>
    </main>
  );
}

async function OverviewContent({ userId }: { userId: string }) {
  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);
  const referenceNowMs = new Date(`${todayIso}T23:59:59.999Z`).getTime();

  const [coursesRes, plansRes, logsRes, workoutsRes, workoutLogsRes, schedulesRes] = await Promise.all([
    supabase
      .from("courses")
      .select(`
        id, university, course_code, title, units, credit, url, details,
        user_courses!inner(status, progress, updated_at)
      `)
      .eq("user_courses.user_id", userId)
      .neq("user_courses.status", "hidden"),
    supabase
      .from("study_plans")
      .select(`
        id,
        course_id,
        start_date,
        end_date,
        days_of_week,
        start_time,
        end_time,
        kind,
        location,
        courses(id, title, course_code, university)
      `)
      .eq("user_id", userId),
    supabase
      .from("study_logs")
      .select("plan_id, log_date, is_completed, course_schedule_id, course_assignment_id")
      .eq("user_id", userId),
    supabase
      .from("user_workouts")
      .select(`
        workout_id,
        workouts!inner(
          id,
          title,
          title_en,
          category,
          category_en,
          source,
          day_of_week,
          start_date,
          end_date,
          start_time,
          end_time,
          location,
          location_en
        )
      `)
      .eq("user_id", userId),
    supabase
      .from("user_workout_logs")
      .select("workout_id, log_date, is_attended")
      .eq("user_id", userId),
    supabase
      .from("course_schedules")
      .select(`
        id,
        course_id,
        schedule_date,
        task_title,
        task_kind,
        focus,
        duration_minutes,
        courses(id, title, course_code, university)
      `)
      .eq("schedule_date", todayIso),
  ]);

  const enrolledCourses = (coursesRes.data || []).map((row) => mapCourseFromRow(row));
  const userCourseRows = (coursesRes.data || []).map((row: Record<string, unknown>) => {
    const userCourse = Array.isArray(row.user_courses) ? row.user_courses[0] : row.user_courses;
    return {
      status: typeof userCourse?.status === "string" ? userCourse.status : "pending",
      progress: Number(userCourse?.progress || 0),
      updated_at: typeof userCourse?.updated_at === "string" ? userCourse.updated_at : null,
    };
  });
  const enrolledCourseIds = enrolledCourses.map((course) => course.id);

  const [fieldsRes, assignmentsRes] =
    enrolledCourseIds.length > 0
      ? await Promise.all([
          supabase.from("course_fields").select("fields(name)").in("course_id", enrolledCourseIds),
          supabase
            .from("course_assignments")
            .select(`
              id,
              course_id,
              label,
              kind,
              due_on,
              url,
              courses(title, course_code, university)
            `)
            .in("course_id", enrolledCourseIds)
            .eq("due_on", todayIso),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
        ];

  const statusCounts: Record<string, number> = {};
  for (const row of userCourseRows) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }

  const fieldCounts: Record<string, number> = {};
  ((fieldsRes.data || []) as Array<{ fields: { name: string } | null }>).forEach((row) => {
    if (row.fields?.name) {
      fieldCounts[row.fields.name] = (fieldCounts[row.fields.name] || 0) + 1;
    }
  });
  const fieldStats = Object.entries(fieldCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const recentUpdates30 = userCourseRows.filter((row) => {
    if (!row.updated_at) return false;
    const ts = new Date(row.updated_at).getTime();
    const diffDays = (referenceNowMs - ts) / (24 * 60 * 60 * 1000);
    return Number.isFinite(ts) && diffDays <= 30;
  }).length;
  const inProgressRows = userCourseRows.filter((row) => row.status === "in_progress");
  const stalledCount = inProgressRows.filter((row) => {
    if (!row.updated_at) return true;
    const ts = new Date(row.updated_at).getTime();
    const diffDays = (referenceNowMs - ts) / (24 * 60 * 60 * 1000);
    return !Number.isFinite(ts) || diffDays > 14;
  }).length;
  const avgProgress =
    inProgressRows.length > 0
      ? Math.round(inProgressRows.reduce((sum, row) => sum + row.progress, 0) / inProgressRows.length)
      : 0;

  const plans: Parameters<typeof buildOverviewRoutineItems>[0]["plans"] = (plansRes.data || []).map(
    (plan: Record<string, unknown>) => ({
      id: Number(plan.id),
      course_id: Number(plan.course_id),
      start_date: typeof plan.start_date === "string" ? plan.start_date.slice(0, 10) : "",
      end_date: typeof plan.end_date === "string" ? plan.end_date.slice(0, 10) : "",
      days_of_week: Array.isArray(plan.days_of_week)
        ? plan.days_of_week.map((value) => Number(value)).filter((value) => Number.isInteger(value))
        : [],
      start_time: typeof plan.start_time === "string" ? plan.start_time : null,
      end_time: typeof plan.end_time === "string" ? plan.end_time : null,
      kind: typeof plan.kind === "string" ? plan.kind : null,
      location: typeof plan.location === "string" ? plan.location : null,
      courses: Array.isArray(plan.courses) ? plan.courses[0] : plan.courses as {
        title: string;
        course_code: string;
        university: string;
      } | null,
    })
  );

  const workouts: Parameters<typeof buildOverviewRoutineItems>[0]["workouts"] = (workoutsRes.data || [])
    .map((row: Record<string, unknown>) => {
      const raw = Array.isArray(row.workouts) ? row.workouts[0] : row.workouts;
      if (!raw || typeof raw !== "object") return null;
      const workout = raw as Record<string, unknown>;
      return {
        id: Number(workout.id),
        title: String(workout.title_en || workout.title || ""),
        category: workout.category_en ? String(workout.category_en) : workout.category ? String(workout.category) : null,
        source: workout.source ? String(workout.source) : null,
        day_of_week: workout.day_of_week ? String(workout.day_of_week) : null,
        start_date: typeof workout.start_date === "string" ? workout.start_date.slice(0, 10) : null,
        end_date: typeof workout.end_date === "string" ? workout.end_date.slice(0, 10) : null,
        start_time: workout.start_time ? String(workout.start_time) : null,
        end_time: workout.end_time ? String(workout.end_time) : null,
        location: workout.location_en ? String(workout.location_en) : workout.location ? String(workout.location) : null,
      };
    })
    .filter((workout): workout is NonNullable<typeof workout> => Boolean(workout));

  const workoutLogs: Parameters<typeof buildOverviewRoutineItems>[0]["workoutLogs"] = (workoutLogsRes.data || []).map((log) => ({
    workout_id: Number(log.workout_id),
    log_date: String(log.log_date),
    is_attended: Boolean(log.is_attended),
  }));

  const assignments: Parameters<typeof buildOverviewRoutineItems>[0]["assignments"] = (assignmentsRes.data || []).map((row) => ({
    id: Number(row.id),
    course_id: Number(row.course_id),
    label: String(row.label || ""),
    kind: String(row.kind || "assignment"),
    due_on: typeof row.due_on === "string" ? row.due_on : null,
    url: typeof row.url === "string" ? row.url : null,
    courses: Array.isArray(row.courses) ? row.courses[0] : row.courses as {
      title: string;
      course_code: string;
      university: string;
    } | null,
  }));

  const routineItems = buildOverviewRoutineItems({
    date: todayIso,
    plans,
    logs: logsRes.data || [],
    workouts,
    workoutLogs,
    assignments,
    schedules: (schedulesRes.data || []) as unknown as Parameters<typeof buildOverviewRoutineItems>[0]["schedules"],
  });

  const inProgressCount = statusCounts.in_progress || 0;
  const attendedToday = routineItems.filter((item) => item.sourceType === "workout" && item.isDone).length;

  return (
    <div className="min-h-full space-y-6 pb-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-2xl border border-border bg-background flex flex-col h-full">
          <div className="border-b border-border px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-bold tracking-tight text-foreground">Today&apos;s Routine</h2>
                <p className="text-sm text-muted-foreground">
                  Specific tasks and routine items, ordered by time.
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">Primary focus</p>
                <p className="mt-1 text-sm font-bold text-foreground truncate max-w-[180px]">
                  {fieldStats[0]?.name || "Undeclared"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-4 p-5 overflow-auto">
            <OverviewRoutineList initialItems={routineItems} />
          </div>
        </section>
        
        <aside className="h-full">
          <CourseMomentumCard 
            routineItems={routineItems} 
            inProgressCount={inProgressCount} 
            attendedToday={attendedToday} 
          />
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Course momentum</h2>
            <p className="text-sm text-muted-foreground">
              Status mix, update cadence, and current progress.
            </p>
          </div>
          <div className="p-4">
            <CourseStatusChart
              data={Object.entries(statusCounts)}
              emptyText="No course status data yet"
              recentUpdates30={recentUpdates30}
              inProgressCount={inProgressCount}
              stalledCount={stalledCount}
              avgProgress={avgProgress}
              weeklyActivity={buildWeeklyActivity(userCourseRows.map((row) => row.updated_at))}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-background">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-foreground">Learning identity</h2>
            <p className="text-sm text-muted-foreground">
              Field distribution across your current learning graph.
            </p>
          </div>
          <div className="p-4">
            <LearningProfileChart
              data={fieldStats}
              unitLabel="units"
              emptyText="No learning units yet"
            />
          </div>
        </section>
      </section>
    </div>
  );
}
