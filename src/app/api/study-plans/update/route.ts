import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";

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
    if (!planId || !courseId || !body.startDate || !body.endDate || !Array.isArray(body.daysOfWeek)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("study_plans")
      .update({
        start_date: body.startDate,
        end_date: body.endDate,
        days_of_week: body.daysOfWeek,
        start_time: body.startTime || "09:00:00",
        end_time: body.endTime || "11:00:00",
        location: body.location || "",
        kind: body.kind || null,
        timezone: body.timezone || 'UTC',
        updated_at: new Date().toISOString(),
      })
      .eq("id", planId)
      .eq("user_id", user.id)
      .eq("course_id", courseId);

    if (error) {
      console.error("Failed to update study plan:", error);
      return NextResponse.json({ error: "Failed to update study plan" }, { status: 500 });
    }

    revalidatePath("/study-plan");
    revalidatePath(`/courses/${courseId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update study plan error:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
