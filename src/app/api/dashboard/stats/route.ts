import { NextResponse } from "next/server";
import { createClient, getUser, mapCourseFromRow } from "@/lib/supabase/server";
import { buildOverviewRoutineItems, buildWeeklyActivity } from "@/lib/overview-routine";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const todayIso = new Date().toISOString().slice(0, 10);
    const referenceNowMs = new Date(`${todayIso}T23:59:59.999Z`).getTime();

    // 1. Fetch Today's Schedule via RPC (Deduplicated & Expanded)
    const { data: scheduleRows } = await (supabase as any).rpc("get_user_schedule", { // eslint-disable-line @typescript-eslint/no-explicit-any
      p_user_id: user.id,
      p_start_date: todayIso,
      p_end_date: todayIso,
    });

    // 2. Fetch other metrics
    const [coursesRes, logsRes, workoutLogsRes] = await Promise.all([
      supabase
        .from("courses")
        .select(`
          id, university, course_code, title, units, credit, url, details,
          user_courses!inner(status, progress, updated_at)
        `)
        .eq("user_courses.user_id", user.id)
        .neq("user_courses.status", "hidden"),
      supabase
        .from("study_logs")
        .select("plan_id, log_date, is_completed, course_schedule_id, course_assignment_id")
        .eq("user_id", user.id),
      supabase
        .from("user_workout_logs")
        .select("workout_id, log_date, is_attended")
        .eq("user_id", user.id),
    ]);

    const enrolledCourses = (coursesRes.data || []).map((row) => mapCourseFromRow(row));
    const userCourseRows = (coursesRes.data || []).map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const userCourse = Array.isArray(row.user_courses) ? row.user_courses[0] : row.user_courses;
      return {
        status: userCourse?.status || "pending",
        progress: Number(userCourse?.progress || 0),
        updated_at: userCourse?.updated_at || null,
      };
    });
    const enrolledCourseIds = enrolledCourses.map((course) => course.id);

    const [fieldsRes] = enrolledCourseIds.length > 0
      ? await Promise.all([
          supabase.from("course_fields").select("fields(name)").in("course_id", enrolledCourseIds),
        ])
      : [{ data: [], error: null }];

    // Process Momentum
    const statusCounts: Record<string, number> = {};
    userCourseRows.forEach(row => {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    });

    // Process Identity
    const fieldCounts: Record<string, number> = {};
    ((fieldsRes.data || []) as any[]).forEach((row) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (row.fields?.name) {
        fieldCounts[row.fields.name] = (fieldCounts[row.fields.name] || 0) + 1;
      }
    });
    const fieldStats = Object.entries(fieldCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Process Metrics
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

    const avgProgress = inProgressRows.length > 0
      ? Math.round(inProgressRows.reduce((sum, row) => sum + row.progress, 0) / inProgressRows.length)
      : 0;

    // Routine Filtering (Generic sessions removed)
    const routineItems = buildOverviewRoutineItems(
      (scheduleRows || []).filter((row: any) => !(row.source_type === "study_plan" && row.plan_id && !row.schedule_id && !row.assignment_id)) // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    const attendedToday = routineItems.filter((item) => item.sourceType === "workout" && item.isDone).length;
    const studyDoneToday = routineItems.filter((item) => (item.sourceType === "study_plan" || item.sourceType === "assignment") && item.isDone).length;

    return NextResponse.json({
      routine: routineItems,
      momentum: {
        statusCounts,
        recentUpdates30,
        stalledCount,
        avgProgress,
        weeklyActivity: buildWeeklyActivity(userCourseRows.map((row) => row.updated_at)),
        studyDoneToday,
        attendedToday,
        inProgressCount: statusCounts.in_progress || 0
      },
      execution: {
        studyLogs: (logsRes.data || []).map(l => ({ log_date: String(l.log_date), is_completed: Boolean(l.is_completed) })),
        workoutLogs: (workoutLogsRes.data || []).map(l => ({ log_date: String(l.log_date), is_attended: Boolean(l.is_attended) }))
      },
      identity: {
        fieldStats,
        primaryFocus: fieldStats[0]?.name || "Undeclared"
      }
    });
  } catch (error) {
    console.error("[Dashboard Stats API] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
