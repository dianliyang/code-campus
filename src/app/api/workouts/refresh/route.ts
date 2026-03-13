import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { SupabaseDatabase, createAdminClient, getUser } from "@/lib/supabase/server";
import { completeScraperJob, failScraperJob, getLatestCompletedWorkoutMetaField, startScraperJob } from "@/lib/scrapers/scraper-jobs";
import { retrieveWorkoutSourceBatches } from "@/lib/scrapers/workout-sources";

export async function POST(req: Request) {
  const startedAtMs = Date.now();
  let jobId: number | null = null;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const category = body?.category ? String(body.category) : undefined;
    const requestedSources: unknown[] = Array.isArray(body?.sources)
      ? body.sources
      : body?.source
        ? [body.source]
        : [];
    const sources: Array<"cau-sport" | "urban-apes"> = Array.from(
      new Set(
        requestedSources.filter(
          (value): value is "cau-sport" | "urban-apes" =>
            value === "cau-sport" || value === "urban-apes",
        ),
      ),
    );
    const selectedSources: Array<"cau-sport" | "urban-apes"> =
      sources.length > 0 ? sources : ["cau-sport"];

    jobId = await startScraperJob({
      university: selectedSources.join(","),
      trigger: "api",
      triggeredByUserId: user.id,
      forceUpdate: true,
      jobType: "workouts",
      meta: { endpoint: "/api/workouts/refresh", category, sources: selectedSources },
    });

    const cauCache = selectedSources.includes("cau-sport")
      ? await getLatestCompletedWorkoutMetaField<Record<string, unknown>>("cau_cache")
      : null;
    const retrieval = await retrieveWorkoutSourceBatches({
      category,
      sources: selectedSources,
      cacheState: {
        cau: (cauCache && typeof cauCache === "object") ? (cauCache as any) : undefined, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    });
    const workoutBatches = retrieval.batches;
    const workouts = workoutBatches.flatMap((batch) => batch.workouts);

    const supabase = createAdminClient();
    for (const batch of workoutBatches) {
      let deleteError: { message: string } | null = null;

      if (batch.pageUrl) {
        const { error } = await supabase
          .from("workouts")
          .delete()
          .eq("source", batch.source)
          .eq("url", batch.pageUrl);
        deleteError = error || null;
      } else if (category) {
        const [r1, r2] = await Promise.all([
          supabase.from("workouts").delete().eq("source", batch.source).eq("category_en", category),
          supabase.from("workouts").delete().eq("source", batch.source).eq("category", category),
        ]);
        deleteError = r1.error || r2.error || null;
      } else {
        const { error } = await supabase.from("workouts").delete().eq("source", batch.source);
        deleteError = error;
      }

      if (deleteError) {
        return NextResponse.json(
          { success: false, error: deleteError.message },
          { status: 500 },
        );
      }
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
        sources: workoutBatches.map((batch) => batch.source),
        category,
        ...(retrieval.meta || {}),
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
