import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { expandStudyPlanDays, normalizeStudyPlanDays } from "@/lib/study-plan-persistence";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      planId?: number;
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

    const planId = Number(body.planId);
    const courseId = Number(body.courseId);
    const normalizedDays = normalizeStudyPlanDays(Array.isArray(body.daysOfWeek) ? body.daysOfWeek : []);
    if (!planId || !courseId || !body.startDate || !body.endDate || normalizedDays.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const basePayload = {
      start_date: body.startDate,
      end_date: body.endDate,
      start_time: body.startTime || "09:00:00",
      end_time: body.endTime || "11:00:00",
      location: body.location || "",
      kind: body.kind || null,
      timezone: body.timezone || 'UTC',
      updated_at: new Date().toISOString(),
    };
    const primaryDay = normalizedDays[0];

    const { error: updateError } = await supabase
      .from("study_plans")
      .update({
        ...basePayload,
        days_of_week: [primaryDay],
      })
      .eq("id", planId)
      .eq("user_id", user.id)
      .eq("course_id", courseId);

    if (updateError) {
      console.error("Failed to update study plan:", updateError);
      return NextResponse.json({ error: "Failed to update study plan" }, { status: 500 });
    }

    const extraDays = normalizedDays.slice(1);
    if (extraDays.length > 0) {
      const extraRows = expandStudyPlanDays({
        user_id: user.id,
        course_id: courseId,
        start_date: body.startDate,
        end_date: body.endDate,
        days_of_week: extraDays,
        start_time: body.startTime || "09:00:00",
        end_time: body.endTime || "11:00:00",
        location: body.location || "",
        kind: body.kind || null,
        timezone: body.timezone || "UTC",
        updated_at: basePayload.updated_at,
      });
      const { error: insertError } = await supabase.from("study_plans").insert(extraRows);
      if (insertError) {
        console.error("Failed to insert expanded study plans:", insertError);
        return NextResponse.json({ error: "Failed to update study plan" }, { status: 500 });
      }
    }

    revalidatePath("/roadmap");
    revalidatePath("/calendar");
    revalidatePath("/overview");
    revalidatePath(`/courses/${courseId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update study plan error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
