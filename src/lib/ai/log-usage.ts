import { createAdminClient } from "@/lib/supabase/server";
import { getAiRuntimeConfig } from "@/lib/ai/runtime-config";

export function logAiUsage({
  userId,
  provider,
  model,
  feature,
  tokensInput,
  tokensOutput,
  prompt,
  responseText,
  requestPayload,
  responsePayload,
}: {
  userId: string;
  provider: string;
  model: string;
  feature: string;
  tokensInput: number | undefined;
  tokensOutput: number | undefined;
  prompt?: string;
  responseText?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
}) {
  void (async () => {
    const runtimeConfig = await getAiRuntimeConfig();
    const pricing = runtimeConfig.pricing[model] ?? { input: 0, output: 0 };
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("ai_planner_responses")
      .insert({
        user_id: userId,
        feature,
        provider,
        model,
        prompt: prompt || null,
        response_text: responseText || null,
        request_payload: requestPayload || {},
        response_payload: responsePayload || {},
        tokens_input: inTokens,
        tokens_output: outTokens,
        cost_usd: costUsd,
      })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error("[logAiUsage:ai_planner_responses]", error.message);
      });
  })().catch((error) => {
    console.error("[logAiUsage] runtime config error:", error);
  });
}
