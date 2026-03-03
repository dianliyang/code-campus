import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/server";
import { authorizeExternalRequest } from "@/lib/external-api-auth";
import { buildAssignmentsFromDailyPlan, buildCourseSchedulesFromDailyPlan, type DailyPlan } from "@/lib/ai/course-intel-plan";

type BodyShape = {
  userId?: string;
  course?: Record<string, unknown>;
  studyPlan?: Record<string, unknown>;
  syllabus?: Record<string, unknown>;
  plan?: DailyPlan;
  scheduleRows?: Array<Record<string, unknown>>;
  assignments?: Array<Record<string, unknown>>;
  replaceExisting?: boolean;
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function normalizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return /^https?:\/\//i.test(value) ? value : null;
}

function normalizeString(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  return value.length > 0 ? value : null;
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

function normalizeKind(input: unknown): string {
  const v = String(input || "").toLowerCase().trim();
  if (["assignment", "lab", "project", "quiz", "exam", "other"].includes(v)) return v;
  return "assignment";
}

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function validatePlan(plan: unknown): plan is DailyPlan {
  if (!plan || typeof plan !== "object") return false;
  const days = (plan as Record<string, unknown>).days;
  if (!Array.isArray(days) || days.length === 0) return false;
  for (const day of days) {
    if (!day || typeof day !== "object") return false;
    const date = (day as Record<string, unknown>).date;
    const tasks = (day as Record<string, unknown>).tasks;
    if (!isIsoDate(date) || !Array.isArray(tasks)) return false;
    for (const task of tasks) {
      if (!task || typeof task !== "object") return false;
      const title = normalizeString((task as Record<string, unknown>).title);
      if (!title) return false;
    }
  }
  return true;
}

async function resolveCourseByCode(courseCode: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_code, university, title, description, subdomain, url, resources, category, workload, difficulty, popularity, details")
    .eq("course_code", courseCode)
    .maybeSingle();
  if (error) throw new Error(`DB:${error.message}`);
  return data;
}

function isMissingCourseValue(current: unknown): boolean {
  if (current == null) return true;
  if (typeof current === "string") return current.trim().length === 0;
  if (Array.isArray(current)) return current.length === 0;
  if (typeof current === "object") return Object.keys(current as Record<string, unknown>).length === 0;
  return false;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ course_code: string }> }
) {
  const auth = await authorizeExternalRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { course_code: courseCode } = await params;
  if (!courseCode) return NextResponse.json({ error: "Invalid course_code" }, { status: 400 });

  try {
    const body = (await request.json().catch(() => ({}))) as BodyShape;
    const replaceExisting = body.replaceExisting !== false;
    const courseRow = await resolveCourseByCode(courseCode);
    if (!courseRow?.id) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const supabase = createAdminClient();
    const adminAny = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const courseId = Number(courseRow.id);
    const nowIso = new Date().toISOString();
    let effectiveUserId = normalizeString(body.userId);

    if (!effectiveUserId) {
      const reqApiKey = String(request.headers.get("x-api-key") || "").trim();
      const internalApiKey = String(process.env.INTERNAL_API_KEY || "").trim();
      if (reqApiKey && internalApiKey && reqApiKey !== internalApiKey) {
        const keyHash = hashKey(reqApiKey);
        const { data: keyRow } = await adminAny
          .from("user_api_keys")
          .select("user_id, is_active")
          .eq("key_hash", keyHash)
          .maybeSingle();
        if (keyRow?.is_active === true && typeof keyRow.user_id === "string" && keyRow.user_id.trim()) {
          effectiveUserId = keyRow.user_id.trim();
        }
      }
    }

    if (!effectiveUserId) {
      const { data: enrolled } = await supabase
        .from("user_courses")
        .select("user_id, status")
        .eq("course_id", courseId)
        .neq("status", "hidden")
        .limit(1)
        .maybeSingle();
      if (typeof enrolled?.user_id === "string" && enrolled.user_id.trim()) {
        effectiveUserId = enrolled.user_id.trim();
      }
    }

    // Validate plan payload when present.
    if (body.plan && !validatePlan(body.plan)) {
      return NextResponse.json(
        { error: "Invalid plan payload. Expected { days: [{ date: YYYY-MM-DD, tasks: [{ title, kind?, minutes? }] }] }" },
        { status: 400 }
      );
    }

    // 1) courses update
    const allowedCourseFields = [
      "title",
      "description",
      "subdomain",
      "url",
      "resources",
      "category",
      "workload",
      "difficulty",
      "popularity",
      "details",
    ] as const;
    const coursePatch: Record<string, unknown> = {};
    for (const key of allowedCourseFields) {
      if (body.course && key in body.course) {
        const currentValue = (courseRow as Record<string, unknown>)[key];
        if (!isMissingCourseValue(currentValue)) continue;
        if (key === "resources") {
          const next = normalizeStringArray(body.course.resources);
          if (next.length > 0) coursePatch.resources = next;
          continue;
        }
        if (key === "url") {
          const next = normalizeUrl(body.course.url);
          if (next) coursePatch.url = next;
          continue;
        }
        const next = body.course[key];
        if (!isMissingCourseValue(next)) {
          coursePatch[key] = next;
        }
      }
    }
    if (Object.keys(coursePatch).length > 0) {
      const { error } = await supabase.from("courses").update(coursePatch).eq("id", courseId);
      if (error) throw new Error(`DB:${error.message}`);
    }

    // 2) study_plans update (single current plan row per course/user in this API)
    let studyPlanRows = 0;
    if (body.studyPlan) {
      if (!effectiveUserId) {
        return NextResponse.json({ error: "userId is required when submitting studyPlan" }, { status: 400 });
      }
      const startDate = body.studyPlan.startDate;
      const endDate = body.studyPlan.endDate;
      if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
        return NextResponse.json({ error: "studyPlan.startDate and studyPlan.endDate must be YYYY-MM-DD" }, { status: 400 });
      }
      if (replaceExisting) {
        const { error } = await supabase
          .from("study_plans")
          .delete()
          .eq("course_id", courseId)
          .eq("user_id", effectiveUserId);
        if (error) throw new Error(`DB:${error.message}`);
      }
      const insertRow = {
        course_id: courseId,
        user_id: effectiveUserId,
        start_date: startDate,
        end_date: endDate,
        days_of_week: Array.isArray(body.studyPlan.daysOfWeek) ? body.studyPlan.daysOfWeek : [1, 2, 3, 4, 5],
        start_time: normalizeString(body.studyPlan.startTime) || "19:00:00",
        end_time: normalizeString(body.studyPlan.endTime) || "21:00:00",
        location: normalizeString(body.studyPlan.location),
        kind: normalizeString(body.studyPlan.kind) || "generated",
        timezone: normalizeString(body.studyPlan.timezone) || "UTC",
      };
      const { error } = await supabase.from("study_plans").insert(insertRow);
      if (error) throw new Error(`DB:${error.message}`);
      studyPlanRows = 1;
    }

    // 3) course_syllabi update
    const syllabusPayload = body.syllabus || {};
    const upsertSyllabus = {
      course_id: courseId,
      source_url: normalizeUrl(syllabusPayload.sourceUrl),
      raw_text: normalizeString(syllabusPayload.rawText),
      content: (syllabusPayload.content && typeof syllabusPayload.content === "object" ? syllabusPayload.content : {}) as Json,
      schedule: (Array.isArray(syllabusPayload.schedule) ? syllabusPayload.schedule : []) as Json,
      retrieved_at: nowIso,
      updated_at: nowIso,
    };
    const { data: syllabusUpserted, error: syllabusError } = await supabase
      .from("course_syllabi")
      .upsert(upsertSyllabus, { onConflict: "course_id" })
      .select("id")
      .maybeSingle();
    if (syllabusError) throw new Error(`DB:${syllabusError.message}`);
    const syllabusId = Number(syllabusUpserted?.id || 0) || null;

    // 4) course_schedules update
    let scheduleRowsToInsert: Array<Record<string, unknown>> = [];
    if (Array.isArray(body.scheduleRows) && body.scheduleRows.length > 0) {
      scheduleRowsToInsert = body.scheduleRows
        .map((row) => ({
          course_id: courseId,
          syllabus_id: syllabusId,
          schedule_date: isIsoDate(row.schedule_date) ? row.schedule_date : row.date,
          focus: normalizeString(row.focus),
          task_kind: normalizeString(row.task_kind || row.kind),
          task_title: normalizeString(row.task_title || row.title),
          duration_minutes: Number.isFinite(Number(row.duration_minutes ?? row.durationMinutes))
            ? Number(row.duration_minutes ?? row.durationMinutes)
            : null,
          source: normalizeString(row.source) || "external_plan_submit",
          metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Json,
          retrieved_at: nowIso,
          updated_at: nowIso,
        }))
        .filter((row) => isIsoDate(row.schedule_date) && row.task_title);
    } else if (body.plan) {
      scheduleRowsToInsert = buildCourseSchedulesFromDailyPlan({
        courseId,
        syllabusId,
        plan: body.plan,
        nowIso,
      }) as Array<Record<string, unknown>>;
    }

    if (replaceExisting) {
      const { error } = await adminAny.from("course_schedules").delete().eq("course_id", courseId);
      if (error) throw new Error(`DB:${error.message}`);
    }
    let insertedScheduleRows: Array<Record<string, unknown>> = [];
    if (scheduleRowsToInsert.length > 0) {
      const { data, error } = await adminAny
        .from("course_schedules")
        .insert(scheduleRowsToInsert)
        .select("id, schedule_date, task_title, task_kind");
      if (error) throw new Error(`DB:${error.message}`);
      insertedScheduleRows = Array.isArray(data) ? data : [];
    }

    const scheduleBinding = new Map<string, number>();
    for (const row of insertedScheduleRows) {
      const date = isIsoDate(row.schedule_date) ? row.schedule_date : null;
      const title = normalizeString(row.task_title)?.toLowerCase() || "";
      const kind = normalizeString(row.task_kind)?.toLowerCase() || "";
      const id = Number(row.id || 0);
      if (!date || !title || !id) continue;
      scheduleBinding.set(`${date}|${title}|${kind}`, id);
    }

    // 5) course_assignments update
    let assignmentsToInsert: Array<{
      course_id: number;
      syllabus_id: number | null;
      course_schedule_id: number | null;
      kind: string;
      label: string;
      due_on: string | null;
      url: string | null;
      description: string | null;
      source_sequence: string | null;
      source_row_date: string | null;
      metadata: Json;
      retrieved_at: string;
      updated_at: string;
    }> = [];
    if (Array.isArray(body.assignments) && body.assignments.length > 0) {
      assignmentsToInsert = body.assignments
        .map((row) => {
          const label = normalizeString(row.label || row.title);
          const due = isIsoDate(row.due_on) ? row.due_on : isIsoDate(row.dueOn) ? row.dueOn : null;
          const kind = normalizeKind(row.kind);
          const key = `${due || ""}|${String(label || "").toLowerCase()}|${kind}`;
          return {
            course_id: courseId,
            syllabus_id: syllabusId,
            course_schedule_id: Number(row.course_schedule_id || row.courseScheduleId || scheduleBinding.get(key) || 0) || null,
            kind,
            label,
            due_on: due,
            url: normalizeUrl(row.url),
            description: normalizeString(row.description),
            source_sequence: normalizeString(row.source_sequence || row.sourceSequence),
            source_row_date: isIsoDate(row.source_row_date) ? row.source_row_date : isIsoDate(row.sourceRowDate) ? row.sourceRowDate : due,
            metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Json,
            retrieved_at: nowIso,
            updated_at: nowIso,
          };
        })
        .filter((row): row is {
          course_id: number;
          syllabus_id: number | null;
          course_schedule_id: number | null;
          kind: string;
          label: string;
          due_on: string | null;
          url: string | null;
          description: string | null;
          source_sequence: string | null;
          source_row_date: string | null;
          metadata: Json;
          retrieved_at: string;
          updated_at: string;
        } => typeof row.label === "string" && row.label.trim().length > 0);
    } else if (body.plan) {
      assignmentsToInsert = buildAssignmentsFromDailyPlan({
        courseId,
        syllabusId,
        plan: body.plan,
        nowIso,
      }).map((row) => ({
        ...row,
        kind: String(row.kind || "assignment"),
        metadata: (row.metadata || {}) as Json,
      }));
    }

    if (replaceExisting) {
      const { error } = await supabase.from("course_assignments").delete().eq("course_id", courseId);
      if (error) throw new Error(`DB:${error.message}`);
    }
    if (assignmentsToInsert.length > 0) {
      const { error } = await supabase.from("course_assignments").insert(assignmentsToInsert);
      if (error) throw new Error(`DB:${error.message}`);
    }

    return NextResponse.json({
      success: true,
      course: {
        id: courseId,
        code: courseRow.course_code,
        university: courseRow.university,
        title: courseRow.title,
      },
      writes: {
        coursesUpdated: Object.keys(coursePatch).length > 0,
        studyPlansInserted: studyPlanRows,
        syllabusUpserted: true,
        scheduleRowsInserted: insertedScheduleRows.length,
        assignmentsInserted: assignmentsToInsert.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.startsWith("DB:")) {
      return NextResponse.json({ error: "Database error", details: message.replace(/^DB:/, "") }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
