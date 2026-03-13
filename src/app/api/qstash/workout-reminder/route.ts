import { NextRequest, NextResponse } from "next/server";
import { sendWorkoutReminderEmail } from "@/lib/email";
import { getQstashSafeNotBefore, publishDelayedJsonMessage } from "@/lib/qstash";
import { createAdminClient } from "@/lib/supabase/server";
import { formatWorkoutBookingOpensTime } from "@/lib/workout-reminders";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret =
    process.env.QSTASH_WORKOUT_REMINDER_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "";

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { userId?: string; workoutId?: number; reminderAt?: string };
    if (!body.userId || !body.workoutId) {
      return NextResponse.json({ error: "userId and workoutId are required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: reminderRow, error: reminderError } = await supabase
      .from("user_workouts")
      .select("status, reminder_sent_at, reminder_message_id")
      .match({ user_id: body.userId, workout_id: body.workoutId })
      .maybeSingle();

    if (reminderError) {
      return NextResponse.json({ error: reminderError.message }, { status: 500 });
    }

    if (!reminderRow || reminderRow.status !== "reminder") {
      return NextResponse.json({ success: true, skipped: true });
    }

    if (reminderRow.reminder_sent_at) {
      return NextResponse.json({ success: true, skipped: true, alreadySent: true });
    }

    if (body.reminderAt) {
      const reminderAt = new Date(body.reminderAt);
      if (!Number.isNaN(reminderAt.getTime())) {
        const nextScheduleAt = getQstashSafeNotBefore(reminderAt);
        if (nextScheduleAt.getTime() > Date.now()) {
          const messageId = await publishDelayedJsonMessage({
            destination: `${request.nextUrl.origin}/api/qstash/workout-reminder`,
            body: {
              userId: body.userId,
              workoutId: body.workoutId,
              reminderAt: reminderAt.toISOString(),
            },
            notBefore: nextScheduleAt,
            deduplicationId: `workout-reminder:${body.userId}:${body.workoutId}:${nextScheduleAt.toISOString()}`,
          });

          const { error: updateScheduleError } = await supabase
            .from("user_workouts")
            .update({
              reminder_message_id: messageId,
              updated_at: new Date().toISOString(),
            })
            .match({ user_id: body.userId, workout_id: body.workoutId });

          if (updateScheduleError) {
            return NextResponse.json({ error: updateScheduleError.message }, { status: 500 });
          }

          return NextResponse.json({
            success: true,
            scheduled: true,
            reminderAt: reminderAt.toISOString(),
            nextAttemptAt: nextScheduleAt.toISOString(),
          });
        }
      }
    }

    const [
      workoutRes,
      userRes,
    ] = await Promise.all([
      supabase
        .from("workouts")
        .select("title, title_en, source, booking_url, url, location, details")
        .eq("id", body.workoutId)
        .maybeSingle(),
      supabase.auth.admin.getUserById(body.userId),
    ]);

    if (workoutRes.error) {
      return NextResponse.json({ error: workoutRes.error.message }, { status: 500 });
    }
    if (userRes.error) {
      return NextResponse.json({ error: userRes.error.message }, { status: 500 });
    }

    const workout = workoutRes.data;
    const user = userRes.data.user;
    if (!workout || !user?.email) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const opensTime = formatWorkoutBookingOpensTime(
      workout.details && typeof workout.details === "object"
        ? (workout.details as Record<string, unknown>)
        : null,
    );
    const opensOn =
      workout.details &&
      typeof workout.details === "object" &&
      typeof (workout.details as Record<string, unknown>).bookingOpensOn === "string"
        ? String((workout.details as Record<string, unknown>).bookingOpensOn)
        : "";

    const bookingOpensLabel =
      opensOn && opensTime
        ? `${opensOn} ${opensTime} (Europe/Berlin)`
        : opensTime
          ? `${opensTime} (Europe/Berlin)`
          : "Soon";

    const emailResult = await sendWorkoutReminderEmail({
      recipientEmail: user.email,
      recipientName: user.user_metadata?.name || user.email.split("@")[0],
      workoutTitle: workout.title_en || workout.title || "Workout",
      provider: String(workout.source || ""),
      bookingUrl: String(workout.booking_url || workout.url || ""),
      bookingOpensLabel,
      location: workout.location ? String(workout.location) : null,
    });

    if (!emailResult.success) {
      return NextResponse.json({ error: "Failed to send reminder email" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("user_workouts")
      .update({
        reminder_sent_at: new Date().toISOString(),
        reminder_message_id: null,
        updated_at: new Date().toISOString(),
      })
      .match({ user_id: body.userId, workout_id: body.workoutId });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
