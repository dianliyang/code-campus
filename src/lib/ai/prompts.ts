import { getAiRuntimeConfig } from "@/lib/ai/runtime-config";

export type DefaultPromptTemplates = {
  description: string;
  studyPlan: string;
  topics: string;
  courseUpdate: string;
  learningPath: string;
  planner: string;
};

export async function getDefaultPromptTemplates(): Promise<DefaultPromptTemplates> {
  const runtime = await getAiRuntimeConfig();
  return {
    description: runtime.prompts.description,
    studyPlan: runtime.prompts.studyPlan,
    topics: runtime.prompts.topics,
    courseUpdate: runtime.prompts.courseUpdate,
    learningPath: runtime.prompts.learningPath,
    planner: runtime.prompts.planner,
  };
}
