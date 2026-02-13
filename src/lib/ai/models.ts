export const AI_PROVIDERS = ["perplexity", "gemini"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

export const PERPLEXITY_MODELS = [
  "sonar",
  "sonar-pro",
  "sonar-reasoning",
  "sonar-reasoning-pro",
] as const;

export const PERPLEXITY_MODEL_SET = new Set<string>(PERPLEXITY_MODELS);

export const GEMINI_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
] as const;

export const GEMINI_MODEL_SET = new Set<string>(GEMINI_MODELS);
