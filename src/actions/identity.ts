"use server";

import { createClient, getUser, invalidateCachedProfileSettings } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AI_PROVIDERS, getModelSetForProvider } from "@/lib/ai/models";
import { invalidateRuntimeConfig } from "@/lib/ai/runtime-config";

export async function updateAiPreferences(input: {
  provider: string;
  defaultModel: string;
  webSearchEnabled: boolean;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!AI_PROVIDERS.includes(input.provider as (typeof AI_PROVIDERS)[number])) {
    throw new Error("Invalid provider");
  }

  const validModelSet = await getModelSetForProvider(
    input.provider as "gemini" | "perplexity" | "openai" | "vertex",
  );
  const validModels = Array.from(validModelSet);
  const requestedModel = String(input.defaultModel || "").trim();
  const resolvedModel = validModelSet.has(requestedModel) ? requestedModel : (validModels[0] || "");
  if (!resolvedModel) {
    throw new Error(`No active model configured for provider: ${input.provider}`);
  }
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      ai_provider: input.provider,
      ai_default_model: resolvedModel,
      ai_web_search_enabled: input.webSearchEnabled,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Failed to update AI preferences:", error);
    if (error.message?.includes("relation \"public.profiles\" does not exist")) {
      throw new Error("Database table `profiles` is missing. Please run the profiles migration first.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_default_model'")) {
      throw new Error("Database column `profiles.ai_default_model` is missing. Please run the AI settings migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_web_search_enabled'")) {
      throw new Error("Database column `profiles.ai_web_search_enabled` is missing. Please run the AI settings migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_provider'")) {
      throw new Error("Database column `profiles.ai_provider` is missing. Please run the latest AI provider migration.");
    }
    if (error.message?.includes("column \"ai_provider\"")) {
      throw new Error("Database column `profiles.ai_provider` is missing. Please run the latest AI settings migration.");
    }
    throw new Error("Failed to update AI settings");
  }

  revalidatePath("/identity");
  revalidatePath("/settings");
  invalidateCachedProfileSettings(user.id);
}

export async function updateAiApiKeys(input: {
  openai?: string | null;
  perplexity?: string | null;
  gemini?: string | null;
}) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const update: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  };

  if (input.openai !== undefined) update.openai_api_key = input.openai;
  if (input.perplexity !== undefined) update.perplexity_api_key = input.perplexity;
  if (input.gemini !== undefined) update.gemini_api_key = input.gemini;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) throw new Error(error.message || "Failed to update API keys");

  revalidatePath("/settings");
  invalidateCachedProfileSettings(user.id);
}

export async function upsertAiModelPricing(input: {
  provider: string;
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
}) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  if (!AI_PROVIDERS.includes(input.provider as (typeof AI_PROVIDERS)[number])) {
    throw new Error("Invalid provider");
  }

  const provider = input.provider.trim();
  const model = input.model.trim();
  if (!model) throw new Error("Model is required");

  const inputPerMillion = Number(input.inputPerMillion);
  const outputPerMillion = Number(input.outputPerMillion);
  if (!Number.isFinite(inputPerMillion) || inputPerMillion < 0) throw new Error("Invalid input price");
  if (!Number.isFinite(outputPerMillion) || outputPerMillion < 0) throw new Error("Invalid output price");

  const inputPerToken = inputPerMillion / 1_000_000;
  const outputPerToken = outputPerMillion / 1_000_000;
  const now = new Date().toISOString();

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error } = await admin
    .from("ai_model_pricing")
    .upsert(
      {
        provider,
        model,
        input_per_token: inputPerToken,
        output_per_token: outputPerToken,
        is_active: true,
        updated_at: now,
      },
      { onConflict: "provider,model" }
    );

  if (error) throw new Error(error.message || "Failed to save model pricing");

  invalidateRuntimeConfig();
  revalidatePath("/settings");
}

export async function deactivateAiModelPricing(input: { provider: string; model: string }) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  if (!AI_PROVIDERS.includes(input.provider as (typeof AI_PROVIDERS)[number])) {
    throw new Error("Invalid provider");
  }

  const provider = input.provider.trim();
  const model = input.model.trim();
  if (!model) throw new Error("Model is required");

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error } = await admin
    .from("ai_model_pricing")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("model", model);

  if (error) throw new Error(error.message || "Failed to delete model");

  invalidateRuntimeConfig();
  revalidatePath("/settings");
}

export async function deactivateAiProviderPricing(input: { provider: string }) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  if (!AI_PROVIDERS.includes(input.provider as (typeof AI_PROVIDERS)[number])) {
    throw new Error("Invalid provider");
  }

  const provider = input.provider.trim();

  const { createAdminClient } = await import("@/lib/supabase/server");
  const admin = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error } = await admin
    .from("ai_model_pricing")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("provider", provider);

  if (error) throw new Error(error.message || "Failed to delete provider");

  invalidateRuntimeConfig();
  revalidatePath("/settings");
}
