import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { load } from "cheerio";
import { createAdminClient } from "@/lib/supabase/server";
import { expandStudyPlanDays } from "@/lib/study-plan-persistence";
import { resolveModelForProvider } from "@/lib/ai/models";
import { parseLenientJson } from "@/lib/ai/parse-json";
import { logAiUsage } from "@/lib/ai/log-usage";
import { upstashMGet } from "@/lib/cache/upstash";
import { buildResourceBlacklistKey } from "@/lib/resources/blacklist";
import type { Json } from "@/lib/supabase/database.types";
import {
  type DailyPlan,
  type PlanSeedTask,
  buildAssignmentsFromDailyPlan,
  buildCourseSchedulesFromDailyPlan,
  buildFallbackDailyPlan,
  buildPlanSeedTasks,
  parseLooseDailyPlanText,
  sanitizeDailyPlan,
  toIsoDateUtc,
} from "@/lib/ai/course-intel-plan";

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || "",
  baseURL: "https://api.perplexity.ai",
});
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});
const localOpenAICompatible = createOpenAI({
  apiKey: process.env.LOCAL_LLM_API_KEY || "local",
  baseURL: process.env.LOCAL_LLM_BASE_URL || "",
});

type AssignmentKind = "assignment" | "lab" | "exam" | "project" | "quiz" | "other";

type AssignmentRow = {
  course_id: number;
  syllabus_id: number | null;
  course_schedule_id: number | null;
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

type WeekSignal = {
  week: number;
  title: string;
  slides: Array<{ label: string; url: string }>;
  readings: Array<{ label: string; url: string }>;
  assignments: Array<{ label: string; url: string }>;
};

type GradingSignal = {
  component: string;
  weight: number;
};

type DeterministicSignals = {
  scheduleRows: Array<Record<string, unknown>>;
  gradingSignals: GradingSignal[];
  extraResources: string[];
};

export type CourseIntelSourceMode = "fresh" | "existing" | "auto";
export type CourseIntelExecutionMode = "service" | "local" | "deterministic";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const COURSE_INTEL_CACHE_TTL_MS = 15 * 60 * 1000;
const courseIntelCache = new Map<string, CacheEntry>();

async function withCourseIntelCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = COURSE_INTEL_CACHE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = courseIntelCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const value = await loader();
  courseIntelCache.set(key, {
    expiresAt: now + ttlMs,
    value,
  });

  // Lightweight cleanup to avoid unbounded growth.
  if (courseIntelCache.size > 500) {
    for (const [k, v] of courseIntelCache.entries()) {
      if (v.expiresAt <= now) courseIntelCache.delete(k);
    }
  }

  return value;
}

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
  const pathSensitiveHosts = [
    "github.com",
    "gist.github.com",
    "github.io",
    "gitlab.com",
    "bitbucket.org",
    "docs.google.com",
    "drive.google.com",
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    try {
      const u = new URL(raw);
      u.hash = "";
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (!host) continue;

      const normalized = u.toString();
      const isPathSensitive = pathSensitiveHosts.some((h) => host === h || host.endsWith(`.${h}`));
      const dedupeKey = isPathSensitive ? normalized : host;

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      out.push(normalized);
    } catch {
      // Skip invalid URLs.
    }
  }
  return out;
}

function dedupeUrlsExact(input: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    try {
      const u = new URL(raw);
      u.hash = "";
      const normalized = u.toString();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    } catch {
      // Skip invalid URLs.
    }
  }
  return out;
}

function stripHtmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|h5|h6|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, " ")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \u00a0]{2,}/g, " ")
    .trim();
}

function extractModernSoftwareTextFromBundle(js: string): string {
  const lines: string[] = [];
  const add = (v: string) => {
    const clean = v.replace(/\s+/g, " ").trim();
    if (!clean) return;
    if (clean.length < 4) return;
    lines.push(clean);
  };

  const childrenRegex = /children:"([^"]{3,220})"/g;
  let m: RegExpExecArray | null;
  while ((m = childrenRegex.exec(js)) !== null) {
    add(m[1]);
  }

  const urlRegex = /https?:\/\/[^"' )\\]+/g;
  while ((m = urlRegex.exec(js)) !== null) {
    const u = m[0];
    if (
      /modern-software-dev-assignments|docs\.google\.com\/presentation|drive\.google\.com\/file|explorecourses\.stanford|bulletin\.stanford|themodernsoftware\.dev/i.test(u)
    ) {
      add(u);
    }
  }

  const filtered = lines.filter((line) =>
    /week\s+\d+|assignment|grading|topics|reading|mon\s+\d{1,2}\/\d{1,2}|fri\s+\d{1,2}\/\d{1,2}|final project|weekly assignments|class participation|slides|faq/i.test(line)
  );

  return Array.from(new Set(filtered)).join("\n").slice(0, 22000);
}

function dedupeLinks(links: Array<{ label: string; url: string }>): Array<{ label: string; url: string }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; url: string }> = [];
  for (const item of links) {
    const key = item.url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ label: item.label.trim(), url: item.url.trim() });
  }
  return out;
}

function dedupeTaskLinks(
  links: Array<{ label: string; url: string; due_date: string | null }>
): Array<{ label: string; url: string; due_date: string | null }> {
  const seen = new Set<string>();
  const out: Array<{ label: string; url: string; due_date: string | null }> = [];
  for (const item of links) {
    const key = `${item.url.trim().toLowerCase()}|${item.label.trim().toLowerCase()}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      label: item.label.trim(),
      url: item.url.trim(),
      due_date: item.due_date,
    });
  }
  return out;
}

function isNoisyContextUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = u.pathname.toLowerCase();
    if (/youtube\.com|youtu\.be|x\.com|twitter\.com|facebook\.com|instagram\.com|tiktok\.com/i.test(host)) return true;
    if (/discord\.com/i.test(host) && !/\/invite\//.test(path)) return true;
    if (/medium\.com|substack\.com/i.test(host)) return true;
    return false;
  } catch {
    return true;
  }
}

function parseWeekSignalsFromBundle(js: string): WeekSignal[] {
  const weekMatches = Array.from(js.matchAll(/Week\s+(\d+):\s*([^"]{1,180})/gi))
    .map((m) => ({
      index: m.index ?? -1,
      week: Number(m[1]),
      title: String(m[2] || "").trim(),
    }))
    .filter((w) => w.index >= 0 && Number.isFinite(w.week) && w.week > 0);
  if (weekMatches.length === 0) return [];

  const byWeek = new Map<number, WeekSignal>();
  for (const w of weekMatches) {
    if (!byWeek.has(w.week)) {
      byWeek.set(w.week, {
        week: w.week,
        title: w.title,
        slides: [],
        readings: [],
        assignments: [],
      });
    }
  }

  const linkRegex = /href:"([^"]+)"[\s\S]{0,260}?children:"([^"]{1,240})"/g;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(js)) !== null) {
    const url = String(m[1] || "").trim();
    const label = String(m[2] || "").trim();
    const idx = m.index ?? -1;
    if (!/^https?:\/\//i.test(url) || !label || idx < 0) continue;

    let targetWeek = weekMatches[0];
    for (const w of weekMatches) {
      if (w.index <= idx) targetWeek = w;
      else break;
    }
    const target = byWeek.get(targetWeek.week);
    if (!target) continue;

    const pre = js.slice(Math.max(0, idx - 360), idx);
    const inSlidesCtx = /slides?/i.test(label) || /slides?/i.test(pre) || /docs\.google\.com\/presentation|figma\.com\/slides|drive\.google\.com\/file/i.test(url);
    const inAssignmentCtx = /assignment|homework|project|lab|pset|problem set/i.test(label) || /assignment/i.test(pre) || /modern-software-dev-assignments/i.test(url);
    const inReadingCtx = /reading/i.test(pre);

    if (inSlidesCtx) {
      target.slides.push({ label, url });
      continue;
    }
    if (inAssignmentCtx) {
      target.assignments.push({ label, url });
      continue;
    }
    if (inReadingCtx) {
      target.readings.push({ label, url });
    }
  }

  return Array.from(byWeek.values())
    .map((w) => ({
      ...w,
      slides: dedupeLinks(w.slides),
      readings: dedupeLinks(w.readings),
      assignments: dedupeLinks(w.assignments),
    }))
    .sort((a, b) => a.week - b.week);
}

function parseGradingSignalsFromBundle(js: string): GradingSignal[] {
  const entries: GradingSignal[] = [];

  const direct: Array<{ component: string; pattern: RegExp }> = [
    { component: "Final Project", pattern: /Final Project[\s\S]{0,220}?(\d{1,3})%/i },
    { component: "Weekly Assignments", pattern: /Weekly Assignments[\s\S]{0,220}?(\d{1,3})%/i },
    { component: "Class Participation", pattern: /Class Participation[\s\S]{0,220}?(\d{1,3})%/i },
  ];
  for (const item of direct) {
    const m = js.match(item.pattern);
    if (m?.[1]) {
      const weight = Number(m[1]);
      if (Number.isFinite(weight) && weight > 0 && weight <= 100) {
        entries.push({ component: item.component, weight });
      }
    }
  }

  const generic = Array.from(
    js.matchAll(/children:"([^"]{3,90})"[\s\S]{0,120}?children:"(\d{1,3})%"/g)
  );
  for (const m of generic) {
    const component = String(m[1] || "").trim();
    const weight = Number(m[2] || "");
    if (!component || !Number.isFinite(weight) || weight <= 0 || weight > 100) continue;
    if (/topics|reading|assignment deadlines|week\s+\d+/i.test(component)) continue;
    if (entries.some((e) => e.component.toLowerCase() === component.toLowerCase())) continue;
    entries.push({ component, weight });
  }

  return entries;
}

function mergeGradingSignals(content: Json, gradingSignals: GradingSignal[]): Json {
  if (gradingSignals.length === 0) return content;
  const asObj = (content && typeof content === "object" && !Array.isArray(content))
    ? (content as Record<string, unknown>)
    : {};
  return {
    ...asObj,
    grading: gradingSignals.map((g) => ({ component: g.component, weight: g.weight })),
  } as Json;
}

function extractBundleScriptUrls(html: string, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const scriptMatches = Array.from(
    html.matchAll(/<script[^>]+src="([^"]+index-[^"]+\.js)"[^>]*>/gi)
  );
  return scriptMatches
    .map((sm) => sm[1])
    .filter((src): src is string => Boolean(src))
    .map((src) => (src.startsWith("http")
      ? src
      : `${base.origin}${src.startsWith("/") ? "" : "/"}${src}`));
}

async function fetchUrlTextSnippet(url: string, timeoutMs = 8000): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  if (isNoisyContextUrl(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "FlashBot/1.0 (+course-intel)",
      },
    });
    if (!res.ok) return null;
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html")) return null;
    const html = await res.text();
    const text = stripHtmlToText(html);
    if (text && text.length > 500) return text.slice(0, 8000);

    // SPA fallback: some course sites render content in JS bundles only.
    const scriptUrls = extractBundleScriptUrls(html, url);
    for (const jsUrl of scriptUrls) {
      try {
        const jsRes = await fetch(jsUrl, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          headers: {
            "User-Agent": "FlashBot/1.0 (+course-intel)",
          },
        });
        if (!jsRes.ok) continue;
        const jsText = await jsRes.text();
        const extracted = extractModernSoftwareTextFromBundle(jsText);
        if (extracted) return extracted;
      } catch {
        // Try next script.
      }
    }

    return text ? text.slice(0, 8000) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWeekSignalsForUrl(url: string, timeoutMs = 8000): Promise<WeekSignal[]> {
  if (!/^https?:\/\//i.test(url)) return [];
  if (isNoisyContextUrl(url)) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "FlashBot/1.0 (+course-intel)",
      },
    });
    if (!res.ok) return [];
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html")) return [];
    const html = await res.text();
    const scriptUrls = extractBundleScriptUrls(html, url);
    const all: WeekSignal[] = [];
    for (const jsUrl of scriptUrls) {
      try {
        const jsRes = await fetch(jsUrl, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          headers: {
            "User-Agent": "FlashBot/1.0 (+course-intel)",
          },
        });
        if (!jsRes.ok) continue;
        const jsText = await jsRes.text();
        all.push(...parseWeekSignalsFromBundle(jsText));
      } catch {
        // Skip failed script URL.
      }
    }
    const byWeek = new Map<number, WeekSignal>();
    for (const w of all) {
      const prev = byWeek.get(w.week);
      if (!prev) {
        byWeek.set(w.week, { ...w });
        continue;
      }
      byWeek.set(w.week, {
        week: w.week,
        title: prev.title || w.title,
        slides: dedupeLinks([...prev.slides, ...w.slides]),
        readings: dedupeLinks([...prev.readings, ...w.readings]),
        assignments: dedupeLinks([...prev.assignments, ...w.assignments]),
      });
    }
    return Array.from(byWeek.values()).sort((a, b) => a.week - b.week);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGradingSignalsForUrl(url: string, timeoutMs = 8000): Promise<GradingSignal[]> {
  if (!/^https?:\/\//i.test(url)) return [];
  if (isNoisyContextUrl(url)) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "FlashBot/1.0 (+course-intel)",
      },
    });
    if (!res.ok) return [];
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html")) return [];
    const html = await res.text();
    const scriptUrls = extractBundleScriptUrls(html, url);
    const merged: GradingSignal[] = [];
    for (const jsUrl of scriptUrls) {
      try {
        const jsRes = await fetch(jsUrl, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
          headers: {
            "User-Agent": "FlashBot/1.0 (+course-intel)",
          },
        });
        if (!jsRes.ok) continue;
        const jsText = await jsRes.text();
        merged.push(...parseGradingSignalsFromBundle(jsText));
      } catch {
        // Skip failed script URL.
      }
    }
    const byName = new Map<string, GradingSignal>();
    for (const g of merged) {
      const key = g.component.trim().toLowerCase();
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, g);
    }
    return Array.from(byName.values());
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function mergeWeekSignalsIntoSchedule(
  scheduleArray: Array<Record<string, unknown>>,
  weekSignals: WeekSignal[]
): Array<Record<string, unknown>> {
  if (weekSignals.length === 0) return scheduleArray;
  const rows = scheduleArray.map((row) => ({ ...row }));
  const byWeek = new Map<number, WeekSignal>();
  for (const sig of weekSignals) byWeek.set(sig.week, sig);

  const findWeek = (row: Record<string, unknown>, index: number): number | null => {
    const candidates = [String(row.sequence || ""), String(row.title || "")];
    for (const c of candidates) {
      const m = c.match(/week\s+(\d+)/i);
      if (m?.[1]) return Number(m[1]);
    }
    if (index < weekSignals.length) return weekSignals[index].week;
    return null;
  };

  const mappedWeeks = new Set<number>();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const week = findWeek(row, i);
    if (!week) continue;
    const sig = byWeek.get(week);
    if (!sig) continue;
    mappedWeeks.add(week);

    const toLinkObj = (x: { label: string; url: string }) => ({ label: x.label, url: x.url });
    const slides = Array.isArray(row.slides) ? [...(row.slides as Array<Record<string, unknown>>)] : [];
    const readings = Array.isArray(row.readings) ? [...(row.readings as Array<Record<string, unknown>>)] : [];
    const assignments = Array.isArray(row.assignments) ? [...(row.assignments as Array<Record<string, unknown>>)] : [];

    for (const s of sig.slides) slides.push(toLinkObj(s));
    for (const r of sig.readings) readings.push(toLinkObj(r));
    for (const a of sig.assignments) assignments.push({ label: a.label, url: a.url, due_date: null });

    row.slides = dedupeLinks(slides
      .filter((x) => typeof (x as Record<string, unknown>).url === "string")
      .map((x) => ({
        label: String((x as Record<string, unknown>).label || "Slides"),
        url: String((x as Record<string, unknown>).url),
      })));
    row.readings = dedupeLinks(readings
      .filter((x) => typeof (x as Record<string, unknown>).url === "string")
      .map((x) => ({
        label: String((x as Record<string, unknown>).label || "Reading"),
        url: String((x as Record<string, unknown>).url),
      })));
    row.assignments = dedupeLinks(assignments
      .filter((x) => typeof (x as Record<string, unknown>).url === "string")
      .map((x) => ({
        label: String((x as Record<string, unknown>).label || "Assignment"),
        url: String((x as Record<string, unknown>).url),
      })))
      .map((x) => ({ ...x, due_date: null }));
  }

  if (rows.length === 0) {
    return weekSignals.map((sig) => ({
      sequence: `Week ${sig.week}`,
      title: sig.title || `Week ${sig.week}`,
      date: null,
      date_end: null,
      instructor: null,
      topics: [],
      description: null,
      slides: sig.slides.map((x) => ({ label: x.label, url: x.url })),
      videos: [],
      readings: sig.readings.map((x) => ({ label: x.label, url: x.url })),
      modules: [],
      assignments: sig.assignments.map((x) => ({ label: x.label, url: x.url, due_date: null })),
      labs: [],
      exams: [],
      projects: [],
    }));
  }

  // If model returns only partial schedule, add missing week rows from deterministic signals.
  for (const sig of weekSignals) {
    if (mappedWeeks.has(sig.week)) continue;
    rows.push({
      sequence: `Week ${sig.week}`,
      title: sig.title || `Week ${sig.week}`,
      date: null,
      date_end: null,
      instructor: null,
      topics: [],
      description: null,
      slides: sig.slides.map((x) => ({ label: x.label, url: x.url })),
      videos: [],
      readings: sig.readings.map((x) => ({ label: x.label, url: x.url })),
      modules: [],
      assignments: sig.assignments.map((x) => ({ label: x.label, url: x.url, due_date: null })),
      labs: [],
      exams: [],
      projects: [],
    });
  }

  rows.sort((a, b) => {
    const wa = Number(String(a.sequence || "").match(/week\s+(\d+)/i)?.[1] || Number.POSITIVE_INFINITY);
    const wb = Number(String(b.sequence || "").match(/week\s+(\d+)/i)?.[1] || Number.POSITIVE_INFINITY);
    return wa - wb;
  });

  return rows;
}

function monthToNumber(mon: string): number | null {
  const key = mon.trim().slice(0, 3).toLowerCase();
  const map: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  return map[key] ?? null;
}

function parseMonthDayLabelToIso(label: string, year: number | null): string | null {
  if (!year) return null;
  const m = label.trim().match(/^([A-Za-z]{3,9})\s+(\d{1,2})$/);
  if (!m) return null;
  const month = monthToNumber(m[1]);
  const day = Number(m[2]);
  if (!month || !Number.isFinite(day) || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function parseYearFromHtmlText(text: string): number | null {
  const m = text.match(/\b(20\d{2})\b/);
  if (!m?.[1]) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) ? y : null;
}

function parseWebflowScheduleAndGrading(html: string): DeterministicSignals {
  const $ = load(html);
  const allText = $.text();
  const inferredYear = parseYearFromHtmlText(allText);
  const scheduleRows: Array<Record<string, unknown>> = [];
  const extraResources: string[] = [];

  const seenLecture = new Set<string>();
  $("#schedule .w-dyn-item").each((_, item) => {
    const root = $(item);
    const dateLabel = root.find(".schedule-grid .text-media.semibold").first().text().replace(/\s+/g, " ").trim();
    const title = root.find(".schedule-grid h4.inline.semibold").first().text().replace(/\s+/g, " ").trim();
    const lectureNumRaw = root.find(".schedule-grid .inline").filter((_, el) => /^\d+$/.test($(el).text().trim())).first().text().trim();
    const lectureNum = lectureNumRaw ? Number(lectureNumRaw) : NaN;
    const key = `${dateLabel}|${title}`;
    if (!title || seenLecture.has(key)) return;
    seenLecture.add(key);

    const slides: Array<{ label: string; url: string }> = [];
    const videos: Array<{ label: string; url: string }> = [];
    root.find(".lecture-recourses-wrapper a[href]").each((__, a) => {
      const href = String($(a).attr("href") || "").trim();
      const label = $(a).text().replace(/\s+/g, " ").trim() || "Link";
      if (!/^https?:\/\//i.test(href)) return;
      extraResources.push(href);
      if (/slide/i.test(label)) slides.push({ label, url: href });
      else if (/video/i.test(label)) videos.push({ label, url: href });
      else slides.push({ label, url: href });
    });

    const logisticsNode = root.find(".text-cadetblue.text-semibold.w-richtext").first();
    const logisticsText = logisticsNode.text().replace(/\s+/g, " ").trim();
    const assignments: Array<{ label: string; url: string; due_date: string | null }> = [];
    const labs: Array<{ label: string; url: string; due_date: string | null }> = [];
    const projects: Array<{ label: string; url: string; due_date: string | null }> = [];
    logisticsNode.find("a[href]").each((__, a) => {
      const href = String($(a).attr("href") || "").trim();
      const label = $(a).text().replace(/\s+/g, " ").trim() || "Task";
      if (!/^https?:\/\//i.test(href)) return;
      extraResources.push(href);
      if (/lab/i.test(label)) labs.push({ label, url: href, due_date: null });
      else if (/project/i.test(label)) projects.push({ label, url: href, due_date: null });
      else assignments.push({ label, url: href, due_date: null });
    });
    if (logisticsText && assignments.length === 0 && labs.length === 0 && projects.length === 0) {
      if (/lab/i.test(logisticsText)) labs.push({ label: logisticsText, url: "", due_date: null });
      else if (/project|proposal|report|presentation/i.test(logisticsText)) projects.push({ label: logisticsText, url: "", due_date: null });
      else if (/due|out|assignment/i.test(logisticsText)) assignments.push({ label: logisticsText, url: "", due_date: null });
    }

    scheduleRows.push({
      sequence: Number.isFinite(lectureNum) ? `Lecture ${lectureNum}` : null,
      title,
      date: parseMonthDayLabelToIso(dateLabel, inferredYear),
      date_end: null,
      instructor: null,
      topics: [title],
      description: logisticsText || null,
      slides: dedupeLinks(slides),
      videos: dedupeLinks(videos),
      readings: [],
      modules: [],
      assignments,
      labs,
      exams: [],
      projects,
    });
  });

  const gradingSignals: GradingSignal[] = [];
  const logistics = $("#logistics");
  if (logistics.length > 0) {
    logistics.find("li").each((_, li) => {
      const text = $(li).text().replace(/\s+/g, " ").trim();
      if (!text) return;
      if (/late|penalty|day|zero credit|policy|regrade/i.test(text)) return;
      const all = Array.from(text.matchAll(/(\d{1,3})%/g)).map((m) => Number(m[1]));
      if (all.length === 0) return;
      const comp = text.replace(/\(\s*[\d%\sxX+]+\s*\)/g, "").replace(/(\d{1,3})%/g, "").replace(/[:\-–]+$/g, "").trim();
      if (!comp) return;
      if (comp.length > 80) return;
      if (/grading breakdown|does not have any tests|no tests or exams/i.test(comp)) return;
      if (!/assignment|homework|project|exam|lab|quiz|participation|proposal|presentation|report|midterm|final|bonus/i.test(comp)) return;
      let weight = all[0];
      const mult = text.match(/(\d{1,3})%\s*x\s*(\d{1,2})/i);
      if (mult?.[1] && mult?.[2]) {
        const product = Number(mult[1]) * Number(mult[2]);
        if (product <= 100) weight = product;
      }
      if (!Number.isFinite(weight) || weight <= 0 || weight > 100) return;
      if (!gradingSignals.some((g) => g.component.toLowerCase() === comp.toLowerCase())) {
        gradingSignals.push({ component: comp, weight });
      }
    });
  }

  return {
    scheduleRows,
    gradingSignals,
    extraResources: dedupeUrlsExact(extraResources),
  };
}

function parseGenericScheduleAndGrading(html: string): DeterministicSignals {
  const $ = load(html);
  const allText = $.text();
  const inferredYear = parseYearFromHtmlText(allText);
  const scheduleRows: Array<Record<string, unknown>> = [];
  const extraResources: string[] = [];
  const seen = new Set<string>();

  const parseDate = (text: string): string | null => {
    const md = text.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\b/);
    if (md?.[1] && md?.[2] && inferredYear) {
      return parseMonthDayLabelToIso(`${md[1]} ${md[2]}`, inferredYear);
    }
    const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (iso?.[1]) return iso[1];
    const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
    if (slash?.[1] && slash?.[2]) {
      const y = Number(slash[3] || inferredYear || "");
      const m = Number(slash[1]);
      const d = Number(slash[2]);
      if (Number.isFinite(y) && y > 2000 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
    return null;
  };

  const parseDueDate = (text: string, fallbackDate: string | null): string | null => {
    const parsed = parseDate(text);
    return parsed || fallbackDate;
  };

  const categorizeLinks = (root: ReturnType<typeof $>, rowDateHint: string | null) => {
    const slides: Array<{ label: string; url: string }> = [];
    const videos: Array<{ label: string; url: string }> = [];
    const readings: Array<{ label: string; url: string }> = [];
    const assignments: Array<{ label: string; url: string; due_date: string | null }> = [];
    const labs: Array<{ label: string; url: string; due_date: string | null }> = [];
    const projects: Array<{ label: string; url: string; due_date: string | null }> = [];
    root.find("a[href]").each((_, a) => {
      const href = String($(a).attr("href") || "").trim();
      if (!/^https?:\/\//i.test(href)) return;
      const label = $(a).text().replace(/\s+/g, " ").trim() || href;
      extraResources.push(href);
      if (/slide|deck/i.test(label) || /docs\.google\.com\/presentation|speakerdeck/i.test(href)) {
        slides.push({ label, url: href });
      } else if (/video|recording|youtube|youtu\.be|panopto/i.test(label) || /youtube|youtu\.be|panopto/i.test(href)) {
        videos.push({ label, url: href });
      } else if (/reading|paper|article|textbook/i.test(label)) {
        readings.push({ label, url: href });
      } else if (/lab/i.test(label)) {
        labs.push({ label, url: href, due_date: parseDueDate(label, rowDateHint) });
      } else if (/project|proposal|milestone|report/i.test(label)) {
        projects.push({ label, url: href, due_date: parseDueDate(label, rowDateHint) });
      } else if (/assignment|homework|problem set|pset|quiz/i.test(label)) {
        assignments.push({ label, url: href, due_date: parseDueDate(label, rowDateHint) });
      } else {
        readings.push({ label, url: href });
      }
    });
    return {
      slides: dedupeLinks(slides),
      videos: dedupeLinks(videos),
      readings: dedupeLinks(readings),
      assignments: dedupeTaskLinks(assignments),
      labs: dedupeTaskLinks(labs),
      projects: dedupeTaskLinks(projects),
    };
  };

  $("table tr").each((_, tr) => {
    const row = $(tr);
    const cells = row.find("th,td");
    if (cells.length < 2) return;
    const texts = cells
      .map((__, c) => $(c).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean);
    if (texts.length < 2) return;
    const seqText = texts.find((t) => /^(week|lecture|class)\s*\d+/i.test(t)) || null;
    const dateText = texts.find((t) => Boolean(parseDate(t))) || null;
    const title = texts.find((t) => t !== seqText && t !== dateText && t.length > 4) || texts[1];
    if (!title || title.length < 4) return;
    if (!/(week|lecture|class|topic|module|session|\d{1,2}\/\d{1,2}|[A-Za-z]{3,9}\s+\d{1,2})/i.test(texts.join(" "))) return;
    const key = `${seqText || ""}|${parseDate(dateText || "") || ""}|${title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const rowDate = parseDate(dateText || "");
    const links = categorizeLinks(row, rowDate);
    scheduleRows.push({
      sequence: seqText,
      title,
      date: rowDate,
      date_end: null,
      instructor: null,
      topics: [title],
      description: null,
      slides: links.slides,
      videos: links.videos,
      readings: links.readings,
      modules: [],
      assignments: links.assignments,
      labs: links.labs,
      exams: [],
      projects: links.projects,
    });
  });

  $("[class*='week'], [id*='week']").each((_, el) => {
    const block = $(el);
    const blockText = block.text().replace(/\s+/g, " ").trim();
    if (!/week\s*\d+/i.test(blockText)) return;
    const seq = blockText.match(/week\s*(\d+)/i)?.[0] || null;
    const date = parseDate(blockText);
    const title = block.find("h1,h2,h3,h4,strong").first().text().replace(/\s+/g, " ").trim() || seq || "Week";
    const key = `${seq || ""}|${date || ""}|${title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const links = categorizeLinks(block, date);
    scheduleRows.push({
      sequence: seq,
      title,
      date,
      date_end: null,
      instructor: null,
      topics: [],
      description: null,
      slides: links.slides,
      videos: links.videos,
      readings: links.readings,
      modules: [],
      assignments: links.assignments,
      labs: links.labs,
      exams: [],
      projects: links.projects,
    });
  });

  // Fallback: extract assignment-like entries from free-form list/calendar text.
  const seenFallback = new Set<string>();
  $("li,p,tr").each((_, el) => {
    const node = $(el);
    const text = node.text().replace(/\s+/g, " ").trim();
    if (!text || text.length > 260) return;
    if (!/assignment|homework|pset|problem set|lab|project|quiz|exam/i.test(text)) return;
    if (!/due|deadline|out|submit|deliverable/i.test(text)) return;
    const due = parseDate(text);
    const hrefRaw = String(node.find("a[href]").first().attr("href") || "").trim();
    const href = /^https?:\/\//i.test(hrefRaw) ? hrefRaw : "";
    const kind: "assignments" | "labs" | "projects" =
      /lab/i.test(text) ? "labs" : /project|proposal|milestone|report/i.test(text) ? "projects" : "assignments";
    const key = `${kind}|${text.toLowerCase()}|${due || ""}`;
    if (seenFallback.has(key)) return;
    seenFallback.add(key);

    scheduleRows.push({
      sequence: null,
      title: text,
      date: due,
      date_end: null,
      instructor: null,
      topics: [],
      description: text,
      slides: [],
      videos: [],
      readings: [],
      modules: [],
      assignments: kind === "assignments" ? [{ label: text, url: href, due_date: due }] : [],
      labs: kind === "labs" ? [{ label: text, url: href, due_date: due }] : [],
      exams: [],
      projects: kind === "projects" ? [{ label: text, url: href, due_date: due }] : [],
    });
  });

  const gradingSignals: GradingSignal[] = [];
  const gradingTextCandidates: string[] = [];
  $("#logistics, #grading, [id*='grading'], [class*='grading']").each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, " ").trim();
    if (txt) gradingTextCandidates.push(txt);
  });
  if (gradingTextCandidates.length === 0) {
    const lower = allText.toLowerCase();
    const idx = lower.indexOf("grading");
    if (idx >= 0) {
      const start = Math.max(0, idx - 1500);
      const end = Math.min(allText.length, idx + 3000);
      const window = allText.slice(start, end).replace(/\s+/g, " ").trim();
      if (window) gradingTextCandidates.push(window);
    }
  }
  const gradingText = gradingTextCandidates.join("\n");
  const lines = gradingText
    .split(/\n|[.;]/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const line of lines) {
    if (!/%/.test(line)) continue;
    if (/late|penalty|day|zero credit|policy|regrade/i.test(line)) continue;
    if (!/assignment|homework|project|exam|lab|quiz|participation|proposal|presentation|report|midterm|final|bonus/i.test(line)) continue;
    const pct = Array.from(line.matchAll(/(\d{1,3})%/g)).map((m) => Number(m[1]));
    if (pct.length === 0) continue;
    let weight = pct[0];
    const mult = line.match(/(\d{1,3})%\s*x\s*(\d{1,2})/i);
    if (mult?.[1] && mult?.[2]) {
      const product = Number(mult[1]) * Number(mult[2]);
      if (product > 0 && product <= 100) weight = product;
    }
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) continue;
    const component = line
      .replace(/\(\s*[\d%\sxX+]+\s*\)/g, "")
      .replace(/(\d{1,3})%/g, "")
      .replace(/[:\-–]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!component || component.length < 2) continue;
    if (component.length > 80) continue;
    if (/grading breakdown|does not have any tests|no tests or exams/i.test(component)) continue;
    if (!gradingSignals.some((g) => g.component.toLowerCase() === component.toLowerCase())) {
      gradingSignals.push({ component, weight });
      if (gradingSignals.length >= 12) break;
    }
  }

  return {
    scheduleRows,
    gradingSignals,
    extraResources: dedupeUrlsExact(extraResources),
  };
}

async function fetchDeterministicSignalsForUrl(url: string, timeoutMs = 10000): Promise<DeterministicSignals> {
  if (!/^https?:\/\//i.test(url)) return { scheduleRows: [], gradingSignals: [], extraResources: [] };
  if (isNoisyContextUrl(url)) return { scheduleRows: [], gradingSignals: [], extraResources: [] };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "FlashBot/1.0 (+course-intel)",
      },
    });
    if (!res.ok) return { scheduleRows: [], gradingSignals: [], extraResources: [] };
    const contentType = String(res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("text/html")) return { scheduleRows: [], gradingSignals: [], extraResources: [] };
    const html = await res.text();
    const webflow = parseWebflowScheduleAndGrading(html);
    const generic = parseGenericScheduleAndGrading(html);
    return {
      scheduleRows: mergeDeterministicScheduleRows(generic.scheduleRows, webflow.scheduleRows),
      gradingSignals: [...generic.gradingSignals, ...webflow.gradingSignals].reduce<GradingSignal[]>((acc, g) => {
        if (!acc.some((x) => x.component.toLowerCase() === g.component.toLowerCase())) acc.push(g);
        return acc;
      }, []),
      extraResources: dedupeUrlsExact([...generic.extraResources, ...webflow.extraResources]),
    };
  } catch {
    return { scheduleRows: [], gradingSignals: [], extraResources: [] };
  } finally {
    clearTimeout(timer);
  }
}

function mergeDeterministicScheduleRows(
  scheduleArray: Array<Record<string, unknown>>,
  deterministicRows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  if (deterministicRows.length === 0) return scheduleArray;
  if (scheduleArray.length === 0) return deterministicRows;

  const byKey = new Map<string, Record<string, unknown>>();
  const toKey = (row: Record<string, unknown>) => {
    const date = typeof row.date === "string" ? row.date.trim() : "";
    const title = typeof row.title === "string" ? row.title.trim().toLowerCase() : "";
    return `${date}|${title}`;
  };

  for (const row of scheduleArray) {
    byKey.set(toKey(row), { ...row });
  }

  for (const det of deterministicRows) {
    const key = toKey(det);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...det });
      continue;
    }
    const mergeLinks = (a: unknown, b: unknown, fallbackLabel: string) => {
      const arrA = Array.isArray(a) ? (a as Array<Record<string, unknown>>) : [];
      const arrB = Array.isArray(b) ? (b as Array<Record<string, unknown>>) : [];
      return dedupeLinks(
        [...arrA, ...arrB]
          .filter((x) => typeof x.url === "string")
          .map((x) => ({
            label: String(x.label || fallbackLabel),
            url: String(x.url),
          }))
      );
    };
    const mergeTaskLinks = (a: unknown, b: unknown, fallbackLabel: string) => {
      const arr = mergeLinks(a, b, fallbackLabel);
      return arr.map((x) => ({ ...x, due_date: null }));
    };

    byKey.set(key, {
      ...existing,
      sequence: existing.sequence || det.sequence || null,
      title: existing.title || det.title || null,
      date: existing.date || det.date || null,
      description: existing.description || det.description || null,
      slides: mergeLinks(existing.slides, det.slides, "Slides"),
      videos: mergeLinks(existing.videos, det.videos, "Video"),
      readings: mergeLinks(existing.readings, det.readings, "Reading"),
      assignments: mergeTaskLinks(existing.assignments, det.assignments, "Assignment"),
      labs: mergeTaskLinks(existing.labs, det.labs, "Lab"),
      projects: mergeTaskLinks(existing.projects, det.projects, "Project"),
    });
  }

  const merged = Array.from(byKey.values());
  merged.sort((a, b) => {
    const da = typeof a.date === "string" ? a.date : "";
    const db = typeof b.date === "string" ? b.date : "";
    return da.localeCompare(db);
  });
  return merged;
}

async function discoverCourseUrlsWithBrave(
  courseCode: string,
  university: string,
  title: string,
  timeoutMs = 8000
): Promise<string[]> {
  const token = process.env.BRAVE_SEARCH_API_KEY;
  if (!token) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const q = `${courseCode} ${university} ${title} syllabus schedule assignments`;
    const endpoint = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
      q,
      count: "8",
      search_lang: "en",
      country: "US",
    }).toString()}`;

    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as Record<string, unknown>;
    const web = (json.web && typeof json.web === "object") ? (json.web as Record<string, unknown>) : {};
    const results = Array.isArray(web.results) ? (web.results as Array<Record<string, unknown>>) : [];
    const urls = results
      .map((r) => (typeof r.url === "string" ? r.url.trim() : ""))
      .filter((u) => /^https?:\/\//i.test(u));
    return dedupeResourcesByDomain(urls).slice(0, 5);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
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
          course_schedule_id: null,
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
        course_schedule_id: null,
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

    if (blob.includes("assignment") && (blob.includes("due") || blob.includes("out") || Boolean(rowDate))) {
      infer("assignment", title || "Assignment");
    }
    if (blob.includes("lab") && (blob.includes("due") || blob.includes("out") || Boolean(rowDate))) {
      infer("lab", title || "Lab");
    }
    if (blob.includes("exam") || blob.includes("midterm") || blob.includes("final")) {
      infer("exam", title || "Exam");
    }
    if (blob.includes("project") && (blob.includes("due") || blob.includes("proposal") || blob.includes("milestone") || Boolean(rowDate))) {
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
      course_schedule_id: null,
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

function extractLegacyAssignmentsFromSyllabusContent(
  courseId: number,
  syllabusId: number | null,
  content: unknown,
  nowIso: string
): AssignmentRow[] {
  if (!content || typeof content !== "object" || Array.isArray(content)) return [];
  const rec = content as Record<string, unknown>;
  const legacy = rec.legacy_assignments;
  if (!Array.isArray(legacy)) return [];
  return extractTopLevelAssignments(courseId, syllabusId, legacy, nowIso);
}

function isAiPracticalPlanAssignment(row: AssignmentRow): boolean {
  const metadata = row.metadata && typeof row.metadata === "object"
    ? (row.metadata as Record<string, unknown>)
    : {};
  return String(metadata.source || "").toLowerCase() === "ai_practical_plan";
}

function toSyllabusRawAssignment(row: AssignmentRow) {
  return {
    kind: row.kind,
    label: row.label,
    due_on: row.due_on,
    url: row.url,
    description: row.description,
    source_sequence: row.source_sequence,
    source_row_date: row.source_row_date,
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  };
}

function dedupeAssignments(rows: AssignmentRow[]): AssignmentRow[] {
  const canonical = new Map<string, AssignmentRow>();
  for (const row of rows) {
    const baseKey = `${row.kind}|${row.label.toLowerCase()}`;
    const existing = canonical.get(baseKey);
    if (!existing) {
      canonical.set(baseKey, row);
      continue;
    }

    // Prefer the row with a concrete due date and URL/details richness.
    const existingScore =
      (existing.due_on ? 2 : 0) +
      (existing.url ? 1 : 0) +
      (existing.description ? 1 : 0) +
      (existing.course_schedule_id ? 1 : 0) +
      (isAiPracticalPlanAssignment(existing) ? 0 : 2);
    const currentScore =
      (row.due_on ? 2 : 0) +
      (row.url ? 1 : 0) +
      (row.description ? 1 : 0) +
      (row.course_schedule_id ? 1 : 0) +
      (isAiPracticalPlanAssignment(row) ? 0 : 2);
    if (currentScore > existingScore) {
      canonical.set(baseKey, row);
    }
  }
  return Array.from(canonical.values());
}

function summarizeGeminiApiError(status: number, rawBody: string, fallbackModel?: string): string {
  const body = String(rawBody || "").trim();
  let parsedMessage = "";
  let retrySeconds: number | null = null;
  let quotaModel = String(fallbackModel || "").trim();

  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const err = parsed.error && typeof parsed.error === "object" ? (parsed.error as Record<string, unknown>) : {};
    parsedMessage = typeof err.message === "string" ? err.message : "";
    const details = Array.isArray(err.details) ? (err.details as Array<Record<string, unknown>>) : [];
    for (const detail of details) {
      const retryDelay = typeof detail.retryDelay === "string" ? detail.retryDelay : "";
      if (retryDelay.endsWith("s")) {
        const value = Number(retryDelay.slice(0, -1));
        if (Number.isFinite(value) && value > 0) retrySeconds = value;
      }
      const violations = Array.isArray(detail.violations) ? (detail.violations as Array<Record<string, unknown>>) : [];
      for (const violation of violations) {
        const dims = violation.quotaDimensions && typeof violation.quotaDimensions === "object"
          ? (violation.quotaDimensions as Record<string, unknown>)
          : {};
        if (!quotaModel && typeof dims.model === "string") quotaModel = dims.model;
      }
    }
  } catch {
    parsedMessage = body;
  }

  const msg = parsedMessage || body;
  const modelLabel = quotaModel || "selected Gemini model";

  if (status === 429 || /quota|resource_exhausted|rate limit/i.test(msg)) {
    const retryHint = retrySeconds && retrySeconds > 0 ? ` Retry in about ${Math.ceil(retrySeconds)}s.` : "";
    return `Gemini quota exceeded for ${modelLabel}. Check plan/billing and limits.${retryHint}`;
  }
  if (status === 401 || status === 403 || /unauthorized|forbidden|api key/i.test(msg)) {
    return "Gemini authentication failed. Check GEMINI_API_KEY and project permissions.";
  }
  if (status >= 500) {
    return "Gemini service is temporarily unavailable. Please retry.";
  }

  const firstLine = msg.split("\n")[0].replace(/\s+/g, " ").trim();
  return `Gemini API error (${status}): ${firstLine || "request failed"}`;
}

async function generateDailyPlanWithModel(params: {
  provider: "perplexity" | "openai" | "gemini" | "local";
  modelName: string;
  prompt: string;
}): Promise<string> {
  const { provider, modelName, prompt } = params;
  if (provider === "gemini") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY || "")}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 8000 },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(summarizeGeminiApiError(res.status, body, modelName));
    }
    const json = (await res.json()) as Record<string, unknown>;
    const candidates = Array.isArray(json.candidates) ? (json.candidates as Array<Record<string, unknown>>) : [];
    const first = candidates[0] && typeof candidates[0] === "object" ? candidates[0] : {};
    const content = (first.content && typeof first.content === "object") ? (first.content as Record<string, unknown>) : {};
    const parts = Array.isArray(content.parts) ? (content.parts as Array<Record<string, unknown>>) : [];
    return parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("");
  }
  const out = await generateText({
    model: provider === "openai"
      ? openai.chat(modelName)
      : provider === "local"
        ? localOpenAICompatible.chat(modelName)
        : perplexity.chat(modelName),
    prompt,
    maxOutputTokens: 8000,
  });
  return out.text || "";
}

function normalizeGeneratedDescription(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.replace(/\s+/g, " ").trim();
  if (!value) return null;
  return value.slice(0, 1200);
}

function normalizeGeneratedSubdomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const value = input.replace(/\s+/g, " ").trim();
  if (!value) return null;
  return value.slice(0, 120);
}

function normalizeGeneratedTopics(input: unknown): string[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[\n,;|]/g).map((item) => item.trim())
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = String(raw || "").replace(/^[-*]\s*/, "").replace(/\s+/g, " ").trim();
    if (!value || value.length > 60) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= 10) break;
  }
  return out;
}

function extractMetadataFromAny(input: unknown) {
  const obj = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
  const nested = obj.content && typeof obj.content === "object" && !Array.isArray(obj.content)
    ? (obj.content as Record<string, unknown>)
    : {};
  const description = normalizeGeneratedDescription(
    obj.description ?? obj.course_description ?? nested.description ?? nested.course_description
  );
  const subdomain = normalizeGeneratedSubdomain(
    obj.subdomain ?? obj.domain ?? nested.subdomain ?? nested.domain
  );
  const topics = normalizeGeneratedTopics(
    obj.topics ?? obj.topic_tags ?? nested.topics ?? nested.topic_tags
  );
  return { description, subdomain, topics };
}

async function generateCourseMetadataWithModel(params: {
  provider: "perplexity" | "openai" | "gemini" | "local";
  modelName: string;
  prompt: string;
}): Promise<{ description: string | null; subdomain: string | null; topics: string[] }> {
  const text = await generateDailyPlanWithModel({
    provider: params.provider,
    modelName: params.modelName,
    prompt: params.prompt,
  });
  const parsed = parseLenientJson(text);
  const fromParsed = extractMetadataFromAny(parsed);
  if (fromParsed.description || fromParsed.subdomain || fromParsed.topics.length > 0) return fromParsed;
  return extractMetadataFromAny(text);
}

function buildPracticalPlanPrompt(input: {
  courseCode: string;
  title: string;
  startIso: string;
  endIso: string;
  tasks: Array<{
    kind: string;
    title: string;
    due_on: string | null;
    source_sequence: string | null;
    url: string | null;
    estimated_minutes: number;
    importance_score: number;
    urgency_score: number;
    priority_score: number;
    difficulty: "light" | "medium" | "heavy";
  }>;
}) {
  return [
    "You are a practical course planner.",
    `Course: ${input.courseCode} ${input.title}`,
    `Plan window: ${input.startIso} to ${input.endIso}.`,
    "Use only the provided tasks. Build a realistic day-by-day plan.",
    "Hard rules:",
    `1) Do not generate any day before ${input.startIso}.`,
    `2) Do not generate any day after ${input.endIso}.`,
    "3) Prioritize by deadline + priority_score (higher first).",
    "4) Balance workload each day and include rest/light days between heavy days.",
    "5) Keep each day concise (max 4 tasks).",
    "6) Keep important tasks only (no noisy filler).",
    "Preferred output is JSON using this schema:",
    '{"days":[{"date":"YYYY-MM-DD","focus":"...","tasks":[{"title":"...","kind":"reading|assignment|project|lab|exercise|quiz|exam","minutes":60}]}]}',
    "If you cannot produce strict JSON, provide clean plain text in this format:",
    "YYYY-MM-DD: Focus",
    "- task line",
    `Tasks: ${JSON.stringify(input.tasks)}`,
  ].join("\n");
}

function isoToDateUtc(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDaysIso(iso: string, days: number): string {
  const base = isoToDateUtc(iso) || new Date();
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return toIsoDateUtc(next);
}

function diffDaysInclusive(startIso: string, endIso: string): number {
  const start = isoToDateUtc(startIso);
  const end = isoToDateUtc(endIso);
  if (!start || !end) return 1;
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return diff + 1;
}

function resolvePlanningWindow(
  rows: Array<Record<string, unknown>> | null | undefined,
  todayIso: string,
  fallbackWindowDays = 56
) {
  const normalized = Array.isArray(rows)
    ? rows
      .map((row) => ({
        start: normalizeDate(row.start_date),
        end: normalizeDate(row.end_date),
      }))
      .filter((row) => Boolean(row.start) && Boolean(row.end)) as Array<{ start: string; end: string }>
    : [];

  const earliestStart = normalized.length > 0
    ? normalized.reduce((min, row) => (row.start < min ? row.start : min), normalized[0].start)
    : null;
  const latestEnd = normalized.length > 0
    ? normalized.reduce((max, row) => (row.end > max ? row.end : max), normalized[0].end)
    : null;

  const startIso = earliestStart && earliestStart > todayIso ? earliestStart : todayIso;
  const endIso = latestEnd && latestEnd >= startIso
    ? latestEnd
    : addDaysIso(startIso, Math.max(1, fallbackWindowDays) - 1);
  const windowDays = Math.max(1, Math.min(180, diffDaysInclusive(startIso, endIso)));

  return {
    startIso,
    endIso,
    windowDays,
    fromUserStudyPlan: Boolean(earliestStart && latestEnd),
  };
}

function clampDailyPlanToRange(plan: DailyPlan, startIso: string, endIso: string): DailyPlan {
  return {
    days: (plan.days || [])
      .filter((day) => day.date >= startIso && day.date <= endIso)
      .map((day) => ({ ...day, tasks: Array.isArray(day.tasks) ? day.tasks.slice(0, 4) : [] }))
      .filter((day) => day.tasks.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

function estimateTaskMinutes(kind: string): number {
  const k = String(kind || "").toLowerCase();
  if (k === "exam") return 150;
  if (k === "project") return 120;
  if (k === "assignment") return 90;
  if (k === "lab") return 90;
  if (k === "reading") return 45;
  if (k === "quiz") return 40;
  return 60;
}

function buildPlanningTaskProfiles(tasks: PlanSeedTask[], startIso: string) {
  return tasks.map((task) => {
    const kind = String(task.kind || "task");
    const estimatedMinutes = estimateTaskMinutes(kind);
    const importanceBase =
      kind === "exam" ? 5 :
      kind === "project" ? 5 :
      kind === "assignment" ? 4 :
      kind === "lab" ? 4 :
      kind === "quiz" ? 3 : 2;
    const due = task.due_on || "";
    const urgency =
      due && due >= startIso
        ? Math.max(1, 6 - Math.min(5, Math.floor((diffDaysInclusive(startIso, due) - 1) / 3)))
        : 1;
    const difficulty: "light" | "medium" | "heavy" =
      estimatedMinutes >= 120 ? "heavy" : estimatedMinutes >= 75 ? "medium" : "light";
    return {
      ...task,
      estimated_minutes: estimatedMinutes,
      importance_score: importanceBase,
      urgency_score: urgency,
      priority_score: importanceBase * 2 + urgency,
      difficulty,
    };
  });
}

function assignSyntheticDeadlines(tasks: PlanSeedTask[], startIso: string, endIso: string): PlanSeedTask[] {
  if (tasks.length === 0) return [];
  const windowDays = Math.max(1, diffDaysInclusive(startIso, endIso));
  const extractSequence = (task: PlanSeedTask): number | null => {
    const candidates = [task.source_sequence, task.title]
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    for (const raw of candidates) {
      const text = raw.toLowerCase();
      const m = text.match(/\b(?:project|assignment|homework|lab|exercise|quiz|week|module|part)\s*#?\s*(\d{1,3})\b/);
      if (m?.[1]) return Number(m[1]);
      const trailing = text.match(/\b(\d{1,3})\b/);
      if (trailing?.[1]) return Number(trailing[1]);
    }
    return null;
  };
  const scored = tasks
    .map((task, index) => {
      const kind = String(task.kind || "task").toLowerCase();
      const weight =
        kind === "exam" ? 6 :
        kind === "project" ? 5 :
        kind === "assignment" ? 4 :
        kind === "lab" ? 4 :
        kind === "quiz" ? 3 : 2;
      return { task, index, weight, sequence: extractSequence(task), kind };
    })
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      if (a.kind === b.kind && a.sequence !== null && b.sequence !== null && a.sequence !== b.sequence) {
        return a.sequence - b.sequence;
      }
      return a.index - b.index;
    });

  return scored.map((item, idx) => {
    const offset = Math.min(windowDays - 1, Math.floor((idx * windowDays) / Math.max(1, scored.length)));
    return {
      ...item.task,
      // Ignore raw due dates and use synthesized in-window targets for active-course planning.
      due_on: addDaysIso(startIso, offset),
    };
  });
}

async function fetchBraveSnippetForUrl(
  url: string,
  courseCode: string,
  university: string,
  timeoutMs = 8000
): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  const token = process.env.BRAVE_SEARCH_API_KEY;
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const q = `site:${host} ${courseCode} ${university} syllabus schedule assignments`;
    const endpoint = `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({
      q,
      count: "5",
      search_lang: "en",
      country: "US",
    }).toString()}`;

    const res = await fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const web = (json.web && typeof json.web === "object") ? (json.web as Record<string, unknown>) : {};
    const results = Array.isArray(web.results) ? (web.results as Array<Record<string, unknown>>) : [];
    if (results.length === 0) return null;

    const picked = results
      .filter((r) => typeof r.url === "string" && typeof r.description === "string")
      .slice(0, 2)
      .map((r) => ({
        url: String(r.url || "").trim(),
        title: typeof r.title === "string" ? r.title.trim() : "",
        description: String(r.description || "").replace(/\s+/g, " ").trim(),
      }))
      .filter((r) => r.url.length > 0 && r.description.length > 0);

    if (picked.length === 0) return null;
    const snippets = picked.map((r, i) => `${i + 1}. ${r.title || r.url}\n   ${r.url}\n   ${r.description}`).join("\n");
    return `Resource seed: ${url}\nBrave snippets:\n${snippets}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function buildFetchedResourcesContext(urls: string[], courseCode: string, university: string): Promise<string> {
  const uniqueUrls = Array.from(new Set(urls.filter((u) => /^https?:\/\//i.test(u)))).slice(0, 4);
  if (uniqueUrls.length === 0) return "";
  const settled = await Promise.allSettled(
    uniqueUrls.map((u) => fetchBraveSnippetForUrl(u, courseCode, university))
  );
  const snippets = settled
    .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is string => Boolean(v));
  if (snippets.length === 0) return "";
  return `Fetched URL context:\n${snippets.map((s, i) => `[${i + 1}] ${s}`).join("\n\n")}`;
}

function isLikelyCourseSubpage(url: string, anchorText: string): boolean {
  const haystack = `${url} ${anchorText}`.toLowerCase();
  return /(syllabus|calendar|schedule|resource|reading|lecture|lab|office hour|assignment|policy|note|material)/i.test(haystack);
}

function filterRelevantResourceUrls(
  urls: string[],
  contextUrls: string[],
  courseCode: string,
  title: string
): string[] {
  const primaryHosts = new Set(
    contextUrls
      .map((u) => {
        try {
          return new URL(u).hostname.replace(/^www\./i, "").toLowerCase();
        } catch {
          return "";
        }
      })
      .filter(Boolean)
  );

  const codeToken = courseCode.replace(/\s+/g, "").toLowerCase();
  const titleToken = title.toLowerCase();
  const out: Array<{ url: string; score: number }> = [];

  for (const raw of dedupeResourcesByDomain(urls)) {
    let score = 0;
    try {
      if (isNoisyContextUrl(raw)) continue;
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./i, "").toLowerCase();
      const path = `${u.pathname}${u.search}`.toLowerCase();
      const full = `${host}${path}`;

      if (primaryHosts.has(host)) score += 70;
      if (/syllabus|calendar|schedule|resource|materials?|reading|assignment|homework|lab|project|policy|lecture|notes?/i.test(path)) score += 55;
      if (/github\.io|github\.com|docs\.google\.com|drive\.google\.com|explorecourses\.stanford\.edu|canvas|edstem|piazza/i.test(host)) score += 30;
      if (codeToken && full.includes(codeToken)) score += 25;
      if (titleToken && titleToken.length > 8 && full.includes(titleToken.split(" ").slice(0, 2).join("-"))) score += 10;

      if (score >= 30) out.push({ url: raw, score });
    } catch {
      // Skip invalid URL.
    }
  }

  return out
    .sort((a, b) => b.score - a.score)
    .map((x) => x.url)
    .slice(0, 25);
}

async function filterResourcesByRedisBlacklist(urls: string[], courseCode: string) {
  const normalizedCourseCode = String(courseCode || "").trim();
  if (!normalizedCourseCode) return { kept: urls, dropped: [] as string[] };
  const candidates = urls.map((url) => ({ url, key: buildResourceBlacklistKey(normalizedCourseCode, url) }));
  const keys = candidates.map((item) => item.key).filter((item): item is string => typeof item === "string");
  if (keys.length === 0) return { kept: urls, dropped: [] as string[] };
  const values = await upstashMGet(keys);
  const blockedKeys = new Set<string>();
  keys.forEach((key, idx) => {
    if (typeof values[idx] === "string" && values[idx] !== "") {
      blockedKeys.add(key);
    }
  });

  const kept: string[] = [];
  const dropped: string[] = [];
  for (const item of candidates) {
    if (item.key && blockedKeys.has(item.key)) dropped.push(item.url);
    else kept.push(item.url);
  }
  return { kept, dropped };
}

function isAllowedCourseLinkHost(seedHost: string, linkHost: string): boolean {
  const normalizedSeed = seedHost.replace(/^www\./i, "").toLowerCase();
  const normalizedLink = linkHost.replace(/^www\./i, "").toLowerCase();
  if (!normalizedSeed || !normalizedLink) return false;
  if (normalizedSeed === normalizedLink) return true;
  if (normalizedLink.endsWith(`.${normalizedSeed}`) || normalizedSeed.endsWith(`.${normalizedLink}`)) return true;
  return /github\.com|docs\.google\.com|drive\.google\.com|canvas\.|edstem\.org|piazza\.com/i.test(normalizedLink);
}

async function discoverImportantCourseLinks(seedUrls: string[], timeoutMs = 9000): Promise<string[]> {
  const scored = new Map<string, number>();
  const targets = dedupeUrlsExact(seedUrls).slice(0, 4);

  const scoreCourseLink = (url: string, anchorText: string): number => {
    const haystack = `${url} ${anchorText}`.toLowerCase();
    let score = 0;
    if (/syllabus/.test(haystack)) score += 100;
    if (/calendar|schedule/.test(haystack)) score += 90;
    if (/resource|material|notes?/.test(haystack)) score += 80;
    if (/assignment|homework|project|lab|office hour|policy|grading/.test(haystack)) score += 70;
    if (/week|lecture|reading/.test(haystack)) score += 45;
    return score;
  };

  for (const seed of targets) {
    if (!/^https?:\/\//i.test(seed)) continue;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const seedHost = new URL(seed).hostname;
      const res = await fetch(seed, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
        headers: {
          "User-Agent": "FlashBot/1.0 (+course-intel)",
        },
      });

      if (res.url && /^https?:\/\//i.test(res.url)) {
        if (!isNoisyContextUrl(res.url)) {
          scored.set(res.url, Math.max(scored.get(res.url) || 0, 25));
        }
      } else {
        if (!isNoisyContextUrl(seed)) {
          scored.set(seed, Math.max(scored.get(seed) || 0, 25));
        }
      }
      if (!res.ok) continue;

      const contentType = String(res.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("text/html")) continue;

      const html = await res.text();
      const $ = load(html);
      $("a[href]").each((_, el) => {
        const hrefRaw = ($(el).attr("href") || "").trim();
        const textRaw = $(el).text().trim();
        if (!hrefRaw || hrefRaw.startsWith("#") || /^javascript:/i.test(hrefRaw) || /^mailto:/i.test(hrefRaw)) return;
        let resolved = "";
        try {
          resolved = new URL(hrefRaw, res.url || seed).toString();
        } catch {
          return;
        }
        if (!/^https?:\/\//i.test(resolved)) return;

        try {
          const linkHost = new URL(resolved).hostname;
          if (!isAllowedCourseLinkHost(seedHost, linkHost)) return;
        } catch {
          return;
        }

        if (!isLikelyCourseSubpage(resolved, textRaw)) return;
        if (isNoisyContextUrl(resolved)) return;
        const score = scoreCourseLink(resolved, textRaw);
        if (score > 0) {
          scored.set(resolved, Math.max(scored.get(resolved) || 0, score));
        }
      });
    } catch {
      // Skip failed seed and continue with the rest.
    } finally {
      clearTimeout(timer);
    }
  }

  return Array.from(scored.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([url]) => url)
    .slice(0, 8);
}

export async function runCourseIntel(
  userId: string,
  courseId: number,
  options?: {
    fastMode?: boolean;
    sourceMode?: CourseIntelSourceMode;
    executionMode?: CourseIntelExecutionMode;
    onProgress?: (event: {
      stage: string;
      message: string;
      progress?: number;
      details?: Record<string, unknown>;
    }) => void | Promise<void>;
  }
) {
  const supabase = createAdminClient();
  const fastMode = Boolean(options?.fastMode);
  const emitProgress = async (
    stage: string,
    message: string,
    progress?: number,
    details?: Record<string, unknown>
  ) => {
    if (!options?.onProgress) return;
    try {
      await options.onProgress({ stage, message, progress, details });
    } catch {
      // Ignore observer errors so sync execution is never blocked by progress listeners.
    }
  };
  const t0 = Date.now();
  const timings: Record<string, number> = {};
  const mark = (name: string) => {
    timings[name] = Date.now() - t0;
  };
  const persistGeneratedStudyPlan = async (plan: DailyPlan) => {
    const days = Array.isArray(plan.days) ? plan.days : [];
    if (days.length === 0) return 0;
    const dates = days.map((d) => d.date).filter((d): d is string => /^\d{4}-\d{2}-\d{2}$/.test(String(d)));
    if (dates.length === 0) return 0;
    const startDate = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
    const endDate = dates.reduce((max, d) => (d > max ? d : max), dates[0]);
    const weekdaySet = new Set<number>();
    for (const iso of dates) {
      const date = new Date(`${iso}T00:00:00.000Z`);
      const day = date.getUTCDay();
      const mapped = day === 0 ? 7 : day;
      weekdaySet.add(mapped);
    }
    const daysOfWeek = Array.from(weekdaySet.values()).sort((a, b) => a - b);
    const admin = createAdminClient();
    const { error: clearError } = await admin
      .from("study_plans")
      .delete()
      .eq("user_id", userId)
      .eq("course_id", courseId);
    if (clearError) throw new Error(clearError.message);
    const { error: insertError } = await admin
      .from("study_plans")
      .insert(expandStudyPlanDays({
        user_id: userId,
        course_id: courseId,
        start_date: startDate,
        end_date: endDate,
        days_of_week: daysOfWeek.length > 0 ? daysOfWeek : [1, 2, 3, 4, 5],
        start_time: null,
        end_time: null,
        location: null,
        kind: "generated",
        timezone: "UTC",
      }));
    if (insertError) throw new Error(insertError.message);
    return 1;
  };
  const { data: course } = await supabase
    .from("courses")
    .select("id, course_code, university, title, url, resources, description, subdomain")
    .eq("id", courseId)
    .single();
  if (!course) throw new Error("Course not found");
  const { data: existingFieldRows } = await supabase
    .from("course_fields")
    .select("fields(name)")
    .eq("course_id", courseId);
  const existingTopics = Array.from(
    new Set(
      (existingFieldRows || [])
        .map((row: Record<string, unknown>) => {
          const field = row.fields as Record<string, unknown> | null;
          return typeof field?.name === "string" ? field.name.trim() : "";
        })
        .filter((name: string) => name.length > 0)
    )
  );
  const hasDescription = typeof course.description === "string" && course.description.trim().length > 0;
  const hasSubdomain = typeof course.subdomain === "string" && course.subdomain.trim().length > 0;
  const hasTopics = existingTopics.length > 0;
  mark("loaded_course");
  await emitProgress("load", "Loaded course record.", 5);

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
  mark("loaded_profile");
  await emitProgress("profile", "Loaded profile and prompt settings.", 10);

  const providerRaw = String(profile?.ai_provider || "").trim();
  const preferredProvider =
    providerRaw === "openai"
      ? "openai"
      : providerRaw === "gemini"
          ? "gemini"
          : "perplexity";
  const executionMode: CourseIntelExecutionMode =
    options?.executionMode === "local"
      ? "local"
      : options?.executionMode === "deterministic"
        ? "deterministic"
        : "service";
  const llmEnabled = executionMode !== "deterministic";
  if (llmEnabled && !template) throw new Error("Course intel prompt template not configured");
  const webSearchEnabled = executionMode === "deterministic" ? true : Boolean(profile?.ai_web_search_enabled);
  const provider: "perplexity" | "openai" | "gemini" | "local" =
    executionMode === "local" ? "local" : preferredProvider;
  if (llmEnabled && provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("AI service not configured: OPENAI_API_KEY missing");
  }
  if (llmEnabled && provider === "gemini" && !process.env.GEMINI_API_KEY) {
    throw new Error("AI service not configured: GEMINI_API_KEY missing");
  }
  if (llmEnabled && provider === "perplexity" && !process.env.PERPLEXITY_API_KEY) {
    throw new Error("AI service not configured: PERPLEXITY_API_KEY missing");
  }
  if (executionMode === "local" && !process.env.LOCAL_LLM_BASE_URL) {
    throw new Error("AI service not configured: LOCAL_LLM_BASE_URL missing");
  }

  const modelName = !llmEnabled
    ? "deterministic-pipeline-v1"
    : provider === "local"
      ? String(process.env.LOCAL_LLM_MODEL || profile?.ai_default_model || "gpt-4o-mini").trim()
      : await resolveModelForProvider(provider, String(profile?.ai_default_model || "").trim());
  if (!modelName) {
    throw new Error(`AI service not configured: no active model for provider ${provider}`);
  }

  const sourceModeRequested: CourseIntelSourceMode = options?.sourceMode || "auto";
  const { data: existingSyllabus } = await supabase
    .from("course_syllabi")
    .select("id, source_url, raw_text, content, schedule")
    .eq("course_id", courseId)
    .maybeSingle();
  const { data: existingAssignmentsRows } = await supabase
    .from("course_assignments")
    .select("kind, label, due_on, url, description, source_sequence, source_row_date, metadata")
    .eq("course_id", courseId)
    .order("due_on", { ascending: true })
    .limit(500);
  const { data: userStudyPlanRows } = await supabase
    .from("study_plans")
    .select("start_date, end_date")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("start_date", { ascending: true })
    .limit(120);

  const existingScheduleRows = Array.isArray(existingSyllabus?.schedule) ? (existingSyllabus.schedule as Array<Record<string, unknown>>) : [];
  const existingAssignments = Array.isArray(existingAssignmentsRows) ? existingAssignmentsRows : [];
  const existingLegacyAssignments = extractLegacyAssignmentsFromSyllabusContent(
    courseId,
    existingSyllabus?.id ? Number(existingSyllabus.id) : null,
    existingSyllabus?.content,
    new Date().toISOString()
  );
  const hasExistingData =
    existingScheduleRows.length > 0 ||
    existingAssignments.length > 0 ||
    existingLegacyAssignments.length > 0;
  const sourceModeEffective: CourseIntelSourceMode =
    sourceModeRequested === "auto" ? (hasExistingData ? "existing" : "fresh") : sourceModeRequested;

  if (sourceModeEffective === "existing" && !hasExistingData) {
    throw new Error("No existing scraper data available for this course. Use fresh mode.");
  }

  await emitProgress(
    "mode",
    sourceModeEffective === "existing" ? "Using existing scraper data." : "Running fresh scrape + AI extraction.",
    12,
    { sourceModeRequested, sourceModeEffective, hasExistingData }
  );
  const todayIso = toIsoDateUtc(new Date());
  const planningWindow = resolvePlanningWindow(userStudyPlanRows as Array<Record<string, unknown>> | null | undefined, todayIso, 56);
  await emitProgress("planning_window", "Step 1/6 Planning window resolved.", 14, {
    startDate: planningWindow.startIso,
    endDate: planningWindow.endIso,
    windowDays: planningWindow.windowDays,
    source: planningWindow.fromUserStudyPlan ? "user_study_plan" : "default",
  });

  const persistMissingCourseMetadata = async (input: {
    extracted: unknown;
    contextText: string;
    taskHints: PlanSeedTask[];
  }) => {
    if (hasDescription && hasSubdomain && hasTopics) return;

    const extracted = extractMetadataFromAny(input.extracted);
    let description = hasDescription ? null : extracted.description;
    let subdomain = hasSubdomain ? null : extracted.subdomain;
    let topics = hasTopics ? [] : extracted.topics;

    const needsGeneration =
      (!hasDescription && !description) ||
      (!hasSubdomain && !subdomain) ||
      (!hasTopics && topics.length === 0);

    if (needsGeneration && llmEnabled) {
      const taskPreview = input.taskHints.slice(0, 40).map((task) => ({
        kind: task.kind,
        title: task.title,
        due_on: task.due_on,
      }));
      const metadataPrompt = [
        template,
        "",
        "Generate ONLY missing metadata fields for this course.",
        `Course code: ${String(course.course_code || "")}`,
        `Title: ${String(course.title || "")}`,
        `University: ${String(course.university || "")}`,
        `Current description: ${hasDescription ? String(course.description || "") : "(missing)"}`,
        `Current subdomain: ${hasSubdomain ? String(course.subdomain || "") : "(missing)"}`,
        `Current topics: ${hasTopics ? existingTopics.join(", ") : "(missing)"}`,
        "Task hints:",
        JSON.stringify(taskPreview),
        "Retrieved context:",
        input.contextText.slice(0, 9000),
        "",
        "Return ONLY one JSON object in this exact schema:",
        '{"description": "string|null", "subdomain": "string|null", "topics": ["string"]}',
      ].join("\n");

      try {
        const generated = await generateCourseMetadataWithModel({
          provider,
          modelName,
          prompt: metadataPrompt,
        });
        if (!description) description = generated.description;
        if (!subdomain) subdomain = generated.subdomain;
        if (topics.length === 0) topics = generated.topics;
      } catch {
        // Metadata completion is best-effort; keep sync moving.
      }
    }

    const coursePatch: Record<string, unknown> = {};
    if (!hasDescription && description) coursePatch.description = description;
    if (!hasSubdomain && subdomain) coursePatch.subdomain = subdomain;

    const admin = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let topicsSaved = 0;

    if (Object.keys(coursePatch).length > 0) {
      const { error: patchError } = await admin.from("courses").update(coursePatch).eq("id", courseId);
      if (patchError) throw new Error(patchError.message);
    }

    if (!hasTopics && topics.length > 0) {
      const { error: fieldUpsertError } = await admin
        .from("fields")
        .upsert(topics.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
      if (fieldUpsertError) throw new Error(fieldUpsertError.message);

      const { data: fieldRows, error: fieldFetchError } = await admin
        .from("fields")
        .select("id, name")
        .in("name", topics);
      if (fieldFetchError) throw new Error(fieldFetchError.message);

      const selectedFields = Array.isArray(fieldRows) ? fieldRows : [];
      if (selectedFields.length > 0) {
        const { error: clearError } = await admin
          .from("course_fields")
          .delete()
          .eq("course_id", courseId);
        if (clearError) throw new Error(clearError.message);

        const { error: insertError } = await admin
          .from("course_fields")
          .insert(selectedFields.map((row: Record<string, unknown>) => ({
            course_id: courseId,
            field_id: Number(row.id),
          })));
        if (insertError) throw new Error(insertError.message);
        topicsSaved = selectedFields.length;
      }
    }

    await emitProgress("metadata", "Completed missing metadata check (description/topics/subdomain).", 81, {
      descriptionSaved: Boolean(coursePatch.description),
      subdomainSaved: Boolean(coursePatch.subdomain),
      topicsSaved,
    });
  };

  if (sourceModeEffective === "existing") {
    const nowIso = new Date().toISOString();
    const existingParsedContent =
      existingSyllabus?.content && typeof existingSyllabus.content === "object"
        ? (existingSyllabus.content as Record<string, unknown>)
        : {};
    const existingSourceUrl = typeof existingSyllabus?.source_url === "string" ? existingSyllabus.source_url : null;
    const existingRawText = typeof existingSyllabus?.raw_text === "string" ? existingSyllabus.raw_text : "";

    const assignmentRowsExistingFromTable: AssignmentRow[] = existingAssignments.map((row: Record<string, unknown>) => ({
      course_id: courseId,
      syllabus_id: existingSyllabus?.id ? Number(existingSyllabus.id) : null,
      course_schedule_id: null,
      kind: toKind(typeof row.kind === "string" ? row.kind : "other"),
      label: typeof row.label === "string" ? row.label : "",
      due_on: normalizeDate(row.due_on),
      url: typeof row.url === "string" ? row.url : null,
      description: typeof row.description === "string" ? row.description : null,
      source_sequence: typeof row.source_sequence === "string" ? row.source_sequence : null,
      source_row_date: normalizeDate(row.source_row_date),
      metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Json,
      retrieved_at: nowIso,
      updated_at: nowIso,
    })).filter((row) => row.label.trim().length > 0);
    const assignmentRowsExisting = dedupeAssignments([
      ...assignmentRowsExistingFromTable,
      ...existingLegacyAssignments.map((row) => ({
        ...row,
        retrieved_at: nowIso,
        updated_at: nowIso,
      })),
    ]);

    const seedTasksFromSchedule = buildPlanSeedTasks(existingScheduleRows);
    const seedTasksFromAssignments: PlanSeedTask[] = assignmentRowsExisting.map((row) => ({
      kind: row.kind === "other" ? "task" : row.kind,
      title: row.label,
      due_on: row.due_on,
      source_sequence: row.source_sequence,
      url: row.url,
      description: row.description,
    }));
    const seedTaskKey = new Set<string>();
    const seedTasks = [...seedTasksFromSchedule, ...seedTasksFromAssignments].filter((task) => {
      const key = `${task.kind}|${task.title.toLowerCase()}|${task.due_on || ""}`;
      if (!task.title || seedTaskKey.has(key)) return false;
      seedTaskKey.add(key);
      return true;
    });
    await emitProgress("task_extract", "Step 3/6 Loaded lectures, assignments, exams, and key events from existing data.", 45, {
      seedTasks: seedTasks.length,
      existingScheduleRows: existingScheduleRows.length,
      existingAssignments: assignmentRowsExisting.length,
    });
    const tasksForPlanning = assignSyntheticDeadlines(
      seedTasks.map((task) => ({ ...task, due_on: null })),
      planningWindow.startIso,
      planningWindow.endIso
    );
    const profiledTasks = buildPlanningTaskProfiles(tasksForPlanning, planningWindow.startIso);
    await emitProgress("workload", "Step 4/6 Evaluated workload and difficulty.", 52, {
      heavyTasks: profiledTasks.filter((task) => task.difficulty === "heavy").length,
      mediumTasks: profiledTasks.filter((task) => task.difficulty === "medium").length,
      lightTasks: profiledTasks.filter((task) => task.difficulty === "light").length,
    });

    let practicalPlan = buildFallbackDailyPlan(tasksForPlanning, planningWindow.startIso, planningWindow.windowDays);
    practicalPlan = clampDailyPlanToRange(practicalPlan, planningWindow.startIso, planningWindow.endIso);
    await emitProgress("prioritize", "Step 5/6 Prioritized tasks and generated schedule draft.", 58, {
      prioritizedTasks: profiledTasks.length,
    });
    if (llmEnabled && seedTasks.length > 0) {
      try {
        const planPrompt = buildPracticalPlanPrompt({
          courseCode: String(course.course_code || ""),
          title: String(course.title || ""),
          startIso: planningWindow.startIso,
          endIso: planningWindow.endIso,
          tasks: profiledTasks.slice(0, 120).map((task) => ({
            kind: task.kind,
            title: task.title,
            due_on: task.due_on,
            source_sequence: task.source_sequence,
            url: task.url,
            estimated_minutes: task.estimated_minutes,
            importance_score: task.importance_score,
            urgency_score: task.urgency_score,
            priority_score: task.priority_score,
            difficulty: task.difficulty,
          })),
        });
        const rawPlan = await generateDailyPlanWithModel({ provider, modelName, prompt: planPrompt });
        const parsedPlan = parseLenientJson(rawPlan);
        const sanitized = clampDailyPlanToRange(
          sanitizeDailyPlan(parsedPlan, planningWindow.startIso),
          planningWindow.startIso,
          planningWindow.endIso
        );
        const looseParsed = sanitized.days.length > 0
          ? sanitized
          : clampDailyPlanToRange(parseLooseDailyPlanText(rawPlan, planningWindow.startIso), planningWindow.startIso, planningWindow.endIso);
        if (looseParsed.days.length > 0) practicalPlan = looseParsed;
      } catch {
        // Keep fallback plan.
      }
    }

    await persistMissingCourseMetadata({
      extracted: existingParsedContent,
      contextText: `${existingRawText}\n\n${JSON.stringify(existingParsedContent || {})}`,
      taskHints: seedTasks,
    });

    const mergedContent = {
      ...existingParsedContent,
      course_intel: {
        generated_at: new Date().toISOString(),
        source_mode: sourceModeEffective,
        curated_tasks: seedTasks.slice(0, 200),
        curated_task_counts: {
          total: seedTasks.length,
          readings: seedTasks.filter((task) => task.kind === "reading").length,
          assignments: seedTasks.filter((task) => task.kind === "assignment").length,
          projects: seedTasks.filter((task) => task.kind === "project").length,
          labs: seedTasks.filter((task) => task.kind === "lab").length,
          exercises: seedTasks.filter((task) => task.kind === "exercise").length,
          quizzes: seedTasks.filter((task) => task.kind === "quiz").length,
          exams: seedTasks.filter((task) => task.kind === "exam").length,
        },
        raw_data: {
          assignments: assignmentRowsExisting.map((row) => toSyllabusRawAssignment(row)),
        },
        practical_plan: practicalPlan,
      },
    };

    const existingCourseResources = (Array.isArray(course.resources) ? course.resources : [])
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
      .map((u) => u.trim());
    const finalResources = dedupeUrlsExact(existingCourseResources);
    const { kept: filteredResources, dropped: blacklistedResources } =
      await filterResourcesByRedisBlacklist(finalResources, String(course.course_code || ""));
    const admin = createAdminClient();
    if (filteredResources.length > 0) {
      const mergedResources = dedupeUrlsExact([
        ...existingCourseResources,
        ...filteredResources,
      ]);
      const { error: courseUpdateError } = await admin.from("courses").update({ resources: mergedResources }).eq("id", courseId);
      if (courseUpdateError) throw new Error(courseUpdateError.message);
    }

    const { data: syllabusUpserted, error: syllabusError } = await admin
      .from("course_syllabi")
      .upsert(
        {
          course_id: courseId,
          source_url: existingSourceUrl,
          raw_text: existingRawText,
          content: mergedContent as Json,
          schedule: existingScheduleRows as Json,
          retrieved_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "course_id" }
      )
      .select("id")
      .maybeSingle();
    if (syllabusError) throw new Error(syllabusError.message);
    const syllabusId = syllabusUpserted?.id ? Number(syllabusUpserted.id) : (existingSyllabus?.id ? Number(existingSyllabus.id) : null);

    const scheduleRowsFromPlan = buildCourseSchedulesFromDailyPlan({
      courseId,
      syllabusId,
      plan: practicalPlan,
      nowIso,
    });
    const adminAny = admin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    let scheduleRowsPersisted = 0;
    const scheduleBinding = new Map<string, number>();
    if (scheduleRowsFromPlan.length > 0) {
      await emitProgress("persist", "Clearing legacy schedule rows before writing regenerated schedule.", 86, {
        generatedScheduleRows: scheduleRowsFromPlan.length,
      });
      const { error: deleteSchedulesError } = await adminAny
        .from("course_schedules")
        .delete()
        .eq("course_id", courseId);
      if (deleteSchedulesError) throw new Error(deleteSchedulesError.message);
      const { data: insertedSchedules, error: insertSchedulesError } = await adminAny
        .from("course_schedules")
        .insert(scheduleRowsFromPlan)
        .select("id, schedule_date, task_title, task_kind");
      if (insertSchedulesError) throw new Error(insertSchedulesError.message);
      const inserted = Array.isArray(insertedSchedules) ? insertedSchedules : [];
      scheduleRowsPersisted = inserted.length;
      await emitProgress("persist", "Regenerated schedule rows written.", 90, {
        scheduleRowsPersisted,
      });
      for (const row of inserted) {
        const date = typeof row.schedule_date === "string" ? row.schedule_date : "";
        const title = typeof row.task_title === "string" ? row.task_title.trim().toLowerCase() : "";
        const kind = typeof row.task_kind === "string" ? row.task_kind.trim().toLowerCase() : "";
        const id = Number(row.id || 0);
        if (!date || !title || !id) continue;
        scheduleBinding.set(`${date}|${title}|${kind}`, id);
      }
    }

    const aiAssignments = buildAssignmentsFromDailyPlan({
      courseId,
      syllabusId,
      plan: practicalPlan,
      nowIso,
    }).map((row) => {
      const key = `${row.due_on || ""}|${row.label.trim().toLowerCase()}|${String(row.kind || "").toLowerCase()}`;
      const scheduleId = scheduleBinding.get(key);
      return {
        ...row,
        course_schedule_id: scheduleId || null,
        metadata: row.metadata as Json,
      } as AssignmentRow;
    });

    const assignmentRows = dedupeAssignments([...assignmentRowsExisting, ...aiAssignments]);
    let assignmentsPersisted = 0;
    let assignmentsPreserved = false;
    if (assignmentRows.length > 0) {
      await emitProgress("persist", "Replacing assignment table with regenerated assignment set.", 92, {
        assignmentsToWrite: assignmentRows.length,
      });
      const { error: deleteAssignmentsError } = await admin.from("course_assignments").delete().eq("course_id", courseId);
      if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message);
      const { error: insertAssignmentsError } = await admin.from("course_assignments").insert(assignmentRows);
      if (insertAssignmentsError) throw new Error(insertAssignmentsError.message);
      assignmentsPersisted = assignmentRows.length;
    } else {
      assignmentsPreserved = true;
    }
    const studyPlanRowsPersisted = await persistGeneratedStudyPlan(practicalPlan);

    mark("db_persist_done");
    const totalMs = Date.now() - t0;
    await emitProgress("done", "Step 6/6 Completed and persisted personalized schedule.", 100, {
      scheduleRowsPersisted,
      assignmentsPersisted,
      sourceModeEffective,
      totalMs,
    });

    await logAiUsage({
      userId,
      provider,
      model: modelName,
      feature: "course-intel",
      tokensInput: 0,
      tokensOutput: 0,
      prompt: `course-intel-existing-mode:${courseId}`,
      responseText: "",
      requestPayload: { courseId, courseCode: course.course_code, university: course.university, sourceMode: sourceModeEffective },
      responsePayload: {
        resourcesCount: filteredResources.length,
        resourcesBlocked: blacklistedResources.length,
        scheduleEntries: existingScheduleRows.length,
        scheduleRowsPersisted,
        assignmentsCount: assignmentRows.length,
        curatedTasks: seedTasks.length,
        practicalPlanDays: practicalPlan.days.length,
        assignmentsPersisted,
        assignmentsPreserved,
        studyPlanRowsPersisted,
        sourceModeEffective,
        fastMode,
        timings,
        totalMs,
      },
    });

    return {
      resources: filteredResources,
      scheduleEntries: existingScheduleRows.length,
      scheduleRowsPersisted,
      assignmentsCount: assignmentRows.length,
      curatedTasks: seedTasks.length,
      practicalPlanDays: practicalPlan.days.length,
      assignmentsPersisted,
      assignmentsPreserved,
      studyPlanRowsPersisted,
      sourceMode: sourceModeEffective,
      fastMode,
      timings,
      totalMs,
    };
  }

  const knownUrls = [course.url, ...(Array.isArray(course.resources) ? course.resources : [])]
    .filter(Boolean) as string[];
  await emitProgress("discovery", "Step 2/6 Retrieving course data from web and database sources.", 18, {
    knownUrls: knownUrls.length,
  });

  // Optimization: if we already have enough known URLs, skip Brave discovery to reduce latency.
  const shouldRunWebDiscovery = webSearchEnabled && (knownUrls.length < 4 || !fastMode);
  const discoveredUrls = shouldRunWebDiscovery
    ? await discoverCourseUrlsWithBrave(
      String(course.course_code || ""),
      String(course.university || ""),
      String(course.title || "")
    )
    : [];
  await emitProgress("discovery", "URL discovery pass finished.", 24, {
    discoveredUrls: discoveredUrls.length,
    webDiscoveryEnabled: shouldRunWebDiscovery,
  });
  const seedContextUrls = dedupeUrlsExact([...knownUrls, ...discoveredUrls].filter((u) => /^https?:\/\//i.test(String(u))));
  const expandedUrls = shouldRunWebDiscovery ? await discoverImportantCourseLinks(seedContextUrls) : [];
  await emitProgress("discovery", "Expanded related syllabus/resource links.", 28, {
    expandedUrls: expandedUrls.length,
  });
  const contextLimit = fastMode ? 5 : 8;
  const analysisLimit = fastMode ? 3 : 6;
  const fullContextUrls = dedupeUrlsExact([...expandedUrls, ...seedContextUrls]).slice(0, contextLimit);
  const analysisContextUrls = fullContextUrls.filter((u) => !isNoisyContextUrl(u)).slice(0, analysisLimit);
  const contextUrls = dedupeResourcesByDomain(fullContextUrls);
  const resourcesContext = knownUrls.length > 0
    ? `Known course URLs:\n${knownUrls.map((u) => `- ${u}`).join("\n")}`
    : "";

  const fetchedResourcesContext = webSearchEnabled
    ? await withCourseIntelCache(
      `resources-context:${String(course.course_code || "")}:${String(course.university || "")}:${contextUrls.join("|")}`,
      () => buildFetchedResourcesContext(contextUrls, String(course.course_code || ""), String(course.university || "")),
    )
    : "";
  const fetchedPageTextContext = webSearchEnabled
    ? await Promise.allSettled(analysisContextUrls.map((u) => withCourseIntelCache(`page-text:${u}`, () => fetchUrlTextSnippet(u))))
    : [];
  const fetchedWeekSignals = webSearchEnabled
    ? await Promise.allSettled(analysisContextUrls.map((u) => withCourseIntelCache(`week-signals:${u}`, () => fetchWeekSignalsForUrl(u))))
    : [];
  const fetchedGradingSignals = webSearchEnabled
    ? await Promise.allSettled(analysisContextUrls.map((u) => withCourseIntelCache(`grading-signals:${u}`, () => fetchGradingSignalsForUrl(u))))
    : [];
  const deterministicSignalSettled = await Promise.allSettled(
    analysisContextUrls.map((u) => withCourseIntelCache(`deterministic-signals:${u}`, () => fetchDeterministicSignalsForUrl(u)))
  );
  const deterministicSignals = deterministicSignalSettled
    .filter((r): r is PromiseFulfilledResult<DeterministicSignals> => r.status === "fulfilled")
    .map((r) => r.value);
  mark("collected_context_signals");
  await emitProgress("discovery", "Step 2/6 Source retrieval completed.", 35, {
    contextUrls: contextUrls.length,
    analysisUrls: analysisContextUrls.length,
    deterministicSignalPages: deterministicSignals.length,
  });
  const deterministicRows = deterministicSignals.flatMap((s) => s.scheduleRows);
  const deterministicGradings = deterministicSignals.flatMap((s) => s.gradingSignals);
  const deterministicResources = deterministicSignals.flatMap((s) => s.extraResources);

  const aiWeekSignals = fetchedWeekSignals
    .filter((r): r is PromiseFulfilledResult<WeekSignal[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
  const weekSignalsFromDeterministic = deterministicRows
    .map((row, idx) => ({
      week: idx + 1,
      title: typeof row.title === "string" ? row.title : `Week ${idx + 1}`,
      slides: Array.isArray(row.slides)
        ? dedupeLinks((row.slides as Array<Record<string, unknown>>)
          .filter((x) => typeof x.url === "string")
          .map((x) => ({ label: String(x.label || "Slides"), url: String(x.url) })))
        : [],
      readings: Array.isArray(row.readings)
        ? dedupeLinks((row.readings as Array<Record<string, unknown>>)
          .filter((x) => typeof x.url === "string")
          .map((x) => ({ label: String(x.label || "Reading"), url: String(x.url) })))
        : [],
      assignments: Array.isArray(row.assignments)
        ? dedupeLinks((row.assignments as Array<Record<string, unknown>>)
          .filter((x) => typeof x.url === "string")
          .map((x) => ({ label: String(x.label || "Assignment"), url: String(x.url) })))
        : [],
    }))
    .filter((w) => w.slides.length > 0 || w.readings.length > 0 || w.assignments.length > 0);

  const weekSignals = [...weekSignalsFromDeterministic, ...aiWeekSignals]
    .reduce<WeekSignal[]>((acc, sig) => {
      const idx = acc.findIndex((x) => x.week === sig.week);
      if (idx < 0) {
        acc.push(sig);
      } else {
        const prev = acc[idx];
        acc[idx] = {
          week: prev.week,
          title: prev.title || sig.title,
          slides: dedupeLinks([...prev.slides, ...sig.slides]),
          readings: dedupeLinks([...prev.readings, ...sig.readings]),
          assignments: dedupeLinks([...prev.assignments, ...sig.assignments]),
        };
      }
      return acc;
    }, [])
    .sort((a, b) => a.week - b.week);
  const aiGradingSignals = fetchedGradingSignals
    .filter((r): r is PromiseFulfilledResult<GradingSignal[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
  const gradingSignals = [...deterministicGradings, ...aiGradingSignals]
    .reduce<GradingSignal[]>((acc, g) => {
      if (!acc.some((x) => x.component.toLowerCase() === g.component.toLowerCase())) acc.push(g);
      return acc;
    }, []);
  const pageTextContext = fetchedPageTextContext.length > 0
    ? fetchedPageTextContext
      .filter((r): r is PromiseFulfilledResult<string | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((v): v is string => Boolean(v))
      .map((txt, i) => `Fetched page text [${i + 1}]:\n${txt}`)
      .join("\n\n")
    : "";
  const weekSignalsContext = weekSignals.length > 0
    ? `Parsed week link signals:\n${JSON.stringify(weekSignals)}`
    : "";
  const gradingSignalsContext = gradingSignals.length > 0
    ? `Parsed grading signals:\n${JSON.stringify(gradingSignals)}`
    : "";
  const deterministicSignalsContext = deterministicRows.length > 0
    ? `Parsed deterministic schedule rows count: ${deterministicRows.length}`
    : "";

  const basePrompt = applyTemplate(template, {
    course_code: String(course.course_code || ""),
    university: String(course.university || ""),
    title: String(course.title || ""),
    resources: resourcesContext,
  });
  const contextBlocks = [fetchedResourcesContext, pageTextContext, weekSignalsContext, gradingSignalsContext, deterministicSignalsContext].filter(Boolean).join("\n\n");
  const prompt = contextBlocks ? `${basePrompt}\n\n${contextBlocks}` : basePrompt;

  const runExtraction = async (maxOutputTokens: number, promptOverride?: string) => {
    let text = "";
    let usage = { inputTokens: 0, outputTokens: 0 };
    if (provider === "gemini") {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY || "")}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: promptOverride || prompt }] }],
          generationConfig: { maxOutputTokens },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(summarizeGeminiApiError(res.status, body, modelName));
      }
      const json = (await res.json()) as Record<string, unknown>;
      const candidates = Array.isArray(json.candidates) ? (json.candidates as Array<Record<string, unknown>>) : [];
      const first = candidates[0] && typeof candidates[0] === "object" ? candidates[0] : {};
      const content = (first.content && typeof first.content === "object") ? (first.content as Record<string, unknown>) : {};
      const parts = Array.isArray(content.parts) ? (content.parts as Array<Record<string, unknown>>) : [];
      text = parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("");
      const usageMetadata = (json.usageMetadata && typeof json.usageMetadata === "object")
        ? (json.usageMetadata as Record<string, unknown>)
        : {};
      usage = {
        inputTokens: Number(usageMetadata.promptTokenCount || 0),
        outputTokens: Number(usageMetadata.candidatesTokenCount || 0),
      };
    } else {
      const out = await generateText({
        model: provider === "openai"
          ? openai.chat(modelName)
          : provider === "local"
            ? localOpenAICompatible.chat(modelName)
            : perplexity.chat(modelName),
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

  let text = "";
  let parsed: Record<string, unknown> = {};
  let usage = { inputTokens: 0, outputTokens: 0 };
  let scheduleArray: Array<Record<string, unknown>> = [];
  if (llmEnabled) {
    const firstAttempt = await runExtraction(fastMode ? 9000 : 14000);
    await emitProgress("ai", "AI extraction pass finished.", 60, {
      scheduleRows: firstAttempt.scheduleArray.length,
    });
    let extraction = firstAttempt;

    // Retry once when the model likely returned a partial syllabus.
    if (!fastMode && firstAttempt.scheduleArray.length <= 1) {
      await emitProgress("ai", "AI output looked partial. Retrying with higher token budget.", 63, {
        previousRows: firstAttempt.scheduleArray.length,
      });
      const retryAttempt = await runExtraction(22000);
      if (retryAttempt.scheduleArray.length > firstAttempt.scheduleArray.length) {
        extraction = retryAttempt;
      }
    }

    const firstRecoveredRows = extractScheduleRowsFromRawText(extraction.text).length;
    const firstParsedResources = normalizeResources((extraction.parsed as Record<string, unknown>).resources).length;
    const firstParsedAssignments = extractTopLevelAssignments(courseId, null, (extraction.parsed as Record<string, unknown>).assignments, new Date().toISOString()).length;
    const looksIncomplete =
      extraction.scheduleArray.length <= 1 &&
      firstRecoveredRows <= 1 &&
      firstParsedResources <= 1 &&
      firstParsedAssignments === 0;
    if (!fastMode && looksIncomplete) {
      await emitProgress("ai", "Running strict JSON recovery pass for incomplete extraction.", 66, {
        recoveredRows: firstRecoveredRows,
        parsedResources: firstParsedResources,
        parsedAssignments: firstParsedAssignments,
      });
      const stricterPrompt = `${prompt}\n\nIMPORTANT: Return a COMPLETE result for the full course. Return ONLY one valid JSON object with all known schedule rows, resources, and assignments. No prose. No markdown.`;
      const qualityRetry = await runExtraction(24000, stricterPrompt);
      const qualityRetryRecovered = extractScheduleRowsFromRawText(qualityRetry.text).length;
      const currentScore = extraction.scheduleArray.length + firstRecoveredRows;
      const retryScore = qualityRetry.scheduleArray.length + qualityRetryRecovered;
      if (retryScore > currentScore) extraction = qualityRetry;
    }

    // Recovery retry when model returns prose/refusal instead of JSON object.
    const looksLikeNonJsonReply =
      !/^\s*\{/.test((extraction.text || "").trim()) &&
      (/I (can't|cannot|need to clarify)|I'?m Perplexity|search results provided|I appreciate your/i.test(extraction.text || ""));
    if (looksLikeNonJsonReply) {
      await emitProgress("ai", "Model returned non-JSON text. Forcing strict JSON retry.", 68);
      const forcedJsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a single valid JSON object. Do not include any prose, disclaimers, citations, markdown, or code fences.`;
      const jsonRetry = await runExtraction(fastMode ? 10000 : 22000, forcedJsonPrompt);
      if (jsonRetry.scheduleArray.length >= extraction.scheduleArray.length) {
        extraction = jsonRetry;
      }
    }
    mark("ai_extraction_done");
    await emitProgress("ai", "AI extraction and recovery complete.", 72);

    text = extraction.text;
    parsed = extraction.parsed;
    usage = {
      inputTokens: Number(firstAttempt.usage.inputTokens || 0) + (extraction === firstAttempt ? 0 : Number(extraction.usage.inputTokens || 0)),
      outputTokens: Number(firstAttempt.usage.outputTokens || 0) + (extraction === firstAttempt ? 0 : Number(extraction.usage.outputTokens || 0)),
    };
    const recoveredScheduleRows = extractScheduleRowsFromRawText(text);
    scheduleArray = extraction.scheduleArray.length > 0 ? extraction.scheduleArray : recoveredScheduleRows;
  } else {
    mark("ai_extraction_done");
    await emitProgress("ai", "Skipped model extraction in deterministic mode.", 72);
  }

  const rawSourceUrl = extractSourceUrlFromRawText(text);
  const rawResources = extractResourcesFromRawText(text);

  const parsedResources = normalizeResources(parsed.resources);
  const sourceUrl = typeof parsed.source_url === "string" ? parsed.source_url : rawSourceUrl;
  const parsedContent = (parsed.content && typeof parsed.content === "object" ? parsed.content : {}) as Json;
  const content = mergeGradingSignals(parsedContent, gradingSignals) as Record<string, unknown>;
  const mergedWithWeekSignals = mergeWeekSignalsIntoSchedule(scheduleArray, weekSignals);
  const mergedScheduleArray = mergeDeterministicScheduleRows(mergedWithWeekSignals, deterministicRows);
  const schedule = mergedScheduleArray as Json;
  const seedTasks = buildPlanSeedTasks(mergedScheduleArray);
  const tasksForPlanning = assignSyntheticDeadlines(
    seedTasks.map((task) => ({ ...task, due_on: null })),
    planningWindow.startIso,
    planningWindow.endIso
  );
  const profiledTasks = buildPlanningTaskProfiles(tasksForPlanning, planningWindow.startIso);
  await emitProgress("task_extract", "Step 3/6 Parsed lectures, assignments, exams, and key events.", 74, {
    extractedTasks: seedTasks.length,
  });
  await emitProgress("workload", "Step 4/6 Evaluated workload and task difficulty.", 76, {
    heavyTasks: profiledTasks.filter((task) => task.difficulty === "heavy").length,
    mediumTasks: profiledTasks.filter((task) => task.difficulty === "medium").length,
    lightTasks: profiledTasks.filter((task) => task.difficulty === "light").length,
  });
  await emitProgress("planning", "Curated learning tasks prepared.", 76, {
    curatedTasks: tasksForPlanning.length,
  });

  let practicalPlan = buildFallbackDailyPlan(tasksForPlanning, planningWindow.startIso, planningWindow.windowDays);
  practicalPlan = clampDailyPlanToRange(practicalPlan, planningWindow.startIso, planningWindow.endIso);
  await emitProgress("prioritize", "Step 5/6 Prioritized tasks and generated schedule draft.", 78, {
    prioritizedTasks: profiledTasks.length,
  });
  if (llmEnabled && seedTasks.length > 0) {
    try {
      const planPrompt = buildPracticalPlanPrompt({
        courseCode: String(course.course_code || ""),
        title: String(course.title || ""),
        startIso: planningWindow.startIso,
        endIso: planningWindow.endIso,
        tasks: profiledTasks.slice(0, 120).map((task) => ({
          kind: task.kind,
          title: task.title,
          due_on: task.due_on,
          source_sequence: task.source_sequence,
          url: task.url,
          estimated_minutes: task.estimated_minutes,
          importance_score: task.importance_score,
          urgency_score: task.urgency_score,
          priority_score: task.priority_score,
          difficulty: task.difficulty,
        })),
      });
      const rawPlan = await generateDailyPlanWithModel({ provider, modelName, prompt: planPrompt });
      const parsedPlan = parseLenientJson(rawPlan);
      const sanitized = clampDailyPlanToRange(
        sanitizeDailyPlan(parsedPlan, planningWindow.startIso),
        planningWindow.startIso,
        planningWindow.endIso
      );
      const looseParsed = sanitized.days.length > 0
        ? sanitized
        : clampDailyPlanToRange(
          parseLooseDailyPlanText(rawPlan, planningWindow.startIso),
          planningWindow.startIso,
          planningWindow.endIso
        );
      const finalPlan = looseParsed.days.length > 0 ? looseParsed : sanitized;
      if (finalPlan.days.length > 0) practicalPlan = finalPlan;
    } catch {
      // Keep fallback plan if AI planning fails.
    }
  }
  await emitProgress("planning", "Daily practical plan generated.", 80, {
    days: practicalPlan.days.length,
  });

  await persistMissingCourseMetadata({
    extracted: parsed,
    contextText: `${contextBlocks}\n\n${text}`,
    taskHints: seedTasks,
  });

  const nowIso = new Date().toISOString();
  const rawExtractedAssignmentsForContent = dedupeAssignments([
    ...extractAssignmentsFromSchedule(courseId, null, mergedScheduleArray, nowIso),
    ...extractHeuristicAssignmentsFromSchedule(courseId, null, mergedScheduleArray, nowIso),
    ...extractTopLevelAssignments(courseId, null, parsed.assignments, nowIso),
  ]);

  content.course_intel = {
    generated_at: new Date().toISOString(),
    curated_tasks: seedTasks.slice(0, 200),
    curated_task_counts: {
      total: seedTasks.length,
      readings: seedTasks.filter((task) => task.kind === "reading").length,
      assignments: seedTasks.filter((task) => task.kind === "assignment").length,
      projects: seedTasks.filter((task) => task.kind === "project").length,
      labs: seedTasks.filter((task) => task.kind === "lab").length,
      exercises: seedTasks.filter((task) => task.kind === "exercise").length,
      quizzes: seedTasks.filter((task) => task.kind === "quiz").length,
      exams: seedTasks.filter((task) => task.kind === "exam").length,
    },
    raw_data: {
      assignments: rawExtractedAssignmentsForContent.map((row) => toSyllabusRawAssignment(row)),
    },
    practical_plan: practicalPlan,
  };
  const rawClaimsSource = /"source_url"\s*:/i.test(text);
  // Prefer graceful degradation: recover rows from raw text if top-level JSON is truncated.
  // Keep hard failure only when source_url is malformed and cannot be recovered.
  if (rawClaimsSource && !sourceUrl) {
    // Graceful degradation: keep parsing/persisting schedule/resources even if source_url is malformed.
    // This avoids hard-failing the whole sync on a partial/truncated source_url field.
  }
  const scheduleResources = extractResourcesFromSchedule(mergedScheduleArray);
  const mergedResourceCandidates = dedupeResourcesByDomain([
    ...parsedResources,
    ...rawResources,
    ...deterministicResources,
    ...scheduleResources,
    ...fullContextUrls,
    ...(sourceUrl ? [sourceUrl] : []),
    ...(Array.isArray(course.resources) ? course.resources : []),
  ]);
  const finalResources = filterRelevantResourceUrls(
    mergedResourceCandidates,
    fullContextUrls,
    String(course.course_code || ""),
    String(course.title || "")
  );
  const { kept: filteredResources, dropped: blacklistedResources } =
    await filterResourcesByRedisBlacklist(finalResources, String(course.course_code || ""));

  const admin = createAdminClient();
  await emitProgress("persist", "Persisting resources, syllabus and assignments.", 82, {
    resources: filteredResources.length,
    resourcesBlocked: blacklistedResources.length,
  });

  if (filteredResources.length > 0) {
    const existingCourseResources = (Array.isArray(course.resources) ? course.resources : [])
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u.trim()))
      .map((u) => u.trim());
    const mergedResources = dedupeUrlsExact([
      ...existingCourseResources,
      ...filteredResources,
    ]);
    const { error: courseUpdateError } = await admin
      .from("courses")
      .update({ resources: mergedResources })
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
        content: content as Json,
        schedule,
        retrieved_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "course_id" }
    )
    .select("id")
    .maybeSingle();
  if (syllabusError) throw new Error(syllabusError.message);

  let syllabusId = syllabusUpserted?.id ? Number(syllabusUpserted.id) : null;
  if (!syllabusId) {
    const { data: syllabusFetched, error: syllabusFetchError } = await admin
      .from("course_syllabi")
      .select("id")
      .eq("course_id", courseId)
      .maybeSingle();
    if (syllabusFetchError) throw new Error(syllabusFetchError.message);
    syllabusId = syllabusFetched?.id ? Number(syllabusFetched.id) : null;
  }
  const scheduleRowsFromPlan = buildCourseSchedulesFromDailyPlan({
    courseId,
    syllabusId,
    plan: practicalPlan,
    nowIso,
  });
  const adminAny = admin as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let scheduleRowsPersisted = 0;
  const scheduleBinding = new Map<string, number>();
  if (scheduleRowsFromPlan.length > 0) {
    await emitProgress("persist", "Clearing legacy schedule rows before writing regenerated schedule.", 86, {
      generatedScheduleRows: scheduleRowsFromPlan.length,
    });
    const { error: deleteSchedulesError } = await adminAny
      .from("course_schedules")
      .delete()
      .eq("course_id", courseId);
    if (deleteSchedulesError) throw new Error(deleteSchedulesError.message);

    const { data: insertedSchedules, error: insertSchedulesError } = await adminAny
      .from("course_schedules")
      .insert(scheduleRowsFromPlan)
      .select("id, schedule_date, task_title, task_kind");
    if (insertSchedulesError) throw new Error(insertSchedulesError.message);
    const inserted = Array.isArray(insertedSchedules) ? insertedSchedules : [];
    scheduleRowsPersisted = inserted.length;
    await emitProgress("persist", "Regenerated schedule rows written.", 90, {
      scheduleRowsPersisted,
    });
    for (const row of inserted) {
      const date = typeof row.schedule_date === "string" ? row.schedule_date : "";
      const title = typeof row.task_title === "string" ? row.task_title.trim().toLowerCase() : "";
      const kind = typeof row.task_kind === "string" ? row.task_kind.trim().toLowerCase() : "";
      const id = Number(row.id || 0);
      if (!date || !title || !id) continue;
      scheduleBinding.set(`${date}|${title}|${kind}`, id);
    }
  }

  const assignmentsFromSchedule = extractAssignmentsFromSchedule(courseId, syllabusId, mergedScheduleArray, nowIso);
  const heuristicAssignments = extractHeuristicAssignmentsFromSchedule(courseId, syllabusId, mergedScheduleArray, nowIso);
  const topLevelAssignments = extractTopLevelAssignments(courseId, syllabusId, parsed.assignments, nowIso);
  const rawExtractedAssignments = dedupeAssignments([
    ...assignmentsFromSchedule,
    ...heuristicAssignments,
    ...topLevelAssignments,
  ]);
  const aiAssignments = buildAssignmentsFromDailyPlan({
    courseId,
    syllabusId,
    plan: practicalPlan,
    nowIso,
  }).map((row) => {
    const key = `${row.due_on || ""}|${row.label.trim().toLowerCase()}|${String(row.kind || "").toLowerCase()}`;
    const scheduleId = scheduleBinding.get(key);
    return {
      ...row,
      course_schedule_id: scheduleId || null,
      metadata: row.metadata as Json,
    } as AssignmentRow;
  });

  const assignmentRows = dedupeAssignments([
    ...rawExtractedAssignments,
    ...aiAssignments,
  ]);

  let assignmentsPersisted = 0;
  let assignmentsPreserved = false;

  // Safety guard: only replace assignments when we extracted at least one row.
  // This prevents wiping existing assignments on weak/partial model output.
  if (assignmentRows.length > 0) {
    await emitProgress("persist", "Replacing assignment table with regenerated assignment set.", 92, {
      assignmentsToWrite: assignmentRows.length,
    });
    const { error: deleteAssignmentsError } = await admin
      .from("course_assignments")
      .delete()
      .eq("course_id", courseId);
    if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message);

    const { error: insertAssignmentsError } = await admin
      .from("course_assignments")
      .insert(assignmentRows);
    if (insertAssignmentsError) throw new Error(insertAssignmentsError.message);

    assignmentsPersisted = assignmentRows.length;
  } else {
    assignmentsPreserved = true;
  }
  const studyPlanRowsPersisted = await persistGeneratedStudyPlan(practicalPlan);

  mark("db_persist_done");
  const totalMs = Date.now() - t0;
  await emitProgress("persist", "Step 6/6 Persisted schedule, deadlines, and calendar events.", 95, {
    assignmentsPersisted,
    assignmentsPreserved,
    scheduleRowsPersisted,
  });

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
      resourcesBlocked: blacklistedResources.length,
      scheduleEntries: mergedScheduleArray.length,
      assignmentsCount: assignmentRows.length,
      scheduleRowsPersisted,
      curatedTasks: seedTasks.length,
      practicalPlanDays: practicalPlan.days.length,
      assignmentsPersisted,
      assignmentsPreserved,
      studyPlanRowsPersisted,
      sourceModeEffective,
      executionMode,
      fastMode,
      timings,
      totalMs,
    },
  });
  await emitProgress("done", "Step 6/6 Completed personalized study schedule.", 100, {
    totalMs,
    scheduleEntries: mergedScheduleArray.length,
  });

  return {
    resources: filteredResources,
    scheduleEntries: mergedScheduleArray.length,
    scheduleRowsPersisted,
    assignmentsCount: assignmentRows.length,
    curatedTasks: seedTasks.length,
    practicalPlanDays: practicalPlan.days.length,
    assignmentsPersisted,
    assignmentsPreserved,
    studyPlanRowsPersisted,
    sourceMode: sourceModeEffective,
    executionMode,
    fastMode,
    timings,
    totalMs,
  };
}
