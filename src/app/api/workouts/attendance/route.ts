import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      workoutId?: number;
      date?: string;
    };

    if (!body.workoutId || !body.date) {
      return NextResponse.json({ error: "workoutId and date are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("user_workout_logs")
      .select("id, is_attended")
      .match({
        user_id: user.id,
        workout_id: body.workoutId,
        log_date: body.date,
      })
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const { error } = await supabase
        .from("user_workout_logs")
        .update({
          is_attended: !existing.is_attended,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("user_workout_logs")
        .insert({
          user_id: user.id,
          workout_id: body.workoutId,
          log_date: body.date,
          is_attended: true,
        });
      if (error) throw error;
    }

    revalidatePath("/overview");
    revalidatePath("/calendar");
    revalidatePath("/workouts");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Workout attendance error:", error);
    return NextResponse.json({ error: "Failed to toggle workout attendance" }, { status: 500 });
  }
}
