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
    return NextResponse.json({ success: true, scheduleEntries: result.scheduleEntries });
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : "AI call failed";
    const message =
      /^unauthorized$/i.test(rawMessage) || /^forbidden$/i.test(rawMessage)
        ? "AI provider authentication failed. Check provider keys/permissions."
        : rawMessage;
    let status = getCourseIntelErrorStatus(rawMessage);
    if (status === 401 && /^unauthorized$/i.test(rawMessage)) status = 502;
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
