import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { runCourseIntel } from "@/lib/ai/course-intel";
import { getCourseIntelErrorStatus } from "@/lib/ai/course-intel-errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { courseId } = await request.json();
  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  try {
    const result = await runCourseIntel(user.id, Number(courseId));
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Course intel failed";
    const status = getCourseIntelErrorStatus(message);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
