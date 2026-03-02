import { createAdminClient } from "@/lib/supabase/server";

type ActivityItem = {
  ts: string;
  stage: string;
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
};

function asPlainError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : JSON.stringify(error);
}

async function updateJob(jobId: number, patch: Record<string, unknown>) {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase.from("scraper_jobs").update(patch).eq("id", jobId);
}

export async function startCourseIntelJob(input: {
  userId: string;
  courseId: number;
  university: string;
}): Promise<number | null> {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const now = new Date().toISOString();
  const meta = {
    course_id: input.courseId,
    progress: 0,
    activity: [
      {
        ts: now,
        stage: "queued",
        message: "AI sync queued.",
        progress: 0,
      },
    ],
  };

  const { data, error } = await supabase
    .from("scraper_jobs")
    .insert({
      university: input.university || "unknown",
      status: "queued",
      started_at: now,
      job_type: "course-intel",
      triggered_by: "api",
      triggered_by_user_id: input.userId,
      meta,
    })
    .select("id")
    .maybeSingle();

  if (!error && data?.id) return Number(data.id);

  // Backward compatibility fallback.
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("scraper_jobs")
    .insert({
      university: input.university || "unknown",
      status: "running",
      started_at: now,
    })
    .select("id")
    .maybeSingle();

  if (fallbackError) {
    console.error("[course_intel_jobs] failed to start job:", asPlainError(fallbackError));
    return null;
  }
  return fallbackData?.id ? Number(fallbackData.id) : null;
}

export async function markCourseIntelJobRunning(jobId: number) {
  await updateJob(jobId, { status: "running" });
}

export async function appendCourseIntelJobActivity(
  jobId: number,
  event: ActivityItem
) {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("scraper_jobs")
    .select("meta")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error(`[course_intel_jobs] failed to load job meta ${jobId}:`, asPlainError(error));
    return;
  }

  const currentMeta = (data?.meta && typeof data.meta === "object") ? data.meta : {};
  const currentActivity = Array.isArray((currentMeta as Record<string, unknown>).activity)
    ? ((currentMeta as Record<string, unknown>).activity as ActivityItem[])
    : [];
  const nextActivity = [...currentActivity, event].slice(-40);
  const nextMeta = {
    ...(currentMeta as Record<string, unknown>),
    progress: typeof event.progress === "number" ? event.progress : (currentMeta as Record<string, unknown>).progress ?? 0,
    activity: nextActivity,
  };

  await updateJob(jobId, { meta: nextMeta });
}

export async function completeCourseIntelJob(jobId: number, summary: Record<string, unknown>) {
  const now = new Date().toISOString();
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data } = await supabase
    .from("scraper_jobs")
    .select("meta")
    .eq("id", jobId)
    .maybeSingle();
  const currentMeta = (data?.meta && typeof data.meta === "object") ? (data.meta as Record<string, unknown>) : {};
  await updateJob(jobId, {
    status: "completed",
    completed_at: now,
    meta: {
      ...currentMeta,
      ...(summary || {}),
      progress: 100,
    },
  });
}

export async function failCourseIntelJob(jobId: number, error: unknown) {
  const now = new Date().toISOString();
  await updateJob(jobId, {
    status: "failed",
    completed_at: now,
    error: asPlainError(error).slice(0, 4000),
  });
}

export async function getLatestCourseIntelJob(userId: string, courseId: number) {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("scraper_jobs")
    .select("id, status, error, started_at, completed_at, created_at, triggered_by_user_id, meta, job_type")
    .eq("triggered_by_user_id", userId)
    .eq("job_type", "course-intel")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[course_intel_jobs] failed to query jobs:", asPlainError(error));
    return null;
  }

  const match = (data || []).find((row: Record<string, unknown>) => {
    const meta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : {};
    return Number(meta.course_id) === courseId;
  });

  return match || null;
}
