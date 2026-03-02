import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { runCourseIntel } from "@/lib/ai/course-intel";
import {
  appendCourseIntelJobActivity,
  completeCourseIntelJob,
  failCourseIntelJob,
  getLatestCourseIntelJob,
  markCourseIntelJobRunning,
  startCourseIntelJob,
} from "@/lib/ai/course-intel-jobs";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = Number(request.nextUrl.searchParams.get("courseId") || 0);
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const job = await getLatestCourseIntelJob(user.id, courseId);
  return NextResponse.json({ item: job });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await request.json();
  const numericCourseId = Number(courseId || 0);
  if (!numericCourseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });
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
  });
  if (!jobId) {
    return NextResponse.json({ error: "Failed to create AI sync job" }, { status: 500 });
  }

  setTimeout(async () => {
    try {
      await markCourseIntelJobRunning(jobId);
      await appendCourseIntelJobActivity(jobId, {
        ts: new Date().toISOString(),
        stage: "running",
        message: "AI sync started.",
        progress: 3,
      });

      const result = await runCourseIntel(user.id, numericCourseId, {
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
          assignmentsCount: result.assignmentsCount,
        },
      });
      await completeCourseIntelJob(jobId, {
        course_id: numericCourseId,
        resources: result.resources.length,
        scheduleEntries: result.scheduleEntries,
        assignmentsCount: result.assignmentsCount,
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
  }, 0);

  return NextResponse.json({ success: true, jobId }, { status: 202 });
}
