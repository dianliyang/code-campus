import { createAdminClient } from "@/lib/supabase/server";

export type AIProvider = "perplexity" | "gemini";
type PricingEntry = { input: number; output: number };

type RuntimeConfigCacheEntry = {
  value: AiRuntimeConfig;
  expiresAt: number;
};

const DEFAULT_RUNTIME_CACHE_TTL_MS = 10_000;
let runtimeConfigCache: RuntimeConfigCacheEntry | null = null;
let runtimeConfigInFlight: Promise<AiRuntimeConfig> | null = null;

function getRuntimeCacheTtlMs(): number {
  const raw = Number(process.env.AI_RUNTIME_CACHE_TTL_MS ?? DEFAULT_RUNTIME_CACHE_TTL_MS);
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_RUNTIME_CACHE_TTL_MS;
  return Math.floor(raw);
}

const DEFAULT_PROMPTS = {
  planner: [
    "You are an expert CS learning architect.",
    "Target track: {{preset}}",
    "Candidate courses (JSON):",
    "{{catalog_json}}",
    "Return only valid JSON with keys: track, overview, roadmap, study_plan.",
  ].join("\n"),
  learningPath: [
    "Generate a personalized learning path using this context:",
    "{{completed_courses}}",
    "{{in_progress_courses}}",
    "{{available_catalog}}",
    "Return practical, high-impact recommendations.",
  ].join("\n"),
  description: "Write a concise, factual course description.",
  studyPlan: [
    "Convert schedule lines into a structured weekly plan.",
    "Input schedule lines:",
    "{{schedule_lines}}",
    "Return only valid JSON array entries with day/time/location/type.",
  ].join("\n"),
  topics: [
    "You are a precise university catalog classifier.",
    "Task: Classify subdomain and topics for the provided courses.",
    "",
    "Available Subdomains (Select EXACTLY one):",
    "- Artificial Intelligence & Machine Learning",
    "- Systems & Networking",
    "- Theory & Algorithms",
    "- Software Engineering & Programming Languages",
    "- Data Science & Databases",
    "- Security & Privacy",
    "- Human-Computer Interaction & Graphics",
    "- Computer Architecture & Hardware",
    "- Interdisciplinary & Applications",
    "",
    "For each course, extract 3-6 concise topics. Think of topics yourself based on the course title and description.",
    "",
    "Input JSON format: {{course_batch_json}}",
    "",
    "Return EXACTLY ONE JSON object. Do not return multiple objects. Do not return an array of objects. Return a single object where:",
    "- Keys are the course 'id' (as strings).",
    "- Values are objects with 'subdomain' (string) and 'topics' (array of strings).",
    "",
    "Format strictly as: {\"ID1\": {\"subdomain\": \"...\", \"topics\": [...]}, \"ID2\": {...}}",
    "",
    "Example Output:",
    "{\"123\": {\"subdomain\": \"Systems & Networking\", \"topics\": [\"Kernel Development\", \"Virtual Memory\", \"Distributed Systems\"]}}",
  ].join("\n"),
  courseUpdate: [
    "Search official sources and return ONLY JSON:",
    "{\"related_urls\":[\"string\"]}",
    "Course: {{course_code}} at {{university}}.",
  ].join("\n"),
  syllabusRetrieve: [
    "Search for the official course syllabus for {{course_code}} at {{university}} (course title: {{title}}).",
    "{{resources}}",
    "Find the most recent semester's syllabus page or PDF.",
    "Extract and return ONLY valid JSON with this exact structure:",
    "{",
    "  \"source_url\": \"string or null\",",
    "  \"content\": {",
    "    \"objectives\": [\"string\"],",
    "    \"grading\": [{\"component\": \"string\", \"weight\": 0}],",
    "    \"textbooks\": [\"string\"],",
    "    \"policies\": \"string\"",
    "  },",
    "  \"schedule\": [",
    "    {",
    "      \"sequence\": \"Lecture 1 or Week 1 — the sequence label only, not the title\",",
    "      \"title\": \"The bold heading/title for the lecture (e.g. 'Why Parallelism? Why Efficiency?'), NOT the bullet-point subtopics. null if not present.\",",
    "      \"date\": \"YYYY-MM-DD or null\",",
    "      \"date_end\": \"YYYY-MM-DD or null\",",
    "      \"instructor\": \"string or null\",",
    "      \"topics\": [\"string\"],",
    "      \"description\": \"string or null\",",
    "      \"slides\": [{\"label\": \"string\", \"url\": \"string or null\"}],",
    "      \"videos\": [{\"label\": \"string\", \"url\": \"string or null\"}],",
    "      \"readings\": [{\"label\": \"string\", \"url\": \"string or null\"}],",
    "      \"modules\": [{\"label\": \"string\", \"url\": \"string or null\"}],",
    "      \"assignments\": [{\"label\": \"string\", \"due_date\": \"YYYY-MM-DD or null\"}],",
    "      \"labs\": [{\"label\": \"string\", \"due_date\": \"YYYY-MM-DD or null\"}],",
    "      \"exams\": [{\"label\": \"string\", \"due_date\": \"YYYY-MM-DD or null\"}],",
    "      \"projects\": [{\"label\": \"string\", \"due_date\": \"YYYY-MM-DD or null\"}]",
    "    }",
    "  ]",
    "}",
    "Omit empty arrays. Omit null fields. Return only the JSON, no explanation.",
  ].join("\n"),
} as const;

export type AiRuntimeConfig = {
  modelCatalog: Record<AIProvider, string[]>;
  models: {
    planner: string;
    learningPath: string;
    courseUpdate: string;
  };
  prompts: {
    planner: string;
    learningPath: string;
    description: string;
    studyPlan: string;
    topics: string;
    courseUpdate: string;
    syllabusRetrieve: string;
  };
  pricing: Record<string, PricingEntry>;
};

async function loadPricingRows() {
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("ai_model_pricing")
    .select("provider, model, input_per_token, output_per_token, is_active")
    .eq("is_active", true);

  if (error || !Array.isArray(data)) return [];
  return data;
}

function normalizeModelCatalog(rows: Array<Record<string, unknown>>): Record<AIProvider, string[]> {
  const catalog: Record<AIProvider, string[]> = {
    perplexity: [],
    gemini: [],
  };

  for (const row of rows) {
    const provider = String(row.provider || "").trim().toLowerCase();
    const model = String(row.model || "").trim();
    if ((provider !== "perplexity" && provider !== "gemini") || !model) continue;
    const key = provider as AIProvider;
    if (!catalog[key].includes(model)) catalog[key].push(model);
  }

  return catalog;
}

function normalizePricing(rows: Array<Record<string, unknown>>): Record<string, PricingEntry> {
  const pricing: Record<string, PricingEntry> = {};

  for (const row of rows) {
    const provider = String(row.provider || "").trim().toLowerCase();
    const model = String(row.model || "").trim();
    if ((provider !== "perplexity" && provider !== "gemini") || !model) continue;

    const input = Number(row.input_per_token ?? 0);
    const output = Number(row.output_per_token ?? 0);
    const normalized: PricingEntry = {
      input: Number.isFinite(input) && input >= 0 ? input : 0,
      output: Number.isFinite(output) && output >= 0 ? output : 0,
    };

    pricing[model] = normalized;
    pricing[`${provider}/${model}`] = normalized;
  }

  return pricing;
}

function buildRuntimeConfigFromRows(rows: Array<Record<string, unknown>>): AiRuntimeConfig {
  const modelCatalog = normalizeModelCatalog(rows);
  if (modelCatalog.perplexity.length === 0 || modelCatalog.gemini.length === 0) {
    throw new Error("AI runtime config missing: ai_model_pricing must contain active models for both perplexity and gemini.");
  }

  const defaultModel = modelCatalog.perplexity[0] || modelCatalog.gemini[0];

  return {
    modelCatalog,
    models: {
      planner: defaultModel,
      learningPath: defaultModel,
      courseUpdate: defaultModel,
    },
    prompts: {
      planner: DEFAULT_PROMPTS.planner,
      learningPath: DEFAULT_PROMPTS.learningPath,
      description: DEFAULT_PROMPTS.description,
      studyPlan: DEFAULT_PROMPTS.studyPlan,
      topics: DEFAULT_PROMPTS.topics,
      courseUpdate: DEFAULT_PROMPTS.courseUpdate,
      syllabusRetrieve: DEFAULT_PROMPTS.syllabusRetrieve,
    },
    pricing: normalizePricing(rows),
  };
}

export async function getAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const now = Date.now();
  if (runtimeConfigCache && runtimeConfigCache.expiresAt > now) {
    return runtimeConfigCache.value;
  }

  if (runtimeConfigInFlight) {
    return runtimeConfigInFlight;
  }

  runtimeConfigInFlight = (async () => {
    const rows = await loadPricingRows();
    const value = buildRuntimeConfigFromRows(rows as Array<Record<string, unknown>>);
    runtimeConfigCache = {
      value,
      expiresAt: Date.now() + getRuntimeCacheTtlMs(),
    };
    return value;
  })();

  try {
    return await runtimeConfigInFlight;
  } finally {
    runtimeConfigInFlight = null;
  }
}

export function invalidateRuntimeConfig() {
  runtimeConfigCache = null;
}

export function applyPromptTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}

