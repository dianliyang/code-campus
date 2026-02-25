export const AI_PROVIDERS = ["perplexity", "gemini"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

export async function getModelCatalogByProvider(): Promise<Record<AIProvider, string[]>> {
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
