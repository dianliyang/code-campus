import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { runCourseIntel } from "@/lib/ai/course-intel";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await request.json();
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  try {
    const result = await runCourseIntel(user.id, Number(courseId));
    return NextResponse.json({ success: true, scheduleEntries: result.scheduleEntries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    const status = /not configured|no valid json/i.test(message) ? 422 : 500;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
