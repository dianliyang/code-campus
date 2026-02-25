import { createAdminClient } from "@/lib/supabase/server";
import { getEdgeConfigItem } from "@/lib/vercel/edge-config";

export type AIProvider = "perplexity" | "gemini";
type PricingEntry = { input: number; output: number };
type RuntimeConfigInput = {
  modelCatalog?: Partial<Record<AIProvider, string[]>>;
  models?: Partial<Record<"planner" | "learningPath" | "courseUpdate", string>>;
  prompts?: Partial<Record<"planner" | "learningPath" | "description" | "studyPlan" | "topics" | "courseUpdate", string>>;
  pricing?: Record<string, Partial<PricingEntry>>;
};

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
  };
  pricing: Record<string, PricingEntry>;
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeInput(raw: unknown): RuntimeConfigInput | null {
  if (!isObjectLike(raw)) return null;
  return raw as RuntimeConfigInput;
}

function mergeConfig(base: RuntimeConfigInput | null, override: RuntimeConfigInput | null): RuntimeConfigInput | null {
  if (!base && !override) return null;
  if (!base) return override;
  if (!override) return base;

  return {
    modelCatalog: {
      ...(base.modelCatalog || {}),
      ...(override.modelCatalog || {}),
    },
    models: {
      ...(base.models || {}),
      ...(override.models || {}),
    },
    prompts: {
      ...(base.prompts || {}),
      ...(override.prompts || {}),
    },
    pricing: {
      ...(base.pricing || {}),
      ...(override.pricing || {}),
    },
  };
}

function validateModelArray(raw: unknown, name: string): string[] {
  if (!Array.isArray(raw)) {
    throw new Error(`AI runtime config invalid: modelCatalog.${name} must be an array.`);
  }
  const list = raw.map((v) => String(v || "").trim()).filter(Boolean);
  if (list.length === 0) {
    throw new Error(`AI runtime config invalid: modelCatalog.${name} must not be empty.`);
  }
  return Array.from(new Set(list));
}

function validateConfig(input: RuntimeConfigInput | null): AiRuntimeConfig {
  if (!input) {
    throw new Error("AI runtime config missing. Set app_runtime_config(key='ai_runtime') in Supabase.");
  }

  const perplexityCatalog = validateModelArray(input.modelCatalog?.perplexity, "perplexity");
  const geminiCatalog = validateModelArray(input.modelCatalog?.gemini, "gemini");

  const plannerModel = String(input.models?.planner || "").trim();
  const learningPathModel = String(input.models?.learningPath || "").trim();
  const courseUpdateModel = String(input.models?.courseUpdate || "").trim();

  if (!plannerModel || !learningPathModel || !courseUpdateModel) {
    throw new Error("AI runtime config invalid: models.planner, models.learningPath, models.courseUpdate are required.");
  }

  const plannerPrompt = String(input.prompts?.planner || "").trim();
  const learningPathPrompt = String(input.prompts?.learningPath || "").trim();
  const descriptionPrompt = String(input.prompts?.description || "").trim();
  const studyPlanPrompt = String(input.prompts?.studyPlan || "").trim();
  const topicsPrompt = String(input.prompts?.topics || "").trim();
  const courseUpdatePrompt = String(input.prompts?.courseUpdate || "").trim();

  if (!plannerPrompt || !learningPathPrompt || !descriptionPrompt || !studyPlanPrompt || !topicsPrompt || !courseUpdatePrompt) {
    throw new Error("AI runtime config invalid: prompts.planner, prompts.learningPath, prompts.description, prompts.studyPlan, prompts.topics, prompts.courseUpdate are required.");
  }

  const pricingInput = input.pricing || {};
  const pricing: Record<string, PricingEntry> = {};
  for (const [model, entry] of Object.entries(pricingInput)) {
    const inPrice = Number(entry?.input);
    const outPrice = Number(entry?.output);
    if (!Number.isFinite(inPrice) || inPrice < 0 || !Number.isFinite(outPrice) || outPrice < 0) {
      throw new Error(`AI runtime config invalid: pricing.${model} must include non-negative input and output.`);
    }
    pricing[model] = { input: inPrice, output: outPrice };
  }

  return {
    modelCatalog: {
      perplexity: perplexityCatalog,
      gemini: geminiCatalog,
    },
    models: {
      planner: plannerModel,
      learningPath: learningPathModel,
      courseUpdate: courseUpdateModel,
    },
    prompts: {
      planner: plannerPrompt,
      learningPath: learningPathPrompt,
      description: descriptionPrompt,
      studyPlan: studyPlanPrompt,
      topics: topicsPrompt,
      courseUpdate: courseUpdatePrompt,
    },
    pricing,
  };
}

async function loadFromSupabase(): Promise<RuntimeConfigInput | null> {
  try {
    const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from("app_runtime_config")
      .select("value")
      .eq("key", "ai_runtime")
      .maybeSingle();

    if (error || !data) return null;
    return normalizeInput(data.value);
  } catch {
    return null;
  }
}

async function loadFromEdgeConfig(): Promise<RuntimeConfigInput | null> {
  const first = await getEdgeConfigItem<unknown>("ai_runtime");
  if (first) return normalizeInput(first);
  const second = await getEdgeConfigItem<unknown>("ai_runtime_config");
  return normalizeInput(second);
}

export async function getAiRuntimeConfig(): Promise<AiRuntimeConfig> {
  const [supabaseConfig, edgeConfig] = await Promise.all([
    loadFromSupabase(),
    loadFromEdgeConfig(),
  ]);
  return validateConfig(mergeConfig(supabaseConfig, edgeConfig));
}

export function applyPromptTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}
