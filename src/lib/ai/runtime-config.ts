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

export type AiRuntimeConfig = {
  modelCatalog: Record<AIProvider, string[]>;
  models: {
    planner: string;
    learningPath: string;
    courseUpdate: string;
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
