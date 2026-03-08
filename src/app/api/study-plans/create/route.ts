import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { expandStudyPlanDays, normalizeStudyPlanDays } from "@/lib/study-plan-persistence";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      courseId?: number;
      startDate?: string;
      endDate?: string;
      daysOfWeek?: number[];
      startTime?: string;
      endTime?: string;
      location?: string;
      kind?: string;
      timezone?: string;
    };

    const courseId = Number(body.courseId);
    const normalizedDays = normalizeStudyPlanDays(Array.isArray(body.daysOfWeek) ? body.daysOfWeek : []);
    if (!courseId || !body.startDate || !body.endDate || normalizedDays.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const rows = expandStudyPlanDays({
      user_id: user.id,
      course_id: courseId,
      start_date: body.startDate,
      end_date: body.endDate,
      days_of_week: normalizedDays,
      start_time: body.startTime || "09:00:00",
      end_time: body.endTime || "11:00:00",
      location: body.location || "",
      kind: body.kind || null,
      timezone: body.timezone || 'UTC',
    });
    const { error } = await supabase.from("study_plans").insert(rows);

    if (error) {
      console.error("Failed to create study plan:", error);
      return NextResponse.json({ error: "Failed to create study plan" }, { status: 500 });
    }

    revalidatePath("/roadmap");
    revalidatePath(`/courses/${courseId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create study plan error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
