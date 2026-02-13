"use server";

import { createClient, getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { AI_PROVIDERS, GEMINI_MODEL_SET, PERPLEXITY_MODEL_SET } from "@/lib/ai/models";

export async function updateAiPreferences(input: {
  provider: string;
  defaultModel: string;
  webSearchEnabled: boolean;
  promptTemplate: string;
  studyPlanPromptTemplate: string;
}) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  if (!AI_PROVIDERS.includes(input.provider as (typeof AI_PROVIDERS)[number])) {
    throw new Error("Invalid provider");
  }
  const validModelSet = input.provider === "gemini" ? GEMINI_MODEL_SET : PERPLEXITY_MODEL_SET;
  if (!validModelSet.has(input.defaultModel)) {
    throw new Error("Invalid model");
  }
  const promptTemplate = input.promptTemplate.trim();
  if (promptTemplate.length > 6000) {
    throw new Error("Prompt template is too long");
  }
  const studyPlanPromptTemplate = input.studyPlanPromptTemplate.trim();
  if (studyPlanPromptTemplate.length > 6000) {
    throw new Error("Study plan prompt template is too long");
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
      ai_prompt_template: promptTemplate || null,
      ai_study_plan_prompt_template: studyPlanPromptTemplate || null,
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
}
