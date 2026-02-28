import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { VertexAI } from "@google-cloud/vertexai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { resolveModelForProvider } from "@/lib/ai/models";
import { parseLenientJson } from "@/lib/ai/parse-json";
import { logAiUsage } from "@/lib/ai/log-usage";
import type { Json } from "@/lib/supabase/database.types";

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || "",
  baseURL: "https://api.perplexity.ai",
});
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
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

function extractSourceUrlFromRawText(raw: string): string | null {
  const m = raw.match(/"source_url"\s*:\s*"([^"]+)"/i);
  if (!m?.[1]) return null;
  const v = m[1].trim();
  return /^https?:\/\//i.test(v) ? v : null;
}

function extractResourcesFromRawText(raw: string): string[] {
  const urls = raw.match(/https?:\/\/[^\s"\\]+/gi) || [];
  return dedupeResourcesByDomain(
    Array.from(new Set(urls.map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u))))
  );
}

function extractScheduleRowsFromRawText(raw: string): Array<Record<string, unknown>> {
  const match = raw.match(/"schedule"\s*:\s*\[/i);
  if (!match) return [];
  const start = match.index ?? -1;
  if (start < 0) return [];

  const openBracket = raw.indexOf("[", start);
  if (openBracket < 0) return [];

  const rows: Array<Record<string, unknown>> = [];
  let inString = false;
  let escape = false;
  let objDepth = 0;
  let objStart = -1;

  for (let i = openBracket + 1; i < raw.length; i += 1) {
    const ch = raw[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") {
      if (objDepth === 0) objStart = i;
      objDepth += 1;
      continue;
    }
    if (ch === "}") {
      if (objDepth > 0) objDepth -= 1;
      if (objDepth === 0 && objStart >= 0) {
        const chunk = raw.slice(objStart, i + 1);
        try {
          const parsed = JSON.parse(chunk) as unknown;
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            rows.push(parsed as Record<string, unknown>);
          }
        } catch {
          // Skip malformed row chunks.
        }
        objStart = -1;
      }
      continue;
    }
    if (ch === "]" && objDepth === 0) break;
  }

  return rows;
}

function dedupeResourcesByDomain(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    try {
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (!host || seen.has(host)) continue;
      seen.add(host);
      out.push(raw);
    } catch {
      // Skip invalid URLs.
    }
  }
  return out;
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

function extractResourcesFromSchedule(scheduleArray: Array<Record<string, unknown>>): string[] {
  const urls: string[] = [];
  for (const entry of scheduleArray) {
    for (const key of ["slides", "videos", "readings", "modules", "assignments", "labs", "exams", "projects"]) {
      const values = Array.isArray(entry[key]) ? (entry[key] as unknown[]) : [];
      for (const item of values) {
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        if (typeof rec.url === "string" && /^https?:\/\//i.test(rec.url)) {
          urls.push(rec.url.trim());
        }
      }
    }
  }
  return urls;
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

function extractHeuristicAssignmentsFromSchedule(
  courseId: number,
  syllabusId: number | null,
  scheduleArray: Array<Record<string, unknown>>,
  nowIso: string
): AssignmentRow[] {
  const rows: AssignmentRow[] = [];
  for (const entry of scheduleArray) {
    const sequence = typeof entry.sequence === "string" ? entry.sequence : null;
    const rowDate = normalizeDate(entry.date);
    const title = typeof entry.title === "string" ? entry.title : "";
    const description = typeof entry.description === "string" ? entry.description : "";
    const blob = `${title} ${description}`.toLowerCase();

    const infer = (kind: AssignmentKind, label: string) => {
      rows.push({
        course_id: courseId,
        syllabus_id: syllabusId,
        kind,
        label,
        due_on: rowDate,
        url: null,
        description: description || null,
        source_sequence: sequence,
        source_row_date: rowDate,
        metadata: {} as Json,
        retrieved_at: nowIso,
        updated_at: nowIso,
      });
    };

    if (blob.includes("assignment") && (blob.includes("due") || blob.includes("out"))) {
      infer("assignment", title || "Assignment");
    }
    if (blob.includes("lab") && (blob.includes("due") || blob.includes("out"))) {
      infer("lab", title || "Lab");
    }
    if (blob.includes("exam") || blob.includes("midterm") || blob.includes("final")) {
      infer("exam", title || "Exam");
    }
    if (blob.includes("project") && (blob.includes("due") || blob.includes("proposal") || blob.includes("milestone"))) {
      infer("project", title || "Project");
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

function cleanHtmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlExcerpt(url: string, timeoutMs = 8000, maxChars = 2200): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "CodeCampus/1.0 (+course-intel)",
      },
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/xhtml+xml")) {
      return null;
    }
    const body = await res.text();
    const text = cleanHtmlToText(body);
    if (!text || text.length < 80) return null;
    const excerpt = text.slice(0, maxChars);
    return `URL: ${url}\nExcerpt: ${excerpt}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function buildFetchedResourcesContext(urls: string[]): Promise<string> {
  const uniqueUrls = Array.from(new Set(urls.filter((u) => /^https?:\/\//i.test(u)))).slice(0, 4);
  if (uniqueUrls.length === 0) return "";
  const settled = await Promise.allSettled(uniqueUrls.map((u) => fetchUrlExcerpt(u)));
  const snippets = settled
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is string => Boolean(v));
  if (snippets.length === 0) return "";
  return `Fetched URL context:\n${snippets.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")}`;
}

export async function runCourseIntel(userId: string, courseId: number) {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, course_code, university, title, url, resources")
    .eq("id", courseId)
    .single();
  if (!course) throw new Error("Course not found");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_provider, ai_web_search_enabled, ai_default_model, ai_course_intel_prompt_template, ai_course_update_prompt_template, ai_syllabus_prompt_template")
    .eq("id", userId)
    .maybeSingle();

  const template = String(profile?.ai_course_intel_prompt_template || "").trim()
    || [
      String(profile?.ai_course_update_prompt_template || "").trim(),
      String(profile?.ai_syllabus_prompt_template || "").trim(),
    ].filter(Boolean).join("\n\n");
  if (!template) throw new Error("Course intel prompt template not configured");

  const providerRaw = String(profile?.ai_provider || "").trim();
  const preferredProvider = providerRaw === "openai" ? "openai" : providerRaw === "vertex" ? "vertex" : "perplexity";
  const webSearchEnabled = Boolean(profile?.ai_web_search_enabled);
  const provider = webSearchEnabled && process.env.PERPLEXITY_API_KEY ? "perplexity" : preferredProvider;
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("AI service not configured: OPENAI_API_KEY missing");
  }
  if (provider === "perplexity" && !process.env.PERPLEXITY_API_KEY) {
    throw new Error("AI service not configured: PERPLEXITY_API_KEY missing");
  }
  if (provider === "vertex") {
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
      throw new Error("AI service not configured: GOOGLE_CLOUD_PROJECT missing");
    }
    if (!process.env.GOOGLE_CLOUD_LOCATION) {
      throw new Error("AI service not configured: GOOGLE_CLOUD_LOCATION missing");
    }
  }

  const modelName = await resolveModelForProvider(provider, String(profile?.ai_default_model || "").trim());
  if (!modelName) {
    throw new Error(`AI service not configured: no active model for provider ${provider}`);
  }

  const knownUrls = [course.url, ...(Array.isArray(course.resources) ? course.resources : [])]
    .filter(Boolean) as string[];
  const resourcesContext = knownUrls.length > 0
    ? `Known course URLs:\n${knownUrls.map((u) => `- ${u}`).join("\n")}`
    : "";

  const fetchedResourcesContext = webSearchEnabled ? await buildFetchedResourcesContext(knownUrls) : "";

  const basePrompt = applyTemplate(template, {
    course_code: String(course.course_code || ""),
    university: String(course.university || ""),
    title: String(course.title || ""),
    resources: resourcesContext,
  });
  const prompt = fetchedResourcesContext ? `${basePrompt}\n\n${fetchedResourcesContext}` : basePrompt;

  const runExtraction = async (maxOutputTokens: number, promptOverride?: string) => {
    let text = "";
    let usage = { inputTokens: 0, outputTokens: 0 };
    if (provider === "vertex") {
      const vertexAI = new VertexAI({
        project: process.env.GOOGLE_CLOUD_PROJECT!,
        location: process.env.GOOGLE_CLOUD_LOCATION!,
      });
      const model = vertexAI.getGenerativeModel({ model: modelName });
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptOverride || prompt }] }],
        generationConfig: { maxOutputTokens },
      });
      text = (response.response?.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || "")
        .join("");
      const usageMetadata = response.response?.usageMetadata;
      usage = {
        inputTokens: Number(usageMetadata?.promptTokenCount || 0),
        outputTokens: Number(usageMetadata?.candidatesTokenCount || 0),
      };
    } else {
      const out = await generateText({
        model: provider === "openai" ? openai.chat(modelName) : perplexity.chat(modelName),
        prompt: promptOverride || prompt,
        maxOutputTokens,
      });
      text = out.text;
      usage = {
        inputTokens: Number(out.usage.inputTokens || 0),
        outputTokens: Number(out.usage.outputTokens || 0),
      };
    }

    const parsedAny = parseLenientJson(text);
    const parsed = (parsedAny && typeof parsedAny === "object" && !Array.isArray(parsedAny))
      ? (parsedAny as Record<string, unknown>)
      : {};

    const scheduleArray = Array.isArray(parsed.schedule) ? (parsed.schedule as Array<Record<string, unknown>>) : [];
    return { text, usage, parsed, scheduleArray };
  };

  const firstAttempt = await runExtraction(8192);
  let extraction = firstAttempt;

  // Retry once when the model likely returned a partial syllabus.
  if (firstAttempt.scheduleArray.length <= 1) {
    const retryAttempt = await runExtraction(12000);
    if (retryAttempt.scheduleArray.length > firstAttempt.scheduleArray.length) {
      extraction = retryAttempt;
    }
  }

  // Recovery retry when model returns prose/refusal instead of JSON object.
  const looksLikeNonJsonReply =
    !/^\s*\{/.test((extraction.text || "").trim()) &&
    (/I (can't|cannot|need to clarify)|I'?m Perplexity|search results provided|I appreciate your/i.test(extraction.text || ""));
  if (looksLikeNonJsonReply) {
    const forcedJsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a single valid JSON object. Do not include any prose, disclaimers, citations, markdown, or code fences.`;
    const jsonRetry = await runExtraction(12000, forcedJsonPrompt);
    if (jsonRetry.scheduleArray.length >= extraction.scheduleArray.length) {
      extraction = jsonRetry;
    }
  }

  const text = extraction.text;
  const parsed = extraction.parsed;
  const usage = {
    inputTokens: Number(firstAttempt.usage.inputTokens || 0) + (extraction === firstAttempt ? 0 : Number(extraction.usage.inputTokens || 0)),
    outputTokens: Number(firstAttempt.usage.outputTokens || 0) + (extraction === firstAttempt ? 0 : Number(extraction.usage.outputTokens || 0)),
  };

  const rawSourceUrl = extractSourceUrlFromRawText(text);
  const rawResources = extractResourcesFromRawText(text);

  const parsedResources = normalizeResources(parsed.resources);
  const sourceUrl = typeof parsed.source_url === "string" ? parsed.source_url : rawSourceUrl;
  const content = (parsed.content && typeof parsed.content === "object" ? parsed.content : {}) as Json;
  const recoveredScheduleRows = extractScheduleRowsFromRawText(text);
  const scheduleArray = extraction.scheduleArray.length > 0 ? extraction.scheduleArray : recoveredScheduleRows;
  const schedule = scheduleArray as Json;
  const rawClaimsSource = /"source_url"\s*:/i.test(text);
  // Prefer graceful degradation: recover rows from raw text if top-level JSON is truncated.
  // Keep hard failure only when source_url is malformed and cannot be recovered.
  if (rawClaimsSource && !sourceUrl) {
    throw new Error("AI returned malformed/truncated source_url JSON");
  }
  const scheduleResources = extractResourcesFromSchedule(scheduleArray);
  const mergedResourceCandidates = dedupeResourcesByDomain([
    ...parsedResources,
    ...rawResources,
    ...scheduleResources,
    ...(sourceUrl ? [sourceUrl] : []),
    ...(Array.isArray(course.resources) ? course.resources : []),
  ]);
  const finalResources = mergedResourceCandidates;

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  if (finalResources.length > 0) {
    const { error: courseUpdateError } = await admin
      .from("courses")
      .update({ resources: finalResources })
      .eq("id", courseId);
    if (courseUpdateError) throw new Error(courseUpdateError.message);
  }

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
  const heuristicAssignments = extractHeuristicAssignmentsFromSchedule(courseId, syllabusId, scheduleArray, nowIso);
  const topLevelAssignments = extractTopLevelAssignments(courseId, syllabusId, parsed.assignments, nowIso);
  const assignmentRows = dedupeAssignments([...assignmentsFromSchedule, ...heuristicAssignments, ...topLevelAssignments]);

  if (assignmentRows.length > 0) {
    const { error: deleteAssignmentsError } = await admin
      .from("course_assignments")
      .delete()
      .eq("course_id", courseId);
    if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message);

    const { error: insertAssignmentsError } = await admin
      .from("course_assignments")
      .insert(assignmentRows);
    if (insertAssignmentsError) throw new Error(insertAssignmentsError.message);
  }

  await logAiUsage({
    userId,
    provider,
    model: modelName,
    feature: "course-intel",
    tokensInput: usage.inputTokens,
    tokensOutput: usage.outputTokens,
    prompt,
    responseText: text,
    requestPayload: { courseId, courseCode: course.course_code, university: course.university },
    responsePayload: {
      resourcesCount: finalResources.length,
      scheduleEntries: scheduleArray.length,
      assignmentsCount: assignmentRows.length,
    },
  });

  return {
    resources: finalResources,
    scheduleEntries: scheduleArray.length,
    assignmentsCount: assignmentRows.length,
  };
}
