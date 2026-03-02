import { NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { getLatestCourseIntelJob, getRecentCourseIntelJobs } from "@/lib/ai/course-intel-jobs";

export const runtime = "nodejs";

function sse(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const courseId = Number(request.nextUrl.searchParams.get("courseId") || 0);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let lastFingerprint = "";

      const push = (event: string, payload: unknown) => {
        if (isClosed) return;
        controller.enqueue(encoder.encode(sse(event, payload)));
      };

      const tick = async () => {
        if (isClosed) return;
        try {
          if (courseId > 0) {
            const item = await getLatestCourseIntelJob(user.id, courseId);
            const payload = { item };
            const fp = JSON.stringify(payload);
            if (fp !== lastFingerprint) {
              push("job", payload);
              lastFingerprint = fp;
            }
          } else {
            const items = await getRecentCourseIntelJobs(user.id, 15);
            const active = items.filter((row: Record<string, unknown>) =>
              row.status === "queued" || row.status === "running"
            );
            const payload = { items, active, hasActive: active.length > 0 };
            const fp = JSON.stringify(payload);
            if (fp !== lastFingerprint) {
              push("jobs", payload);
              lastFingerprint = fp;
            }
          }
          push("ping", { ts: new Date().toISOString() });
        } catch (error) {
          push("error", { message: error instanceof Error ? error.message : "Stream error" });
        } finally {
          timer = setTimeout(tick, 1500);
        }
      };

      void tick();

      request.signal.addEventListener("abort", () => {
        isClosed = true;
        if (timer) clearTimeout(timer);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
