"use server";

import { createAdminClient, getUser, createClient, mapCourseFromRow } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { rateLimit } from "@/lib/rate-limit";
import { GEMINI_MODEL_SET, PERPLEXITY_MODEL_SET } from "@/lib/ai/models";
import { DEFAULT_COURSE_DESCRIPTION_PROMPT, DEFAULT_STUDY_PLAN_PROMPT } from "@/lib/ai/prompts";
import { Course } from "@/types";

function applyPromptTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}

export async function updateCourse(courseId: number, data: {
  university: string;
  courseCode: string;
  title: string;
  units: string;
  description: string;
  url: string;
  department: string;
  corequisites: string;
  level: string;
  difficulty: number;
  popularity: number;
  workload: string;
  isHidden: boolean;
  isInternal: boolean;
  prerequisites?: string;
  relatedUrls?: string[];
  crossListedCourses?: string;
  details?: Record<string, unknown>;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  let mergedDetails: Record<string, unknown> = {};
  const { data: existing } = await supabase
    .from("courses")
    .select("details")
    .eq("id", courseId)
    .single();

  const existingDetails =
    typeof existing?.details === "string"
      ? JSON.parse(existing.details)
      : existing?.details || {};

  mergedDetails = { ...existingDetails, ...(data.details || {}) };
  delete mergedDetails.prerequisites;
  delete mergedDetails.relatedUrls;
  delete mergedDetails.crossListedCourses;
  delete mergedDetails.instructors;

  const { error } = await supabase
    .from("courses")
    .update({
      university: data.university,
      course_code: data.courseCode,
      title: data.title,
      units: data.units,
      description: data.description,
      url: data.url,
      department: data.department,
      corequisites: data.corequisites,
      level: data.level,
      difficulty: data.difficulty,
      popularity: data.popularity,
      workload: data.workload,
      is_hidden: data.isHidden,
      is_internal: data.isInternal,
      prerequisites: data.prerequisites || null,
      related_urls: data.relatedUrls || [],
      cross_listed_courses: data.crossListedCourses || null,
      details: JSON.stringify(mergedDetails),
    })
    .eq("id", courseId);

  if (error) {
    console.error("Failed to update course:", error);
    throw new Error("Failed to update course");
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

export async function deleteCourse(courseId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  // Delete related rows to avoid FK constraints
  await supabase.from("study_plans").delete().eq("course_id", courseId);
  await supabase.from("user_courses").delete().eq("course_id", courseId);
  await supabase.from("course_fields").delete().eq("course_id", courseId);
  await supabase.from("course_semesters").delete().eq("course_id", courseId);

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) {
    console.error("Failed to delete course:", error);
    throw new Error("Failed to delete course");
  }

  revalidatePath("/courses");
}

export async function updateCourseDescription(courseId: number, description: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("courses")
    .update({ description })
    .eq("id", courseId);

  if (error) {
    console.error("Failed to update course description:", error);
    throw new Error("Failed to update course description");
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
}

interface EditableStudyPlanInput {
  id?: number;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  type: string;
}

interface UpdateCourseFullInput {
  university: string;
  courseCode: string;
  title: string;
  units: string;
  credit: number | null;
  description: string;
  url: string;
  department: string;
  corequisites: string;
  level: string;
  difficulty: number;
  popularity: number;
  workload: string;
  isHidden: boolean;
  isInternal: boolean;
  prerequisites: string;
  relatedUrls: string[];
  crossListedCourses: string;
  detailsJson: string;
  instructors: string[];
  topics: string[];
  semesters: string[];
  studyPlans: EditableStudyPlanInput[];
  removedStudyPlanIds: number[];
}

function parseSemesterLabel(label: string): { term: string; year: number } | null {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  return {
    term: match[1],
    year: Number(match[2]),
  };
}

const DAY_NAME_MAP: Array<{ regex: RegExp; day: number }> = [
  { regex: /\bmon(?:day)?\b/gi, day: 1 },
  { regex: /\btue(?:s|sday)?\b/gi, day: 2 },
  { regex: /\bwed(?:nesday)?\b/gi, day: 3 },
  { regex: /\bthu(?:r|rs|rsday)?\b/gi, day: 4 },
  { regex: /\bfri(?:day)?\b/gi, day: 5 },
  { regex: /\bsat(?:urday)?\b/gi, day: 6 },
  { regex: /\bsun(?:day)?\b/gi, day: 0 },
];

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultPlanDateRange() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 90);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function normalizeTimeToken(raw: string, fallbackSuffix?: "am" | "pm") {
  const trimmed = raw.trim().toLowerCase().replace(/\s+/g, "");
  const explicitSuffixMatch = trimmed.match(/(am|pm)$/);
  const suffix = (explicitSuffixMatch?.[1] as "am" | "pm" | undefined) || fallbackSuffix;
  const numeric = trimmed.replace(/(am|pm)$/i, "");
  const [h, m] = numeric.split(":");
  let hour = Number(h);
  const minute = Number(m ?? "0");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function parseDays(prefix: string) {
  const found = new Set<number>();
  DAY_NAME_MAP.forEach(({ regex, day }) => {
    if (regex.test(prefix)) found.add(day);
  });

  const compact = prefix.match(/\b[MTWRFSU]{2,7}\b/i)?.[0]?.toUpperCase();
  if (compact) {
    for (const ch of compact) {
      if (ch === "M") found.add(1);
      if (ch === "T") found.add(2);
      if (ch === "W") found.add(3);
      if (ch === "R") found.add(4);
      if (ch === "F") found.add(5);
      if (ch === "S") found.add(6);
      if (ch === "U") found.add(0);
    }
  }

  return Array.from(found).sort((a, b) => a - b);
}

function parseScheduleLine(line: string, fallbackType: string) {
  const text = line.trim();
  if (!text) return null;

  const timeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|–|—|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (!timeMatch || typeof timeMatch.index !== "number") return null;

  const beforeTime = text.slice(0, timeMatch.index).trim();
  const days = parseDays(beforeTime || text);
  if (days.length === 0) return null;

  const firstSuffix = timeMatch[1].toLowerCase().includes("pm")
    ? "pm"
    : timeMatch[1].toLowerCase().includes("am")
      ? "am"
      : undefined;
  const startTime = normalizeTimeToken(timeMatch[1], firstSuffix);
  const endTime = normalizeTimeToken(timeMatch[2], firstSuffix);
  if (!startTime || !endTime) return null;

  const location = (text.match(/(?:@|in|room)\s+([^,;]+)$/i)?.[1] || "").trim();
  return {
    daysOfWeek: days,
    startTime,
    endTime,
    location: location || "TBD",
    type: fallbackType || "class",
  };
}

function planKey(plan: {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  type: string;
}) {
  return [
    (plan.daysOfWeek || []).join(","),
    plan.startTime,
    plan.endTime,
    plan.location || "",
    plan.type || "",
  ].join("|");
}

function extractJsonArray(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed;
  }
  const match = trimmed.match(/\[[\s\S]*\]/);
  return match?.[0] || null;
}

export interface SchedulePlanPreview {
  sourceType: string;
  sourceLine: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  startDate: string;
  endDate: string;
  alreadyExists: boolean;
}

export async function previewStudyPlansFromCourseSchedule(courseId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();
  const { data: courseRow, error: courseError } = await supabase
    .from("courses")
    .select("details")
    .eq("id", courseId)
    .single();

  if (courseError || !courseRow) {
    throw new Error("Course not found");
  }

  const details =
    typeof courseRow.details === "string"
      ? (JSON.parse(courseRow.details) as Record<string, unknown>)
      : (courseRow.details as Record<string, unknown> | null) || {};
  const rawSchedule = details.schedule;
  if (!rawSchedule || typeof rawSchedule !== "object" || Array.isArray(rawSchedule)) {
    throw new Error("No schedule found in course details");
  }

  const scheduleEntries = Object.entries(rawSchedule as Record<string, unknown>);
  const originalSchedule = scheduleEntries.flatMap(([kind, values]) =>
    Array.isArray(values)
      ? values.filter((v): v is string => typeof v === "string").map((line) => ({ type: kind, line }))
      : [],
  );

  const { startDate, endDate } = defaultPlanDateRange();
  const fallbackParsed = scheduleEntries.flatMap(([kind, values]) => {
    if (!Array.isArray(values)) return [];
    return values.flatMap((entry) => {
      if (typeof entry !== "string") return [];
      const parsed = parseScheduleLine(entry, kind);
      if (!parsed) return [];
      return [{ ...parsed, sourceType: kind, sourceLine: entry }];
    })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_provider, ai_default_model, ai_web_search_enabled, ai_study_plan_prompt_template")
    .eq("id", user.id)
    .maybeSingle();

  const provider = profile?.ai_provider === "gemini" ? "gemini" : "perplexity";
  const selectedModel = (profile?.ai_default_model || "sonar").trim();
  const model = provider === "gemini"
    ? (GEMINI_MODEL_SET.has(selectedModel) ? selectedModel : "gemini-2.0-flash")
    : (PERPLEXITY_MODEL_SET.has(selectedModel) ? selectedModel : "sonar");
  const webSearchEnabled = profile?.ai_web_search_enabled ?? false;
  const promptTemplate = (profile?.ai_study_plan_prompt_template || "").trim() || DEFAULT_STUDY_PLAN_PROMPT;
  const prompt = applyPromptTemplate(promptTemplate, {
    schedule_lines: originalSchedule.map((s) => `- ${s.type}: ${s.line}`).join("\n"),
  });

  let aiParsed: Array<{
    sourceType: string;
    sourceLine: string;
    daysOfWeek: number[];
    startDate?: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    location: string;
    type: string;
  }> = [];

  try {
    const response = provider === "gemini"
      ? await (async () => {
          if (!process.env.GEMINI_API_KEY) throw new Error("missing gemini key");
          return fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: "Return only valid JSON array." }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 1400 },
                tools: webSearchEnabled ? [{ google_search: {} }] : undefined,
              }),
            },
          );
        })()
      : await (async () => {
          if (!process.env.PERPLEXITY_API_KEY) throw new Error("missing perplexity key");
          return fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: "Return only a valid JSON array." },
                { role: "user", content: prompt },
              ],
              temperature: 0.1,
              max_tokens: 1400,
              disable_search: !webSearchEnabled,
              return_images: false,
              return_related_questions: false,
            }),
          });
        })();

    if (response.ok) {
      const json = (await response.json()) as
        | { choices?: Array<{ message?: { content?: string } }> }
        | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

      const aiText = provider === "gemini"
        ? (
            (json as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
              .candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n")
              .trim() || ""
          )
        : (
            (json as { choices?: Array<{ message?: { content?: string } }> })
              .choices?.[0]?.message?.content?.trim() || ""
          );

      const maybeArray = extractJsonArray(aiText);
      if (maybeArray) {
        const parsed = JSON.parse(maybeArray) as unknown;
        if (Array.isArray(parsed)) {
          aiParsed = parsed
            .filter((item): item is {
              sourceType: string;
              sourceLine: string;
              daysOfWeek: number[];
              startDate?: string;
              endDate?: string;
              startTime: string;
              endTime: string;
              location: string;
              type: string;
            } =>
              !!item &&
              typeof item === "object" &&
              Array.isArray((item as { daysOfWeek?: unknown }).daysOfWeek) &&
              typeof (item as { startTime?: unknown }).startTime === "string" &&
              typeof (item as { endTime?: unknown }).endTime === "string" &&
              typeof (item as { sourceLine?: unknown }).sourceLine === "string" &&
              typeof (item as { sourceType?: unknown }).sourceType === "string",
            )
            .map((item) => ({
              sourceType: item.sourceType,
              sourceLine: item.sourceLine,
              daysOfWeek: item.daysOfWeek.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
              startDate: typeof item.startDate === "string" ? item.startDate : undefined,
              endDate: typeof item.endDate === "string" ? item.endDate : undefined,
              startTime: normalizeTimeToken(item.startTime) || item.startTime,
              endTime: normalizeTimeToken(item.endTime) || item.endTime,
              location: item.location || "TBD",
              type: item.type || item.sourceType || "class",
            }))
            .filter((item) => item.daysOfWeek.length > 0 && !!item.startTime && !!item.endTime);
        }
      }
    }
  } catch {
    // fallback parser below
  }

  const parsedCandidates = aiParsed.length > 0 ? aiParsed : fallbackParsed;
  if (parsedCandidates.length === 0) {
    throw new Error("Schedule exists but could not parse meeting times");
  }

  const { data: existingPlans } = await supabase
    .from("study_plans")
    .select("days_of_week, start_time, end_time, location, type")
    .eq("user_id", user.id)
    .eq("course_id", courseId);

  const existingKeys = new Set((existingPlans || []).map((p) => planKey({
    daysOfWeek: p.days_of_week || [],
    startTime: p.start_time || "",
    endTime: p.end_time || "",
    location: p.location || "",
    type: p.type || "",
  })));

  const generatedPlans: SchedulePlanPreview[] = parsedCandidates.map((p) => ({
    sourceType: p.sourceType,
    sourceLine: p.sourceLine,
    daysOfWeek: p.daysOfWeek,
    startTime: p.startTime,
    endTime: p.endTime,
    location: p.location,
    type: p.type,
    startDate: ("startDate" in p && typeof p.startDate === "string" && p.startDate) ? p.startDate : startDate,
    endDate: ("endDate" in p && typeof p.endDate === "string" && p.endDate) ? p.endDate : endDate,
    alreadyExists: existingKeys.has(planKey(p)),
  }));

  return { originalSchedule, generatedPlans };
}

export async function confirmGeneratedStudyPlans(courseId: number, selectedPlans: Array<{
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  startDate: string;
  endDate: string;
}>) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!Array.isArray(selectedPlans) || selectedPlans.length === 0) {
    return { created: 0 };
  }

  const supabase = createAdminClient();
  const { data: existingPlans } = await supabase
    .from("study_plans")
    .select("days_of_week, start_time, end_time, location, type")
    .eq("user_id", user.id)
    .eq("course_id", courseId);

  const existingKeys = new Set((existingPlans || []).map((p) => planKey({
    daysOfWeek: p.days_of_week || [],
    startTime: p.start_time || "",
    endTime: p.end_time || "",
    location: p.location || "",
    type: p.type || "",
  })));

  const dedupe = new Set<string>();
  const toInsert = selectedPlans
    .map((p) => ({
      user_id: user.id,
      course_id: courseId,
      start_date: p.startDate,
      end_date: p.endDate,
      days_of_week: p.daysOfWeek,
      start_time: p.startTime,
      end_time: p.endTime,
      location: p.location,
      type: p.type,
    }))
    .filter((plan) => {
      const key = planKey({
        daysOfWeek: plan.days_of_week || [],
        startTime: plan.start_time,
        endTime: plan.end_time,
        location: plan.location || "",
        type: plan.type || "",
      });
      if (existingKeys.has(key) || dedupe.has(key)) return false;
      dedupe.add(key);
      return true;
    });

  if (toInsert.length === 0) {
    return { created: 0, selected: selectedPlans.length };
  }

  const { error: insertError } = await supabase.from("study_plans").insert(toInsert);
  if (insertError) {
    console.error("Failed to generate study plans from schedule:", insertError);
    throw new Error("Failed to generate study plans");
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/study-plan");
  return { created: toInsert.length, selected: selectedPlans.length };
}

export interface BulkCoursePreview {
  courseId: number;
  courseCode: string;
  courseTitle: string;
  originalSchedule: Array<{ type: string; line: string }>;
  generatedPlans: SchedulePlanPreview[];
}

export async function bulkPreviewStudyPlans(courseIds: number[]): Promise<BulkCoursePreview[]> {
  if (!courseIds.length) return [];

  const results: BulkCoursePreview[] = [];

  for (const courseId of courseIds) {
    try {
      const preview = await previewStudyPlansFromCourseSchedule(courseId);
      const supabase = createAdminClient();
      const { data: courseRow } = await supabase
        .from("courses")
        .select("course_code, title")
        .eq("id", courseId)
        .single();

      results.push({
        courseId,
        courseCode: courseRow?.course_code || String(courseId),
        courseTitle: courseRow?.title || "Unknown",
        originalSchedule: preview.originalSchedule,
        generatedPlans: preview.generatedPlans,
      });
    } catch (err) {
      console.warn(`[bulkPreview] Skipping course ${courseId}:`, err instanceof Error ? err.message : err);
    }
  }

  return results;
}

export async function updateCourseFull(courseId: number, input: UpdateCourseFullInput) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  let parsedDetails: Record<string, unknown> = {};
  try {
    parsedDetails = input.detailsJson.trim() ? JSON.parse(input.detailsJson) : {};
  } catch {
    throw new Error("Invalid details JSON");
  }

  delete parsedDetails.instructors;
  delete parsedDetails.prerequisites;
  delete parsedDetails.relatedUrls;
  delete parsedDetails.crossListedCourses;

  const { error: courseError } = await supabase
    .from("courses")
    .update({
      university: input.university,
      course_code: input.courseCode,
      title: input.title,
      units: input.units,
      credit: input.credit,
      description: input.description,
      url: input.url,
      department: input.department,
      corequisites: input.corequisites,
      level: input.level,
      difficulty: input.difficulty,
      popularity: input.popularity,
      workload: input.workload,
      is_hidden: input.isHidden,
      is_internal: input.isInternal,
      prerequisites: input.prerequisites || null,
      related_urls: input.relatedUrls || [],
      cross_listed_courses: input.crossListedCourses || null,
      details: JSON.stringify(parsedDetails),
      instructors: input.instructors,
    })
    .eq("id", courseId);

  if (courseError) {
    console.error("Failed to update course:", courseError);
    throw new Error("Failed to update course");
  }

  const topicNames = Array.from(
    new Set(input.topics.map((name) => name.trim()).filter((name) => name.length > 0)),
  );

  if (topicNames.length > 0) {
    const { error: insertFieldsError } = await supabase
      .from("fields")
      .upsert(topicNames.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
    if (insertFieldsError) {
      console.error("Failed to upsert fields:", insertFieldsError);
      throw new Error("Failed to update topics");
    }
  }

  const { data: topicRows, error: topicFetchError } = await supabase
    .from("fields")
    .select("id, name")
    .in("name", topicNames.length > 0 ? topicNames : ["__no_topic__"]);
  if (topicFetchError) {
    console.error("Failed to fetch topic ids:", topicFetchError);
    throw new Error("Failed to update topics");
  }

  const { error: clearTopicsError } = await supabase
    .from("course_fields")
    .delete()
    .eq("course_id", courseId);
  if (clearTopicsError) {
    console.error("Failed to clear course topics:", clearTopicsError);
    throw new Error("Failed to update topics");
  }

  if ((topicRows || []).length > 0) {
    const { error: insertCourseFieldsError } = await supabase
      .from("course_fields")
      .insert((topicRows || []).map((row) => ({ course_id: courseId, field_id: row.id })));
    if (insertCourseFieldsError) {
      console.error("Failed to update course topics:", insertCourseFieldsError);
      throw new Error("Failed to update topics");
    }
  }

  const semesterPairs = Array.from(
    new Set(input.semesters.map((label) => label.trim()).filter((label) => label.length > 0)),
  )
    .map(parseSemesterLabel)
    .filter((v): v is { term: string; year: number } => v !== null);

  if (semesterPairs.length > 0) {
    const { error: upsertSemestersError } = await supabase
      .from("semesters")
      .upsert(semesterPairs, { onConflict: "term,year", ignoreDuplicates: true });
    if (upsertSemestersError) {
      console.error("Failed to upsert semesters:", upsertSemestersError);
      throw new Error("Failed to update semesters");
    }
  }

  const { error: clearSemestersError } = await supabase
    .from("course_semesters")
    .delete()
    .eq("course_id", courseId);
  if (clearSemestersError) {
    console.error("Failed to clear course semesters:", clearSemestersError);
    throw new Error("Failed to update semesters");
  }

  for (const sem of semesterPairs) {
    const { data: semRow, error: semFetchError } = await supabase
      .from("semesters")
      .select("id")
      .eq("term", sem.term)
      .eq("year", sem.year)
      .single();
    if (semFetchError || !semRow) {
      console.error("Failed to fetch semester id:", semFetchError);
      throw new Error("Failed to update semesters");
    }

    const { error: linkError } = await supabase
      .from("course_semesters")
      .insert({ course_id: courseId, semester_id: semRow.id });
    if (linkError) {
      console.error("Failed to link course semester:", linkError);
      throw new Error("Failed to update semesters");
    }
  }

  if (input.removedStudyPlanIds.length > 0) {
    const { error: removePlansError } = await supabase
      .from("study_plans")
      .delete()
      .in("id", input.removedStudyPlanIds)
      .eq("user_id", user.id)
      .eq("course_id", courseId);
    if (removePlansError) {
      console.error("Failed to remove study plans:", removePlansError);
      throw new Error("Failed to update study plans");
    }
  }

  for (const plan of input.studyPlans) {
    const payload = {
      user_id: user.id,
      course_id: courseId,
      start_date: plan.startDate,
      end_date: plan.endDate,
      days_of_week: plan.daysOfWeek,
      start_time: plan.startTime,
      end_time: plan.endTime,
      location: plan.location,
      type: plan.type || null,
      updated_at: new Date().toISOString(),
    };

    if (plan.id) {
      const { error: updatePlanError } = await supabase
        .from("study_plans")
        .update(payload)
        .eq("id", plan.id)
        .eq("user_id", user.id)
        .eq("course_id", courseId);
      if (updatePlanError) {
        console.error("Failed to update study plan:", updatePlanError);
        throw new Error("Failed to update study plans");
      }
    } else {
      const { error: insertPlanError } = await supabase
        .from("study_plans")
        .insert(payload);
      if (insertPlanError) {
        console.error("Failed to create study plan:", insertPlanError);
        throw new Error("Failed to update study plans");
      }
    }
  }

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/courses");
  revalidatePath("/study-plan");
}

export async function regenerateCourseDescription(courseId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { success: withinLimit } = rateLimit(`ai:course-description:${user.id}`, 5, 60_000);
  if (!withinLimit) {
    throw new Error("Rate limit exceeded. Please try again shortly.");
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("courses")
    .select("title, course_code, university, level, prerequisites, corequisites, description")
    .eq("id", courseId)
    .single();

  if (error || !row) {
    throw new Error("Course not found");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template")
    .eq("id", user.id)
    .maybeSingle();

  const provider = profile?.ai_provider === "gemini" ? "gemini" : "perplexity";
  const selectedModel = (profile?.ai_default_model || "sonar").trim();
  const model = provider === "gemini"
    ? (GEMINI_MODEL_SET.has(selectedModel) ? selectedModel : "gemini-2.0-flash")
    : (PERPLEXITY_MODEL_SET.has(selectedModel) ? selectedModel : "sonar");
  const webSearchEnabled = profile?.ai_web_search_enabled ?? false;
  const customTemplate = (profile?.ai_prompt_template || "").trim();
  const template = customTemplate || DEFAULT_COURSE_DESCRIPTION_PROMPT;
  const prompt = applyPromptTemplate(template, {
    title: row.title || "",
    course_code: row.course_code || "",
    university: row.university || "",
    level: row.level || "",
    prerequisites: row.prerequisites || "",
    corequisites: row.corequisites || "",
    description: row.description || "",
  });

  const response = provider === "gemini"
    ? await (async () => {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("AI service is not configured. Please set GEMINI_API_KEY.");
        }

        return fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: "You are a precise university catalog editor." }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 700,
              },
              tools: webSearchEnabled
                ? [{ google_search: {} }]
                : undefined,
            }),
          },
        );
      })()
    : await (async () => {
        if (!process.env.PERPLEXITY_API_KEY) {
          throw new Error("AI service is not configured. Please set PERPLEXITY_API_KEY.");
        }

        return fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a precise university catalog editor." },
              { role: "user", content: prompt },
            ],
            temperature: 0.5,
            max_tokens: 700,
            return_images: false,
            return_related_questions: false,
            disable_search: !webSearchEnabled,
            stream_mode: "concise",
          }),
        });
      })();

  if (!response.ok) {
    const body = await response.text();
    if (provider === "gemini" && response.status === 429) {
      let retryHint = "";
      try {
        const parsed = JSON.parse(body) as { error?: { status?: string; message?: string } };
        const message = parsed.error?.message || "";
        const retryMatch = message.match(/retry in\s+([\d.]+)s/i);
        if (retryMatch?.[1]) {
          retryHint = ` Please retry in about ${Math.ceil(Number(retryMatch[1]))} seconds.`;
        }
        if (parsed.error?.status === "RESOURCE_EXHAUSTED" || message.toLowerCase().includes("quota")) {
          throw new Error(
            `Gemini quota exceeded for this API key/project. Check Gemini billing/quota settings or switch provider to Perplexity.${retryHint}`,
          );
        }
      } catch (error) {
        if (error instanceof Error) throw error;
      }
      throw new Error("Gemini rate limit reached. Please try again shortly or switch provider to Perplexity.");
    }
    throw new Error(`AI generation failed (${response.status}): ${body || "No response body"}`);
  }

  const parsedJson = (await response.json()) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

  const rawText = provider === "gemini"
    ? (
        (parsedJson as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
          .candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n")
          .trim() || ""
      )
    : (
        (parsedJson as { choices?: Array<{ message?: { content?: string } }> })
          .choices?.[0]?.message?.content?.trim() || ""
      );
  const text = rawText.trim();
  if (!text) {
    throw new Error("AI returned an empty description");
  }
  return text;
}

export async function hideCourseAction(courseId: number) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from('user_courses')
    .upsert({ 
      user_id: user.id, 
      course_id: courseId, 
      status: 'hidden', 
      updated_at: new Date().toISOString()
    });
    
  if (error) throw error;
  revalidatePath('/courses');
}

export async function toggleCourseEnrollmentAction(courseId: number, isEnrolled: boolean) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  if (isEnrolled) {
    // Unenroll
    const { error } = await supabase
      .from('user_courses')
      .delete()
      .match({ user_id: user.id, course_id: courseId });
    if (error) throw error;
  } else {
    // Enroll
    const { error } = await supabase
      .from('user_courses')
      .upsert({ 
        user_id: user.id, 
        course_id: courseId, 
        status: 'in_progress', 
        progress: 0,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
  }

  revalidatePath('/courses');
  revalidatePath('/study-plan');
}

export async function fetchCoursesAction({
  page = 1,
  size = 12,
  query = "",
  sort = "title",
  enrolledOnly = false,
  universities = [] as string[],
  fields = [] as string[],
  levels = [] as string[],
  userId = null as string | null
}) {
  // Ensure this is treated as a dynamic action to prevent caching stale hidden status
  await getUser(); 
  
  const supabase = await createClient(); 
  const offset = (page - 1) * size;
  
  const modernSelectString = `
    id, university, course_code, title, units, url, details, instructors, prerequisites, related_urls, cross_listed_courses, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at,
    fields:course_fields(fields(name)),
    semesters:course_semesters(semesters(term, year))
  `;

  const buildQuery = () => {
    let s = modernSelectString;
    if (enrolledOnly) {
      s += `, user_courses!inner(user_id, status)`;
    }
    return supabase
      .from('courses')
      .select(s, { count: 'exact' })
      .eq('is_hidden', false);
  };

  let supabaseQuery = buildQuery();

  const needsHiddenFilter = !enrolledOnly && !!userId;
  const needsFieldFilter = fields.length > 0;

  const [hiddenResult, fieldFilterResult] = await Promise.all([
    needsHiddenFilter
      ? supabase.from('user_courses').select('course_id').eq('user_id', userId!).eq('status', 'hidden')
      : Promise.resolve({ data: null }),
    needsFieldFilter
      ? supabase.from('fields').select('course_fields(course_id)').in('name', fields)
      : Promise.resolve({ data: null }),
  ]);

  if (enrolledOnly) {
    if (!userId) return { items: [], total: 0, pages: 0 };
    supabaseQuery = supabaseQuery.eq('user_courses.user_id', userId);
    supabaseQuery = supabaseQuery.neq('user_courses.status', 'hidden');
  } else if (needsHiddenFilter) {
    const hiddenIds = hiddenResult.data?.map(h => h.course_id) || [];
    if (hiddenIds.length > 0) {
      supabaseQuery = supabaseQuery.not('id', 'in', `(${hiddenIds.join(',')})`);
    }
  }

  if (query) {
    supabaseQuery = supabaseQuery.textSearch('search_vector', query, { type: 'websearch' });
  }

  if (universities.length > 0) {
    supabaseQuery = supabaseQuery.in('university', universities);
  }

  if (needsFieldFilter) {
    const fieldCourseIds = (fieldFilterResult.data || [])
      .flatMap(f => (f.course_fields as { course_id: number }[] | null || []).map(cf => cf.course_id));
    if (fieldCourseIds.length === 0) return { items: [], total: 0, pages: 0 };
    supabaseQuery = supabaseQuery.in('id', fieldCourseIds);
  }

  if (levels.length > 0) {
    supabaseQuery = supabaseQuery.in('level', levels);
  }

  // Sorting
  if (sort === 'popularity') supabaseQuery = supabaseQuery.order('popularity', { ascending: false });
  else if (sort === 'newest') supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
  else if (sort === 'title') supabaseQuery = supabaseQuery.order('title', { ascending: true });
  else supabaseQuery = supabaseQuery.order('id', { ascending: false });

  const { data, count, error } = await supabaseQuery.range(offset, offset + size - 1);

  if (error) {
    console.error("[fetchCoursesAction] Error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const items = (data || []).map((row) => {
    const course = mapCourseFromRow(row as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const fieldNames = ((row as any).fields as any[] | null)?.map((f) => f.fields.name) || []; // eslint-disable-line @typescript-eslint/no-explicit-any
    const semesterNames = ((row as any).semesters as any[] | null)?.map((s) => `${s.semesters.term} ${s.semesters.year}`) || []; // eslint-disable-line @typescript-eslint/no-explicit-any
    return { ...course, fields: fieldNames, semesters: semesterNames } as Course;
  });

  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return { items, total, pages };
}
