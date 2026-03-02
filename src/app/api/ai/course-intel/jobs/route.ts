import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { runCourseIntel, type CourseIntelSourceMode } from "@/lib/ai/course-intel";
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

function deriveSourceMode(item: Record<string, unknown> | null | undefined): CourseIntelSourceMode | null {
  const meta = item?.meta && typeof item.meta === "object" ? (item.meta as Record<string, unknown>) : {};
  const mode = typeof meta.source_mode === "string" ? meta.source_mode : typeof meta.sourceMode === "string" ? meta.sourceMode : null;
  return mode === "fresh" || mode === "existing" || mode === "auto" ? mode : null;
}

async function executeCourseIntelJob(params: {
  jobId: number;
  userId: string;
  courseId: number;
  sourceMode: CourseIntelSourceMode;
}) {
  const { jobId, userId, courseId, sourceMode } = params;
  try {
    await markCourseIntelJobRunning(jobId);
    await appendCourseIntelJobActivity(jobId, {
      ts: new Date().toISOString(),
      stage: "running",
      message: "AI sync started.",
      progress: 3,
    });

    const result = await runCourseIntel(userId, courseId, {
      sourceMode,
      onProgress: async (event) => {
        await appendCourseIntelJobActivity(jobId, {
          ts: new Date().toISOString(),
          stage: event.stage,
          message: event.message,
          progress: event.progress,
          details: event.details,
        });
      },
    });

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
      totalMs: result.totalMs,
    });
  } catch (error) {
    await appendCourseIntelJobActivity(jobId, {
      ts: new Date().toISOString(),
      stage: "failed",
      message: error instanceof Error ? error.message : "AI sync failed.",
      progress: 100,
    });
    await failCourseIntelJob(jobId, error);
  }
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = Number(request.nextUrl.searchParams.get("courseId") || 0);
  if (!courseId) {
    const items = await getRecentCourseIntelJobs(user.id, 15);
    const active = items.filter((row: Record<string, unknown>) =>
      row.status === "queued" || row.status === "running"
    );
    return NextResponse.json({
      items: items.map((row: Record<string, unknown>) => ({ ...row, sourceMode: deriveSourceMode(row) || "auto" })),
      active: active.map((row: Record<string, unknown>) => ({ ...row, sourceMode: deriveSourceMode(row) || "auto" })),
      hasActive: active.length > 0,
    });
  }

  const job = await getLatestCourseIntelJob(user.id, courseId);
  return NextResponse.json({ item: job ? { ...job, sourceMode: deriveSourceMode(job) || "auto" } : null });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId, sourceMode } = await request.json();
  const numericCourseId = Number(courseId || 0);
  if (!numericCourseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
  const normalizedSourceMode: CourseIntelSourceMode =
    sourceMode === "fresh" || sourceMode === "existing" || sourceMode === "auto" ? sourceMode : "auto";
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
  });
  if (!jobId) {
    return NextResponse.json({ error: "Failed to create AI sync job" }, { status: 500 });
  }

  void executeCourseIntelJob({
    jobId,
    userId: user.id,
    courseId: numericCourseId,
    sourceMode: normalizedSourceMode,
  });

  return NextResponse.json({
    success: true,
    jobId,
    item: {
      id: jobId,
      status: "queued",
      sourceMode: normalizedSourceMode,
      meta: {
        course_id: numericCourseId,
        progress: 0,
        source_mode: normalizedSourceMode,
        activity: [{ ts: new Date().toISOString(), stage: "queued", message: "AI sync queued.", progress: 0, details: { sourceMode: normalizedSourceMode } }],
      },
    },
  }, { status: 202 });
}
