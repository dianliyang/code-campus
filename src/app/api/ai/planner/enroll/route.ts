import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { logAiUsage } from "@/lib/ai/log-usage";

export const runtime = "nodejs";

type PlannerWeek = { week: number; focus: string; tasks?: string[] };

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextMonday(base = new Date()) {
  const d = new Date(base);
  const day = d.getUTCDay();
  const diff = (8 - day) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const selectedCourseIds = Array.isArray(body?.selectedCourseIds)
    ? body.selectedCourseIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isFinite(v) && v > 0)
    : [];
  const studyPlan = Array.isArray(body?.studyPlan) ? (body.studyPlan as PlannerWeek[]) : [];

  if (selectedCourseIds.length === 0) {
    return NextResponse.json({ error: "No courses selected" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const enrollRows = selectedCourseIds.map((courseId: number) => ({
    user_id: user.id,
    course_id: courseId,
    status: "in_progress",
    progress: 0,
    updated_at: now,
  }));

  const { error: enrollError } = await supabase
    .from("user_courses")
    .upsert(enrollRows, { onConflict: "user_id,course_id" });

  if (enrollError) {
    return NextResponse.json({ error: enrollError.message }, { status: 500 });
  }

  // replace prior AI-planner generated plans for these courses
  await supabase
    .from("study_plans")
    .delete()
    .eq("user_id", user.id)
    .in("course_id", selectedCourseIds)
    .like("type", "AI Planner:%");

  if (studyPlan.length > 0) {
    const start = nextMonday(new Date());
    const rows = studyPlan.map((w, idx) => {
      const courseId = selectedCourseIds[idx % selectedCourseIds.length];
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + idx * 7);
      const date = formatDate(d);
      return {
        user_id: user.id,
        course_id: courseId,
        start_date: date,
        end_date: date,
        days_of_week: [1],
        start_time: "19:00:00",
        end_time: "21:00:00",
        location: w.tasks?.[0]?.slice(0, 120) || "Self-study",
        type: `AI Planner: ${w.focus || `Week ${w.week}`}`.slice(0, 120),
        updated_at: now,
      };
    });

    const { error: planError } = await supabase.from("study_plans").insert(rows);
    if (planError) {
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }
  }

  logAiUsage({
    userId: user.id,
    provider: "perplexity",
    model: "planner-enroll",
    feature: "planner-enroll",
    tokensInput: 0,
    tokensOutput: 0,
    requestPayload: {
      enrolled_course_ids: selectedCourseIds,
      study_plan_weeks: studyPlan.length,
    },
    responsePayload: {
      enrolled: selectedCourseIds.length,
      plans: studyPlan.length,
    },
  });

  return NextResponse.json({ success: true, enrolled: selectedCourseIds.length, plans: studyPlan.length });
}
