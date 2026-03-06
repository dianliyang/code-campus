import { Suspense } from "react";
import StudyCalendar from "@/components/home/StudyCalendar";
import Link from "next/link";
import { getUser, createClient, mapCourseFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StudySchedulePage() {
  const [user, lang] = await Promise.all([
    getUser(),
    getLanguage(),
  ]);
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-mono uppercase tracking-widest">{dict.dashboard.identity.user_not_found}</p>
        <Button variant="outline" asChild><Link href="/login">{dict.dashboard.login.title}</Link></Button>
      </div>
    );
  }

  return (
    <main className="flex h-full w-full flex-col px-4 pb-4">
      <Suspense fallback={null}>
        <StudyScheduleContent userId={user.id} dict={dict} />
      </Suspense>
    </main>
  );
}

async function StudyScheduleContent({
  userId, dict
}: {
  userId: string;
  dict: Dictionary;
}) {
  type PlanCourse = {
    id: number;
    title: string;
    course_code: string;
    university: string;
  };

  type NormalizedPlan = {
    id: number;
    course_id: number;
    start_date: string;
    end_date: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    location: string | null;
    kind: string;
    courses: PlanCourse | null;
  };

  type NormalizedWorkout = {
    id: number;
    title: string;
    category: string | null;
    source: string | null;
    day_of_week: string | null;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
  };

  type ScheduleItem = {
    id: number;
    course_id: number;
    schedule_date: string;
    task_title: string;
    task_kind: string | null;
    focus: string | null;
    duration_minutes: number | null;
    courses: { title: string; course_code: string; university: string } | null;
  };

  type AssignmentItem = {
    id: number;
    course_id: number;
    label: string;
    kind: string;
    due_on: string | null;
    url: string | null;
    courses: { title: string; course_code: string; university: string } | null;
  };

  const supabase = await createClient();

  const [coursesRes, plansRes, logsRes, workoutsRes, schedulesRes, assignmentsRes] = await Promise.all([
    supabase
      .from('courses')
      .select(`
        id, university, course_code, title, units, credit, url, details,
        user_courses!inner(status)
      `)
      .eq('user_courses.user_id', userId)
      .neq('user_courses.status', 'hidden'),
    
    supabase
      .from('study_plans')
      .select(`
        id,
        course_id,
        start_date,
        end_date,
        days_of_week,
        start_time,
        end_time,
        location,
        kind,
        courses(id, title, course_code, university)
      `)
      .eq('user_id', userId),

    supabase
      .from('study_logs')
      .select('*, course_schedule_id, course_assignment_id')
      .eq('user_id', userId),
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
      `),
    supabase
      .from("course_assignments")
      .select(`
        id,
        course_id,
        label,
        kind,
        due_on,
        url,
        courses(id, title, course_code, university)
      `),
  ]);

  const enrolledCourses = (coursesRes.data || []).map(row => mapCourseFromRow(row));
  const enrolledCourseIds = new Set(enrolledCourses.map((course) => course.id));
  const rawPlans = plansRes.data || [];
  const logs = logsRes.data || [];
  const rawWorkouts = workoutsRes.data || [];
  const rawSchedules = ((schedulesRes.data || []) as unknown as ScheduleItem[]).filter(s => enrolledCourseIds.has(s.course_id));
  const rawAssignments = ((assignmentsRes.data || []) as unknown as AssignmentItem[]).filter(a => enrolledCourseIds.has(a.course_id));

  const toDateOnly = (value: unknown) => {
    if (typeof value !== "string") return "";
    return value.includes("T") ? value.split("T")[0] : value;
  };

  const normalizeDays = (value: unknown): number[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((d) => (typeof d === "number" ? d : Number(d)))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  };

  const normalizeCourse = (value: unknown): PlanCourse | null => {
    const row = Array.isArray(value) ? value[0] : value;
    if (!row || typeof row !== "object") return null;
    const obj = row as Record<string, unknown>;
    const id = Number(obj.id);
    if (!Number.isFinite(id)) return null;
    return {
      id,
      title: String(obj.title || ""),
      course_code: String(obj.course_code || ""),
      university: String(obj.university || ""),
    };
  };

  const allPlans: NormalizedPlan[] = rawPlans.map((plan: Record<string, unknown>) => ({
    ...plan,
    id: Number(plan.id),
    course_id: Number(plan.course_id),
    start_time: String(plan.start_time || ""),
    end_time: String(plan.end_time || ""),
    location: plan.location == null ? null : String(plan.location),
    kind: String(plan.kind || ""),
    courses: normalizeCourse(plan.courses),
    start_date: toDateOnly(plan.start_date),
    end_date: toDateOnly(plan.end_date),
    days_of_week: normalizeDays(plan.days_of_week),
  })) as NormalizedPlan[];

  const plans = allPlans.filter((plan) => enrolledCourseIds.has(plan.course_id));
  const validPlanIds = new Set(plans.map((plan) => plan.id));
  const filteredLogs = (logs || []).filter((log) => {
    if (log.plan_id) return validPlanIds.has(log.plan_id);
    if (log.course_schedule_id || log.course_assignment_id) return true;
    return false;
  });
  const workouts: NormalizedWorkout[] = rawWorkouts
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
        start_date: workout.start_date ? toDateOnly(workout.start_date) : null,
        end_date: workout.end_date ? toDateOnly(workout.end_date) : null,
        start_time: workout.start_time ? String(workout.start_time) : null,
        end_time: workout.end_time ? String(workout.end_time) : null,
        location: workout.location_en ? String(workout.location_en) : workout.location ? String(workout.location) : null,
      };
    })
    .filter((workout): workout is NormalizedWorkout => workout !== null && Number.isFinite(workout.id));

  const courseIdsWithPlans = new Set(plans.map((p) => p.course_id));
  const coursesWithoutPlans = enrolledCourses
    .filter(c =>
      c.university === 'CAU Kiel' &&
      !courseIdsWithPlans.has(c.id) &&
      c.details?.schedule &&
      typeof c.details.schedule === 'object' &&
      Object.keys(c.details.schedule as Record<string, unknown>).length > 0
    )
    .map(c => ({ id: c.id, courseCode: c.courseCode, title: c.title }));

  return (
    <div className="h-full min-h-0 flex flex-col">
      <StudyCalendar
        courses={enrolledCourses as unknown as Parameters<typeof StudyCalendar>[0]["courses"]}
        plans={plans}
        workouts={workouts}
        schedules={rawSchedules}
        assignments={rawAssignments}
        logs={filteredLogs}
        dict={dict.dashboard.roadmap}
      />
    </div>
  );
}
