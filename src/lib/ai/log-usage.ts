import { createAdminClient } from "@/lib/supabase/server";

// Pricing per token in USD (as of early 2025 — update as needed)
const PRICING: Record<string, { input: number; output: number }> = {
  // Perplexity
  "sonar":          { input: 1.0  / 1_000_000, output: 1.0  / 1_000_000 },
  "sonar-pro":      { input: 3.0  / 1_000_000, output: 15.0 / 1_000_000 },
  "sonar-reasoning":{ input: 1.0  / 1_000_000, output: 5.0  / 1_000_000 },
  // Gemini
  "gemini-1.5-flash":    { input: 0.075 / 1_000_000, output: 0.30 / 1_000_000 },
  "gemini-1.5-pro":      { input: 1.25  / 1_000_000, output: 5.0  / 1_000_000 },
  "gemini-2.0-flash":    { input: 0.10  / 1_000_000, output: 0.40 / 1_000_000 },
  "gemini-2.0-flash-lite":{ input: 0.075/ 1_000_000, output: 0.30 / 1_000_000 },
  // OpenAI
  "gpt-4o":         { input: 2.5  / 1_000_000, output: 10.0 / 1_000_000 },
  "gpt-4o-mini":    { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  "o1-mini":        { input: 1.1  / 1_000_000, output: 4.4  / 1_000_000 },
};

export function logAiUsage({
  userId,
  provider,
  model,
  feature,
  tokensInput,
  tokensOutput,
}: {
  userId: string;
  provider: string;
  model: string;
  feature: string;
  tokensInput: number | undefined;
  tokensOutput: number | undefined;
}) {
  const pricing = PRICING[model] ?? { input: 0, output: 0 };
  const inTokens = tokensInput ?? 0;
  const outTokens = tokensOutput ?? 0;
  const costUsd = +(inTokens * pricing.input + outTokens * pricing.output).toFixed(6);

  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any)
    .from("ai_usage_logs")
    .insert({ user_id: userId, provider, model, feature, tokens_input: inTokens, tokens_output: outTokens, cost_usd: costUsd })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.error("[logAiUsage]", error.message);
    });
}
