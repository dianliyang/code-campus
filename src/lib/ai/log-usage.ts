import { createAdminClient } from "@/lib/supabase/server";
import { getAiRuntimeConfig } from "@/lib/ai/runtime-config";

export async function logAiUsage({
  userId,
  provider,
  model,
  feature,
  tokensInput,
  tokensOutput,
  prompt,
  responseText: _responseText,
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
  // Kept for backward compatibility with callers; canonical payload is response_payload.
  responseText?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
}) {
  try {
    void _responseText;
    const runtimeConfig = await getAiRuntimeConfig();
    const supabase = createAdminClient();

    // Prefer DB pricing source (ai_model_pricing), then fallback to edge runtime pricing.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pricingRow } = await (supabase as any)
      .from("ai_model_pricing")
      .select("input_per_token, output_per_token")
      .eq("provider", provider)
      .eq("model", model)
      .eq("is_active", true)
      .maybeSingle();

    const pricing = (pricingRow && typeof pricingRow === "object")
      ? {
          input: Number(pricingRow.input_per_token) || 0,
          output: Number(pricingRow.output_per_token) || 0,
        }
      : (
          runtimeConfig.pricing[`${provider}/${model}`]
          ?? runtimeConfig.pricing[model]
          ?? { input: 0, output: 0 }
        );
    const inTokens = tokensInput ?? 0;
    const outTokens = tokensOutput ?? 0;
    const costUsd = +(inTokens * pricing.input + outTokens * pricing.output).toFixed(6);
    const presetFromPayload = typeof requestPayload?.preset === "string" ? requestPayload.preset.trim() : "";
    const preset = presetFromPayload || feature;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageInsert = (supabase as any)
      .from("ai_usage_logs")
      .insert({ user_id: userId, provider, model, feature, tokens_input: inTokens, tokens_output: outTokens, cost_usd: costUsd })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error("[logAiUsage]", error.message);
      });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responsesInsert = (supabase as any)
      .from("ai_responses")
      .insert({
        user_id: userId,
        preset,
        feature,
        provider,
        model,
        prompt: prompt || null,
        // Canonical response storage lives in response_payload.
        request_payload: requestPayload || {},
        response_payload: responsePayload || {},
        tokens_input: inTokens,
        tokens_output: outTokens,
        cost_usd: costUsd,
      })
      .then(({ error }: { error: { message: string } | null }) => {
        if (error) console.error("[logAiUsage:ai_responses]", error.message);
      });

    await Promise.all([usageInsert, responsesInsert]);
  } catch (error) {
    console.error("[logAiUsage] runtime config error:", error);
  }
}
