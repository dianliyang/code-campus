import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { runCourseIntel, type CourseIntelExecutionMode, type CourseIntelSourceMode } from "@/lib/ai/course-intel";
import { upstashDelete, upstashGetJson, upstashSetJson } from "@/lib/cache/upstash";
import {
  appendCourseIntelJobActivity,
  completeCourseIntelJob,
  failCourseIntelJob,
  getLatestCourseIntelJob,
  getRecentCourseIntelJobs,
  markCourseIntelJobRunning,
  startCourseIntelJob,
} from "@/lib/ai/course-intel-jobs";

export const runtime = "nodejs";
const COURSE_INTEL_JOB_TIMEOUT_MS = 10 * 60 * 1000;
const COURSE_INTEL_CACHE_TTL_SECONDS = 2 * 60 * 60;

type CourseIntelBroadcastEvent = {
  status: "queued" | "running" | "completed" | "failed";
  stage: string;
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
};

type ActivityItem = {
  ts: string;
  stage: string;
  message: string;
  progress?: number;
  details?: Record<string, unknown>;
};

type CachedCourseIntelJob = {
  id: number;
  status: string;
  sourceMode: CourseIntelSourceMode;
  executionMode: CourseIntelExecutionMode;
  meta: {
    course_id: number;
    source_mode: CourseIntelSourceMode;
    execution_mode: CourseIntelExecutionMode;
    progress: number;
    activity: ActivityItem[];
    [key: string]: unknown;
  };
  started_at?: string;
  completed_at?: string;
};

function courseIntelJobCacheKey(userId: string, courseId: number) {
  return `cc:course-intel:job:${userId}:${courseId}`;
}

async function setCachedCourseIntelJob(userId: string, courseId: number, value: CachedCourseIntelJob) {
  await upstashSetJson(courseIntelJobCacheKey(userId, courseId), value, COURSE_INTEL_CACHE_TTL_SECONDS);
}

async function clearCachedCourseIntelJob(userId: string, courseId: number) {
  await upstashDelete(courseIntelJobCacheKey(userId, courseId));
}

async function createCourseIntelBroadcastEmitter(courseId: number, jobId: number) {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const channel = supabase.channel(`course_intel_jobs:${courseId}`, {
    config: {
      broadcast: { ack: false, self: false },
      private: false,
    },
  });

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(done, 1000);
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED" || status === "TIMED_OUT" || status === "CHANNEL_ERROR" || status === "CLOSED") {
        clearTimeout(timer);
        done();
      }
    });
  });

  const emit = async (event: CourseIntelBroadcastEvent) => {
    try {
      await channel.send({
        type: "broadcast",
        event: "course_intel_progress",
        payload: {
          jobId,
          courseId,
          ts: new Date().toISOString(),
          ...event,
        },
      });
    } catch {
      // Ignore broadcast transport errors; DB state remains source of truth.
    }
  };

  const close = async () => {
    try {
      await supabase.removeChannel(channel);
    } catch {
      // Ignore close failures.
    }
  };

  return { emit, close };
}

function deriveSourceMode(item: Record<string, unknown> | null | undefined): CourseIntelSourceMode | null {
  const meta = item?.meta && typeof item.meta === "object" ? (item.meta as Record<string, unknown>) : {};
  const mode = typeof meta.source_mode === "string" ? meta.source_mode : typeof meta.sourceMode === "string" ? meta.sourceMode : null;
  return mode === "fresh" || mode === "existing" || mode === "auto" ? mode : null;
}

function stripActivityFromItem<T extends Record<string, unknown>>(item: T): T {
  const meta = item?.meta && typeof item.meta === "object" ? { ...(item.meta as Record<string, unknown>) } : null;
  if (meta && "activity" in meta) {
    delete meta.activity;
  }
  if (!meta) return item;
  return { ...item, meta } as T;
}

async function enrichJobsWithCourseIdentity(
  rows: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  if (rows.length === 0) return rows;
  const courseIds = Array.from(
    new Set(
      rows
        .map((row) => {
          const meta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : {};
          const parsed = Number(meta.course_id || 0);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
        })
        .filter((id) => id > 0)
    )
  );

  if (courseIds.length === 0) return rows;
  const admin = createAdminClient();
  const { data } = await admin
    .from("courses")
    .select("id, university, course_code")
    .in("id", courseIds);

  const courseMap = new Map<number, { university: string; course_code: string }>();
  for (const row of data || []) {
    const id = Number((row as { id?: number }).id || 0);
    if (!id) continue;
    courseMap.set(id, {
      university: String((row as { university?: string }).university || "").trim(),
      course_code: String((row as { course_code?: string }).course_code || "").trim(),
    });
  }

  return rows.map((row) => {
    const meta = row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : {};
    const courseId = Number(meta.course_id || 0);
    const course = courseMap.get(courseId);
    if (!course) return row;
    const courseLabel = `${course.university} ${course.course_code}`.trim();
    return {
      ...row,
      course_university: course.university,
      course_code: course.course_code,
      course_label: courseLabel,
    };
  });
}

async function executeCourseIntelJob(params: {
  jobId: number;
  userId: string;
  courseId: number;
  sourceMode: CourseIntelSourceMode;
  executionMode: CourseIntelExecutionMode;
}) {
  const { jobId, userId, courseId, sourceMode, executionMode } = params;
  const broadcaster = await createCourseIntelBroadcastEmitter(courseId, jobId);
  let cachedJob: CachedCourseIntelJob = {
    id: jobId,
    status: "queued",
    sourceMode,
    executionMode,
    meta: {
      course_id: courseId,
      source_mode: sourceMode,
      execution_mode: executionMode,
      progress: 0,
      activity: [],
    },
  };
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const dispatchProgressEvent = (event: {
    stage: string;
    message: string;
    progress?: number;
    details?: Record<string, unknown>;
  }) => {
    if (timedOut) return;
    const ts = new Date().toISOString();
    const nextActivityItem: ActivityItem = {
      ts,
      stage: event.stage,
      message: event.message,
      progress: event.progress,
      details: event.details,
    };

    const normalizedStage = String(event.stage || "").toLowerCase();
    const isTerminalProgress = typeof event.progress === "number" && event.progress >= 100;
    const isTerminalStage = normalizedStage === "done" || normalizedStage === "completed" || normalizedStage === "failed";
    const nextStatus = isTerminalProgress || isTerminalStage ? "completed" : "running";

    cachedJob = {
      ...cachedJob,
      status: nextStatus,
      meta: {
        ...cachedJob.meta,
        progress: typeof event.progress === "number" ? event.progress : cachedJob.meta.progress,
        activity: [...cachedJob.meta.activity, nextActivityItem].slice(-80),
      },
    };

    void appendCourseIntelJobActivity(jobId, nextActivityItem).catch(() => {});
    void setCachedCourseIntelJob(userId, courseId, cachedJob).catch(() => {});
    void broadcaster.emit({
      status: nextStatus,
      stage: event.stage,
      message: event.message,
      progress: event.progress,
      details: event.details,
    }).catch(() => {});
  };
  try {
    await markCourseIntelJobRunning(jobId);
    const startedEvent = {
      ts: new Date().toISOString(),
      stage: "running",
      message: "AI sync started.",
      progress: 3,
    };
    dispatchProgressEvent(startedEvent);

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        reject(new Error("AI sync timed out after 10 minutes. Job terminated."));
      }, COURSE_INTEL_JOB_TIMEOUT_MS);
    });

    const result = await Promise.race([
      runCourseIntel(userId, courseId, {
        sourceMode,
        executionMode,
        onProgress: async (event) => {
          if (timedOut) return;
          dispatchProgressEvent(event);
        },
      }),
      timeoutPromise,
    ]);

    await appendCourseIntelJobActivity(jobId, {
      ts: new Date().toISOString(),
      stage: "done",
      message: "AI sync completed.",
      progress: 100,
      details: {
        resources: result.resources.length,
        scheduleEntries: result.scheduleEntries,
        scheduleRowsPersisted: result.scheduleRowsPersisted,
        assignmentsCount: result.assignmentsCount,
        curatedTasks: result.curatedTasks,
        practicalPlanDays: result.practicalPlanDays,
        sourceMode: result.sourceMode,
        executionMode: result.executionMode,
      },
    });
    cachedJob = {
      ...cachedJob,
      status: "completed",
      completed_at: new Date().toISOString(),
      meta: {
        ...cachedJob.meta,
        progress: 100,
        activity: [
          ...cachedJob.meta.activity,
          {
            ts: new Date().toISOString(),
            stage: "done",
            message: "AI sync completed.",
            progress: 100,
          },
        ].slice(-40),
      },
    };
    await setCachedCourseIntelJob(userId, courseId, cachedJob);
    await broadcaster.emit({
      status: "completed",
      stage: "done",
      message: "AI sync completed.",
      progress: 100,
      details: {
        resources: result.resources.length,
        scheduleEntries: result.scheduleEntries,
        scheduleRowsPersisted: result.scheduleRowsPersisted,
        assignmentsCount: result.assignmentsCount,
        curatedTasks: result.curatedTasks,
        practicalPlanDays: result.practicalPlanDays,
        sourceMode: result.sourceMode,
        executionMode: result.executionMode,
      },
    });
    await completeCourseIntelJob(jobId, {
      course_id: courseId,
      resources: result.resources.length,
      scheduleEntries: result.scheduleEntries,
      scheduleRowsPersisted: result.scheduleRowsPersisted,
      assignmentsCount: result.assignmentsCount,
      curatedTasks: result.curatedTasks,
      practicalPlanDays: result.practicalPlanDays,
      sourceMode: result.sourceMode,
      executionMode: result.executionMode,
      totalMs: result.totalMs,
    });
  } catch (error) {
    await appendCourseIntelJobActivity(jobId, {
      ts: new Date().toISOString(),
      stage: "failed",
      message: error instanceof Error ? error.message : "AI sync failed.",
      progress: 100,
    });
    cachedJob = {
      ...cachedJob,
      status: "failed",
      completed_at: new Date().toISOString(),
      meta: {
        ...cachedJob.meta,
        progress: 100,
        activity: [
          ...cachedJob.meta.activity,
          {
            ts: new Date().toISOString(),
            stage: "failed",
            message: error instanceof Error ? error.message : "AI sync failed.",
            progress: 100,
          },
        ].slice(-40),
      },
    };
    await setCachedCourseIntelJob(userId, courseId, cachedJob);
    await broadcaster.emit({
      status: "failed",
      stage: "failed",
      message: error instanceof Error ? error.message : "AI sync failed.",
      progress: 100,
    });
    await failCourseIntelJob(jobId, error);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    await broadcaster.close();
  }
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = Number(request.nextUrl.searchParams.get("courseId") || 0);
  if (!courseId) {
    const items = await getRecentCourseIntelJobs(user.id, 15);
    const enrichedItems = await enrichJobsWithCourseIdentity(items as Array<Record<string, unknown>>);
    const enrichedActive = enrichedItems.filter((row) => row.status === "queued" || row.status === "running");
    return NextResponse.json({
      items: enrichedItems.map((row: Record<string, unknown>) =>
        stripActivityFromItem({ ...row, sourceMode: deriveSourceMode(row) || "auto" })
      ),
      active: enrichedActive.map((row: Record<string, unknown>) =>
        stripActivityFromItem({ ...row, sourceMode: deriveSourceMode(row) || "auto" })
      ),
      hasActive: enrichedActive.length > 0,
    });
  }

  const cached = await upstashGetJson<CachedCourseIntelJob>(courseIntelJobCacheKey(user.id, courseId));
  if (cached && typeof cached === "object") {
    const status = String(cached.status || "queued");
    if (status === "queued" || status === "running") {
      return NextResponse.json({ item: stripActivityFromItem(cached as Record<string, unknown>) });
    }
  }

  const job = await getLatestCourseIntelJob(user.id, courseId);
  const item = job ? { ...job, sourceMode: deriveSourceMode(job) || "auto" } : null;
  if (item && (item.status === "queued" || item.status === "running")) {
    await setCachedCourseIntelJob(user.id, courseId, item as CachedCourseIntelJob);
  } else if (!item) {
    await clearCachedCourseIntelJob(user.id, courseId);
  }
  return NextResponse.json({ item: item ? stripActivityFromItem(item as Record<string, unknown>) : null });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId, sourceMode, executionMode } = await request.json();
  const numericCourseId = Number(courseId || 0);
  if (!numericCourseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const normalizedSourceMode: CourseIntelSourceMode =
    sourceMode === "fresh" || sourceMode === "existing" || sourceMode === "auto" ? sourceMode : "auto";
  const normalizedExecutionMode: CourseIntelExecutionMode =
    executionMode === "local" || executionMode === "service" || executionMode === "deterministic"
      ? executionMode
      : "service";
  const supabase = createAdminClient();
  const { data: course } = await supabase
    .from("courses")
    .select("university")
    .eq("id", numericCourseId)
    .maybeSingle();

  const jobId = await startCourseIntelJob({
    userId: user.id,
    courseId: numericCourseId,
    university: String(course?.university || "course-intel"),
    sourceMode: normalizedSourceMode,
    executionMode: normalizedExecutionMode,
  });
  if (!jobId) {
    return NextResponse.json({ error: "Failed to create AI sync job" }, { status: 500 });
  }

  void executeCourseIntelJob({
    jobId,
    userId: user.id,
    courseId: numericCourseId,
    sourceMode: normalizedSourceMode,
    executionMode: normalizedExecutionMode,
  });

  const queuedItem: CachedCourseIntelJob = {
    id: jobId,
    status: "queued",
    sourceMode: normalizedSourceMode,
    executionMode: normalizedExecutionMode,
    meta: {
      course_id: numericCourseId,
      progress: 0,
      source_mode: normalizedSourceMode,
      execution_mode: normalizedExecutionMode,
      activity: [{ ts: new Date().toISOString(), stage: "queued", message: "AI sync queued.", progress: 0 }],
    },
  };
  await setCachedCourseIntelJob(user.id, numericCourseId, queuedItem);
  const queuedItemResponse = stripActivityFromItem(queuedItem as unknown as Record<string, unknown>);

  return NextResponse.json({
    success: true,
    jobId,
    item: queuedItemResponse,
  }, { status: 202 });
}
