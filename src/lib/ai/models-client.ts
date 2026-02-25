export const AI_PROVIDERS = ["perplexity", "gemini"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

