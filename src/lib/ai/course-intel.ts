import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { load } from "cheerio";
import { createAdminClient } from "@/lib/supabase/server";
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
        "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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
            "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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
        "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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
            "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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
        "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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
            "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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
        "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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
          "User-Agent": "CodeCampusBot/1.0 (+course-intel)",
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

export async function runCourseIntel(userId: string, courseId: number) {
  const supabase = createAdminClient();
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
  const preferredProvider =
    providerRaw === "openai"
      ? "openai"
      : providerRaw === "gemini"
          ? "gemini"
          : "perplexity";
  const webSearchEnabled = Boolean(profile?.ai_web_search_enabled);
  const provider = preferredProvider;
  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("AI service not configured: OPENAI_API_KEY missing");
  }
  if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
    throw new Error("AI service not configured: GEMINI_API_KEY missing");
  }
  if (provider === "perplexity" && !process.env.PERPLEXITY_API_KEY) {
    throw new Error("AI service not configured: PERPLEXITY_API_KEY missing");
  }

  const modelName = await resolveModelForProvider(provider, String(profile?.ai_default_model || "").trim());
  if (!modelName) {
    throw new Error(`AI service not configured: no active model for provider ${provider}`);
  }

  const knownUrls = [course.url, ...(Array.isArray(course.resources) ? course.resources : [])]
    .filter(Boolean) as string[];
  const discoveredUrls = webSearchEnabled
    ? await discoverCourseUrlsWithBrave(
      String(course.course_code || ""),
      String(course.university || ""),
      String(course.title || "")
    )
    : [];
  const seedContextUrls = dedupeUrlsExact([...knownUrls, ...discoveredUrls].filter((u) => /^https?:\/\//i.test(String(u))));
  const expandedUrls = webSearchEnabled ? await discoverImportantCourseLinks(seedContextUrls) : [];
  const fullContextUrls = dedupeUrlsExact([...expandedUrls, ...seedContextUrls]).slice(0, 8);
  const analysisContextUrls = fullContextUrls.filter((u) => !isNoisyContextUrl(u)).slice(0, 6);
  const contextUrls = dedupeResourcesByDomain(fullContextUrls);
  const resourcesContext = knownUrls.length > 0
    ? `Known course URLs:\n${knownUrls.map((u) => `- ${u}`).join("\n")}`
    : "";

  const fetchedResourcesContext = webSearchEnabled
    ? await buildFetchedResourcesContext(contextUrls, String(course.course_code || ""), String(course.university || ""))
    : "";
  const fetchedPageTextContext = webSearchEnabled
    ? await Promise.allSettled(analysisContextUrls.map((u) => fetchUrlTextSnippet(u)))
    : [];
  const fetchedWeekSignals = webSearchEnabled
    ? await Promise.allSettled(analysisContextUrls.map((u) => fetchWeekSignalsForUrl(u)))
    : [];
  const fetchedGradingSignals = webSearchEnabled
    ? await Promise.allSettled(analysisContextUrls.map((u) => fetchGradingSignalsForUrl(u)))
    : [];
  const deterministicSignalSettled = await Promise.allSettled(
    analysisContextUrls.map((u) => fetchDeterministicSignalsForUrl(u))
  );
  const deterministicSignals = deterministicSignalSettled
    .filter((r): r is PromiseFulfilledResult<DeterministicSignals> => r.status === "fulfilled")
    .map((r) => r.value);
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

  const firstAttempt = await runExtraction(14000);
  let extraction = firstAttempt;

  // Retry once when the model likely returned a partial syllabus.
  if (firstAttempt.scheduleArray.length <= 1) {
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
  if (looksIncomplete) {
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
    const forcedJsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a single valid JSON object. Do not include any prose, disclaimers, citations, markdown, or code fences.`;
    const jsonRetry = await runExtraction(22000, forcedJsonPrompt);
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
  const parsedContent = (parsed.content && typeof parsed.content === "object" ? parsed.content : {}) as Json;
  const content = mergeGradingSignals(parsedContent, gradingSignals);
  const recoveredScheduleRows = extractScheduleRowsFromRawText(text);
  const scheduleArray = extraction.scheduleArray.length > 0 ? extraction.scheduleArray : recoveredScheduleRows;
  const mergedWithWeekSignals = mergeWeekSignalsIntoSchedule(scheduleArray, weekSignals);
  const mergedScheduleArray = mergeDeterministicScheduleRows(mergedWithWeekSignals, deterministicRows);
  const schedule = mergedScheduleArray as Json;
  const rawClaimsSource = /"source_url"\s*:/i.test(text);
  // Prefer graceful degradation: recover rows from raw text if top-level JSON is truncated.
  // Keep hard failure only when source_url is malformed and cannot be recovered.
  if (rawClaimsSource && !sourceUrl) {
    throw new Error("AI returned malformed/truncated source_url JSON");
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
  const assignmentsFromSchedule = extractAssignmentsFromSchedule(courseId, syllabusId, mergedScheduleArray, nowIso);
  const heuristicAssignments = extractHeuristicAssignmentsFromSchedule(courseId, syllabusId, mergedScheduleArray, nowIso);
  const topLevelAssignments = extractTopLevelAssignments(courseId, syllabusId, parsed.assignments, nowIso);
  const assignmentRows = dedupeAssignments([...assignmentsFromSchedule, ...heuristicAssignments, ...topLevelAssignments]);

  let assignmentsPersisted = 0;
  let assignmentsPreserved = false;

  // Safety guard: only replace assignments when we extracted at least one row.
  // This prevents wiping existing assignments on weak/partial model output.
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

    assignmentsPersisted = assignmentRows.length;
  } else {
    assignmentsPreserved = true;
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
      scheduleEntries: mergedScheduleArray.length,
      assignmentsCount: assignmentRows.length,
      assignmentsPersisted,
      assignmentsPreserved,
    },
  });

  return {
    resources: finalResources,
    scheduleEntries: mergedScheduleArray.length,
    assignmentsCount: assignmentRows.length,
    assignmentsPersisted,
    assignmentsPreserved,
  };
}
