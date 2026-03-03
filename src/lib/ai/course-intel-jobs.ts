import { createAdminClient } from "@/lib/supabase/server";
const COURSE_INTEL_STALE_TIMEOUT = "10 minutes";

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

function fallbackUniversityMarker(userId: string, courseId: number) {
  return `ai:${userId}:${courseId}`;
}

function parseCourseIdFromFallbackUniversity(university: unknown): number | null {
  if (typeof university !== "string") return null;
  const match = university.match(/^ai:[^:]+:(\d+)$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

async function updateJob(jobId: number, patch: Record<string, unknown>) {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase.from("scraper_jobs").update(patch).eq("id", jobId);
}

async function failStaleCourseIntelJobsForUser(userId: string) {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  await supabase
    .from("scraper_jobs")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error: `AI sync timed out after ${COURSE_INTEL_STALE_TIMEOUT}. Job terminated.`,
    })
    .eq("triggered_by_user_id", userId)
    .eq("job_type", "course-intel")
    .in("status", ["queued", "running"])
    .lt("started_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());
}

export async function startCourseIntelJob(input: {
  userId: string;
  courseId: number;
  university: string;
  sourceMode?: "fresh" | "existing" | "auto";
  executionMode?: "service" | "local" | "deterministic";
}): Promise<number | null> {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const now = new Date().toISOString();
  const meta = {
    course_id: input.courseId,
    source_mode: input.sourceMode || "auto",
    execution_mode: input.executionMode || "service",
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
      status: "running",
      started_at: now,
      job_type: "course-intel",
      triggered_by: "api",
      triggered_by_user_id: input.userId,
      meta,
    })
    .select("id")
    .maybeSingle();

  if (!error && data?.id) return Number(data.id);

  // Compatibility fallback for databases that still enforce old job_type checks.
  const fallbackUniversity = fallbackUniversityMarker(input.userId, input.courseId);
  const { data: compatData, error: compatError } = await supabase
    .from("scraper_jobs")
    .insert({
      university: fallbackUniversity,
      status: "running",
      started_at: now,
      job_type: "courses",
      triggered_by: "api",
      triggered_by_user_id: input.userId,
      meta,
    })
    .select("id")
    .maybeSingle();

  if (!compatError && compatData?.id) return Number(compatData.id);

  // Legacy fallback for schemas missing newer columns.
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("scraper_jobs")
    .insert({
      university: fallbackUniversity,
      status: "running",
      started_at: now,
    })
    .select("id")
    .maybeSingle();

  if (fallbackError) {
    console.error(
      "[course_intel_jobs] failed to start job:",
      asPlainError(error || compatError || fallbackError)
    );
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
  await failStaleCourseIntelJobsForUser(userId);
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("scraper_jobs")
    .select("id, status, error, started_at, completed_at, created_at, triggered_by_user_id, meta, job_type")
    .eq("triggered_by_user_id", userId)
    .eq("job_type", "course-intel")
    .order("created_at", { ascending: false })
    .limit(20);

  if (!error) {
    const match = (data || []).find((row: Record<string, unknown>) => {
      const meta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : {};
      return Number(meta.course_id) === courseId;
    });
    if (match) return match;
  }

  // Backward-compatible fallback for older schemas lacking job_type/triggered_by_user_id/meta columns.
  const fallbackPrefix = `ai:${userId}:%`;
  let fallbackData: Record<string, unknown>[] | null = null;
  let fallbackError: unknown = null;

  const withMeta = await supabase
    .from("scraper_jobs")
    .select("id, status, error, started_at, completed_at, created_at, university, meta")
    .like("university", fallbackPrefix)
    .order("created_at", { ascending: false })
    .limit(30);

  if (!withMeta.error) {
    fallbackData = withMeta.data || [];
  } else {
    fallbackError = withMeta.error;
    const legacy = await supabase
      .from("scraper_jobs")
      .select("id, status, error, started_at, completed_at, created_at, university")
      .like("university", fallbackPrefix)
      .order("created_at", { ascending: false })
      .limit(30);
    fallbackError = legacy.error;
    fallbackData = legacy.data || [];
  }

  if (fallbackError && !fallbackData) {
    console.error("[course_intel_jobs] failed to query jobs:", asPlainError(error || fallbackError));
    return null;
  }

  const fallbackMatch = (fallbackData || []).find((row: Record<string, unknown>) => {
    const parsedCourseId = parseCourseIdFromFallbackUniversity(row.university);
    return parsedCourseId === courseId;
  });

  if (!fallbackMatch) return null;

  const rawMeta =
    fallbackMatch.meta && typeof fallbackMatch.meta === "object"
      ? (fallbackMatch.meta as Record<string, unknown>)
      : {};
  const rawProgress = Number(rawMeta.progress);
  const progress =
    Number.isFinite(rawProgress) && rawProgress >= 0
      ? Math.min(100, Math.max(0, rawProgress))
      : (fallbackMatch.status === "completed" || fallbackMatch.status === "failed" ? 100 : 5);
  const activity = Array.isArray(rawMeta.activity) ? rawMeta.activity : [];

  return {
    ...fallbackMatch,
    meta: {
      ...rawMeta,
      course_id: courseId,
      progress,
      activity,
    },
  };
}

export async function getRecentCourseIntelJobs(userId: string, limit = 20) {
  await failStaleCourseIntelJobsForUser(userId);
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("scraper_jobs")
    .select("id, status, error, started_at, completed_at, created_at, triggered_by_user_id, meta, job_type, university")
    .eq("triggered_by_user_id", userId)
    .eq("job_type", "course-intel")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!error) {
    return data || [];
  }

  let fallbackData: Record<string, unknown>[] | null = null;
  let fallbackError: unknown = null;

  const withMeta = await supabase
    .from("scraper_jobs")
    .select("id, status, error, started_at, completed_at, created_at, university, meta")
    .like("university", `ai:${userId}:%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!withMeta.error) {
    fallbackData = withMeta.data || [];
  } else {
    fallbackError = withMeta.error;
    const legacy = await supabase
      .from("scraper_jobs")
      .select("id, status, error, started_at, completed_at, created_at, university")
      .like("university", `ai:${userId}:%`)
      .order("created_at", { ascending: false })
      .limit(limit);
    fallbackError = legacy.error;
    fallbackData = legacy.data || [];
  }

  if (fallbackError && !fallbackData) {
    console.error("[course_intel_jobs] failed to query recent jobs:", asPlainError(error || fallbackError));
    return [];
  }

  return (fallbackData || []).map((row: Record<string, unknown>) => {
    const parsedCourseId = parseCourseIdFromFallbackUniversity(row.university);
    const rawMeta =
      row.meta && typeof row.meta === "object"
        ? (row.meta as Record<string, unknown>)
        : {};
    const rawProgress = Number(rawMeta.progress);
    const progress =
      Number.isFinite(rawProgress) && rawProgress >= 0
        ? Math.min(100, Math.max(0, rawProgress))
        : (row.status === "completed" || row.status === "failed" ? 100 : 5);
    return {
      ...row,
      meta: {
        ...rawMeta,
        course_id: parsedCourseId || undefined,
        progress,
        activity: Array.isArray(rawMeta.activity) ? rawMeta.activity : [],
      },
      job_type: "course-intel",
      triggered_by_user_id: userId,
    };
  });
}
