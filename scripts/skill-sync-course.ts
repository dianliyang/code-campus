import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { runCourseIntel, type CourseIntelSourceMode } from "@/lib/ai/course-intel";

type Args = {
  courseCode: string;
  userId: string | null;
  sourceMode: CourseIntelSourceMode;
  apiKey: string | null;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {
    courseCode: "",
    userId: null,
    sourceMode: "auto",
    apiKey: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if ((token === "--course-code" || token === "--course") && next) {
      out.courseCode = String(next).trim();
      i += 1;
      continue;
    }
    if (token === "--user-id" && next) {
      out.userId = String(next).trim();
      i += 1;
      continue;
    }
    if (token === "--source-mode" && next) {
      const mode = String(next).trim();
      out.sourceMode = mode === "fresh" || mode === "existing" || mode === "auto" ? mode : "auto";
      i += 1;
      continue;
    }
    if (token === "--api-key" && next) {
      out.apiKey = String(next).trim();
      i += 1;
    }
  }
  return out;
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function resolveUserId(supabase: ReturnType<typeof createAdminClient>, args: Args, courseId: number) {
  if (args.userId) return args.userId;

  if (args.apiKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const keyHash = hashKey(args.apiKey);
    const { data } = await db
      .from("user_api_keys")
      .select("user_id, is_active")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (data?.is_active === true && typeof data.user_id === "string" && data.user_id.trim()) {
      return data.user_id.trim();
    }
  }

  const { data: userCourse } = await supabase
    .from("user_courses")
    .select("user_id, status")
    .eq("course_id", courseId)
    .neq("status", "hidden")
    .limit(1)
    .maybeSingle();
  if (userCourse?.user_id) return String(userCourse.user_id);

  throw new Error("Cannot resolve user_id. Pass --user-id or provide an API key bound to user_api_keys.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.courseCode) {
    throw new Error("Missing --course-code");
  }

  const supabase = createAdminClient();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, course_code, university, title")
    .eq("course_code", args.courseCode)
    .maybeSingle();
  if (courseError) throw new Error(courseError.message);
  if (!course?.id) throw new Error(`Course not found: ${args.courseCode}`);

  const userId = await resolveUserId(supabase, args, Number(course.id));
  const courseLabel = `${String(course.university || "").trim()} ${String(course.course_code || "").trim()}`.trim();
  console.log(`[skill-sync] start course=${courseLabel} user=${userId} sourceMode=${args.sourceMode} executionMode=deterministic`);

  const result = await runCourseIntel(userId, Number(course.id), {
    sourceMode: args.sourceMode,
    executionMode: "deterministic",
    onProgress: (event) => {
      const p = typeof event.progress === "number" ? ` ${event.progress}%` : "";
      console.log(`[skill-sync]${p} ${event.stage}: ${event.message}`);
    },
  });

  console.log("[skill-sync] completed", JSON.stringify({
    courseId: course.id,
    courseCode: course.course_code,
    sourceMode: result.sourceMode,
    executionMode: result.executionMode,
    resources: result.resources.length,
    scheduleEntries: result.scheduleEntries,
    scheduleRowsPersisted: result.scheduleRowsPersisted,
    assignmentsCount: result.assignmentsCount,
    totalMs: result.totalMs,
  }));
}

main().catch((error) => {
  console.error(`[skill-sync] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

