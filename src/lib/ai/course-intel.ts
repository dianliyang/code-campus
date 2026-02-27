import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { resolveModelForProvider } from "@/lib/ai/models";
import { parseLenientJson } from "@/lib/ai/parse-json";
import { logAiUsage } from "@/lib/ai/log-usage";
import type { Json } from "@/lib/supabase/database.types";

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || "",
  baseURL: "https://api.perplexity.ai",
});

type AssignmentKind = "assignment" | "lab" | "exam" | "project" | "quiz" | "other";

type AssignmentRow = {
  course_id: number;
  syllabus_id: number | null;
  kind: AssignmentKind;
  label: string;
  due_on: string | null;
  url: string | null;
  description: string | null;
  source_sequence: string | null;
  source_row_date: string | null;
  metadata: Json;
  retrieved_at: string;
  updated_at: string;
};

function applyTemplate(template: string, values: Record<string, string>) {
  return template
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "")
    .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => values[key] ?? "");
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const d = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  return d;
}

function normalizeResources(input: unknown): string[] {
  const arr = Array.isArray(input) ? input : [];
  return Array.from(
    new Set(
      arr
        .filter((u): u is string => typeof u === "string")
        .map((u) => u.trim())
        .filter((u) => /^https?:\/\//i.test(u))
    )
  );
}

function toKind(kind: string): AssignmentKind {
  const k = kind.toLowerCase();
  if (k === "assignment") return "assignment";
  if (k === "lab") return "lab";
  if (k === "exam") return "exam";
  if (k === "project") return "project";
  if (k === "quiz") return "quiz";
  return "other";
}

function extractAssignmentsFromSchedule(
  courseId: number,
  syllabusId: number | null,
  scheduleArray: Array<Record<string, unknown>>,
  nowIso: string
): AssignmentRow[] {
  const rows: AssignmentRow[] = [];
  for (const entry of scheduleArray) {
    const sequence = typeof entry.sequence === "string" ? entry.sequence : null;
    const sourceRowDate = normalizeDate(entry.date);
    const buckets: Array<{ key: string; kind: AssignmentKind }> = [
      { key: "assignments", kind: "assignment" },
      { key: "labs", kind: "lab" },
      { key: "exams", kind: "exam" },
      { key: "projects", kind: "project" },
    ];
    for (const bucket of buckets) {
      const values = Array.isArray(entry[bucket.key]) ? (entry[bucket.key] as unknown[]) : [];
      for (const item of values) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        const label = typeof rec.label === "string" ? rec.label.trim() : "";
        if (!label) continue;
        rows.push({
          course_id: courseId,
          syllabus_id: syllabusId,
          kind: bucket.kind,
          label,
          due_on: normalizeDate(rec.due_date),
          url: typeof rec.url === "string" ? rec.url : null,
          description: typeof rec.description === "string" ? rec.description : null,
          source_sequence: sequence,
          source_row_date: sourceRowDate,
          metadata: {} as Json,
          retrieved_at: nowIso,
          updated_at: nowIso,
        });
      }
    }
  }
  return rows;
}

function extractTopLevelAssignments(
  courseId: number,
  syllabusId: number | null,
  input: unknown,
  nowIso: string
): AssignmentRow[] {
  const arr = Array.isArray(input) ? input : [];
  const rows: AssignmentRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    if (!label) continue;
    rows.push({
      course_id: courseId,
      syllabus_id: syllabusId,
      kind: toKind(typeof rec.kind === "string" ? rec.kind : "other"),
      label,
      due_on: normalizeDate(rec.due_on ?? rec.due_date),
      url: typeof rec.url === "string" ? rec.url : null,
      description: typeof rec.description === "string" ? rec.description : null,
      source_sequence: typeof rec.source_sequence === "string" ? rec.source_sequence : null,
      source_row_date: normalizeDate(rec.source_row_date),
      metadata: (rec.metadata && typeof rec.metadata === "object" ? rec.metadata : {}) as Json,
      retrieved_at: nowIso,
      updated_at: nowIso,
    });
  }
  return rows;
}

function dedupeAssignments(rows: AssignmentRow[]): AssignmentRow[] {
  const map = new Map<string, AssignmentRow>();
  for (const row of rows) {
    const key = `${row.kind}|${row.label.toLowerCase()}|${row.due_on || ""}`;
    if (!map.has(key)) map.set(key, row);
  }
  return Array.from(map.values());
}

export async function runCourseIntel(userId: string, courseId: number) {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("AI service not configured");
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, course_code, university, title, url, resources")
    .eq("id", courseId)
    .single();
  if (!course) throw new Error("Course not found");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_default_model, ai_course_intel_prompt_template, ai_course_update_prompt_template, ai_syllabus_prompt_template")
    .eq("id", userId)
    .maybeSingle();

  const template = String(profile?.ai_course_intel_prompt_template || "").trim()
    || [
      String(profile?.ai_course_update_prompt_template || "").trim(),
      String(profile?.ai_syllabus_prompt_template || "").trim(),
    ].filter(Boolean).join("\n\n");
  if (!template) throw new Error("Course intel prompt template not configured");

  const modelName = await resolveModelForProvider("perplexity", String(profile?.ai_default_model || "").trim());

  const knownUrls = [course.url, ...(Array.isArray(course.resources) ? course.resources : [])]
    .filter(Boolean) as string[];
  const resourcesContext = knownUrls.length > 0
    ? `Known course URLs:\n${knownUrls.map((u) => `- ${u}`).join("\n")}`
    : "";

  const prompt = applyTemplate(template, {
    course_code: String(course.course_code || ""),
    university: String(course.university || ""),
    title: String(course.title || ""),
    resources: resourcesContext,
  });

  const { text, usage } = await generateText({
    model: perplexity.chat(modelName),
    prompt,
    maxOutputTokens: 4096,
  });

  const parsed = parseLenientJson(text) as Record<string, unknown> | null;
  if (!parsed) throw new Error("AI returned no valid JSON");

  const parsedResources = normalizeResources(parsed.resources);
  const sourceUrl = typeof parsed.source_url === "string" ? parsed.source_url : null;
  const content = (parsed.content && typeof parsed.content === "object" ? parsed.content : {}) as Json;
  const scheduleArray = Array.isArray(parsed.schedule) ? (parsed.schedule as Array<Record<string, unknown>>) : [];
  const schedule = scheduleArray as Json;

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { error: courseUpdateError } = await admin
    .from("courses")
    .update({ resources: parsedResources })
    .eq("id", courseId);
  if (courseUpdateError) throw new Error(courseUpdateError.message);

  const { data: syllabusUpserted, error: syllabusError } = await admin
    .from("course_syllabi")
    .upsert(
      {
        course_id: courseId,
        source_url: sourceUrl,
        raw_text: text,
        content,
        schedule,
        retrieved_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "course_id" }
    )
    .select("id")
    .maybeSingle();
  if (syllabusError) throw new Error(syllabusError.message);

  const syllabusId = syllabusUpserted?.id ? Number(syllabusUpserted.id) : null;
  const assignmentsFromSchedule = extractAssignmentsFromSchedule(courseId, syllabusId, scheduleArray, nowIso);
  const topLevelAssignments = extractTopLevelAssignments(courseId, syllabusId, parsed.assignments, nowIso);
  const assignmentRows = dedupeAssignments([...assignmentsFromSchedule, ...topLevelAssignments]);

  const { error: deleteAssignmentsError } = await admin
    .from("course_assignments")
    .delete()
    .eq("course_id", courseId);
  if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message);

  if (assignmentRows.length > 0) {
    const { error: insertAssignmentsError } = await admin
      .from("course_assignments")
      .insert(assignmentRows);
    if (insertAssignmentsError) throw new Error(insertAssignmentsError.message);
  }

  await logAiUsage({
    userId,
    provider: "perplexity",
    model: modelName,
    feature: "course-intel",
    tokensInput: usage.inputTokens,
    tokensOutput: usage.outputTokens,
    prompt,
    responseText: text,
    requestPayload: { courseId, courseCode: course.course_code, university: course.university },
    responsePayload: {
      resourcesCount: parsedResources.length,
      scheduleEntries: scheduleArray.length,
      assignmentsCount: assignmentRows.length,
    },
  });

  return {
    resources: parsedResources,
    scheduleEntries: scheduleArray.length,
    assignmentsCount: assignmentRows.length,
  };
}
