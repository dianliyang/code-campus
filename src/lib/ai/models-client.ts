export const AI_PROVIDERS = ["perplexity", "gemini", "openai"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];
