import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { CAUSport } from "@/lib/scrapers/cau-sport";
import { SupabaseDatabase, createAdminClient, getUser } from "@/lib/supabase/server";
import { completeScraperJob, failScraperJob, startScraperJob } from "@/lib/scrapers/scraper-jobs";

export async function POST() {
  const startedAtMs = Date.now();
  let jobId: number | null = null;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    jobId = await startScraperJob({
      university: "cau-sport",
      trigger: "api",
      triggeredByUserId: user.id,
      forceUpdate: true,
      jobType: "workouts",
      meta: { endpoint: "/api/workouts/refresh" },
    });

    const scraper = new CAUSport();
    const workouts = await scraper.retrieveWorkouts();

    const supabase = createAdminClient();
    const source = "CAU Kiel Sportzentrum";

    const { error: deleteError } = await supabase
      .from("workouts")
      .delete()
      .eq("source", source);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 },
      );
    }

    if (workouts.length > 0) {
      const db = new SupabaseDatabase();
      await db.saveWorkouts(workouts);
    }

    await completeScraperJob(jobId, {
      courseCount: workouts.length,
      durationMs: Date.now() - startedAtMs,
      meta: {
        saved_workouts: workouts.length,
        source,
      },
    });

    revalidatePath("/workouts");
    return NextResponse.json({ success: true, count: workouts.length });
  } catch (error) {
    await failScraperJob(jobId, error, Date.now() - startedAtMs);
    console.error("[workouts/refresh] failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
