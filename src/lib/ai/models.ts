export const AI_PROVIDERS = ["perplexity", "gemini", "openai", "vertex"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

export async function getModelCatalogByProvider(): Promise<Record<AIProvider, string[]>> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { data, error } = await supabase
      .from("ai_model_pricing")
      .select("provider, model, is_active")
      .eq("is_active", true);

    if (!error && Array.isArray(data) && data.length > 0) {
      const catalog: Record<AIProvider, string[]> = {
        perplexity: [],
        gemini: [],
        openai: [],
        vertex: [],
      };

      for (const row of data) {
        const provider = String(row?.provider || "").trim() as AIProvider;
        const model = String(row?.model || "").trim();
        if (!AI_PROVIDERS.includes(provider) || !model) continue;
        if (!catalog[provider].includes(model)) catalog[provider].push(model);
      }

      if (catalog.perplexity.length > 0 || catalog.gemini.length > 0 || catalog.openai.length > 0 || catalog.vertex.length > 0) {
        return catalog;
      }
    }
  } catch {
    // fallback to edge runtime config
  }

  const { getAiRuntimeConfig } = await import("@/lib/ai/runtime-config");
  const runtime = await getAiRuntimeConfig();
  return runtime.modelCatalog;
}

export async function getModelSetForProvider(provider: AIProvider): Promise<Set<string>> {
  const catalog = await getModelCatalogByProvider();
  return new Set(catalog[provider]);
}

export async function resolveModelForProvider(provider: AIProvider, selectedModel: string): Promise<string> {
  const catalog = await getModelCatalogByProvider();
  const normalized = String(selectedModel || "").trim();
  if (normalized && catalog[provider].includes(normalized)) return normalized;
  return catalog[provider][0];
}
