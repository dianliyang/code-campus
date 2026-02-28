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

  const validModelSet = await getModelSetForProvider(input.provider as "gemini" | "perplexity" | "openai" | "vertex");
  
  if (!validModelSet.has(input.defaultModel)) {
    throw new Error(`Invalid model for ${input.provider}: ${input.defaultModel}`);
  }
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      ai_provider: input.provider,
      ai_default_model: input.defaultModel,
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
    if (error.code === "PGRST204" && error.message?.includes("'ai_prompt_template'")) {
      throw new Error("Database column `profiles.ai_prompt_template` is missing. Please run the prompt template migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_study_plan_prompt_template'")) {
      throw new Error("Database column `profiles.ai_study_plan_prompt_template` is missing. Please run the study plan prompt migration.");
    }
    if (error.message?.includes("column \"ai_provider\"")) {
      throw new Error("Database column `profiles.ai_provider` is missing. Please run the latest AI settings migration.");
    }
    if (error.message?.includes("column \"ai_prompt_template\"")) {
      throw new Error("Database column `profiles.ai_prompt_template` is missing. Please run the prompt template migration.");
    }
    if (error.message?.includes("column \"ai_study_plan_prompt_template\"")) {
      throw new Error("Database column `profiles.ai_study_plan_prompt_template` is missing. Please run the study plan prompt migration.");
    }
    throw new Error("Failed to update AI settings");
  }

  revalidatePath("/profile");
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

export async function updateAiPromptTemplates(input: {
  descriptionPromptTemplate?: string;
  studyPlanPromptTemplate?: string;
  plannerPromptTemplate?: string;
  topicsPromptTemplate?: string;
  courseUpdatePromptTemplate?: string;
  syllabusPromptTemplate?: string;
  courseIntelPromptTemplate?: string;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const updatePayload: Record<string, string | null> = {};

  if (typeof input.descriptionPromptTemplate === "string") {
    const value = input.descriptionPromptTemplate.trim();
    if (value.length > 6000) {
      throw new Error("Prompt template is too long");
    }
    updatePayload.ai_prompt_template = value || null;
  }

  if (typeof input.studyPlanPromptTemplate === "string") {
    const value = input.studyPlanPromptTemplate.trim();
    if (value.length > 6000) {
      throw new Error("Study plan prompt template is too long");
    }
    updatePayload.ai_study_plan_prompt_template = value || null;
  }

  if (typeof input.plannerPromptTemplate === "string") {
    const value = input.plannerPromptTemplate.trim();
    if (value.length > 10000) {
      throw new Error("Planner prompt template is too long");
    }
    updatePayload.ai_planner_prompt_template = value || null;
  }

  if (typeof input.topicsPromptTemplate === "string") {
    const value = input.topicsPromptTemplate.trim();
    if (value.length > 6000) {
      throw new Error("Topics prompt template is too long");
    }
    updatePayload.ai_topics_prompt_template = value || null;
  }

  if (typeof input.courseUpdatePromptTemplate === "string") {
    const value = input.courseUpdatePromptTemplate.trim();
    if (value.length > 8000) {
      throw new Error("Course update prompt template is too long");
    }
    updatePayload.ai_course_update_prompt_template = value || null;
  }

  if (typeof input.syllabusPromptTemplate === "string") {
    const value = input.syllabusPromptTemplate.trim();
    if (value.length > 8000) {
      throw new Error("Syllabus prompt template is too long");
    }
    updatePayload.ai_syllabus_prompt_template = value || null;
  }

  if (typeof input.courseIntelPromptTemplate === "string") {
    const value = input.courseIntelPromptTemplate.trim();
    if (value.length > 12000) {
      throw new Error("Course intel prompt template is too long");
    }
    updatePayload.ai_course_intel_prompt_template = value || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      ...updatePayload,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Failed to update AI prompt templates:", error);
    if (error.message?.includes("relation \"public.profiles\" does not exist")) {
      throw new Error("Database table `profiles` is missing. Please run the profiles migration first.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_prompt_template'")) {
      throw new Error("Database column `profiles.ai_prompt_template` is missing. Please run the prompt template migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_study_plan_prompt_template'")) {
      throw new Error("Database column `profiles.ai_study_plan_prompt_template` is missing. Please run the study plan prompt migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_topics_prompt_template'")) {
      throw new Error("Database column `profiles.ai_topics_prompt_template` is missing. Please run the topics prompt migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_planner_prompt_template'")) {
      throw new Error("Database column `profiles.ai_planner_prompt_template` is missing. Please run the planner prompt migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_course_update_prompt_template'")) {
      throw new Error("Database column `profiles.ai_course_update_prompt_template` is missing. Please run the course update prompt migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_syllabus_prompt_template'")) {
      throw new Error("Database column `profiles.ai_syllabus_prompt_template` is missing. Please run the syllabus prompt migration.");
    }
    if (error.code === "PGRST204" && error.message?.includes("'ai_course_intel_prompt_template'")) {
      throw new Error("Database column `profiles.ai_course_intel_prompt_template` is missing. Please run the course intel prompt migration.");
    }
    throw new Error("Failed to update AI prompt templates");
  }

  revalidatePath("/settings");
  invalidateCachedProfileSettings(user.id);
}
