"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { GEMINI_MODEL_SET, PERPLEXITY_MODEL_SET } from "@/lib/ai/models";

function applyPromptTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "");
}

export async function regenerateProjectSeminarDescription(projectSeminarId: number) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const { success: withinLimit } = rateLimit(`ai:project-seminar-description:${user.id}`, 5, 60_000);
  if (!withinLimit) {
    throw new Error("Rate limit exceeded. Please try again shortly.");
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("projects_seminars")
    .select("title, course_code, university, category, prerequisites, contents, description")
    .eq("id", projectSeminarId)
    .single();

  if (error || !row) {
    throw new Error("Project/Seminar not found");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template")
    .eq("id", user.id)
    .maybeSingle();

  const provider = profile?.ai_provider === "gemini" ? "gemini" : "perplexity";
  const selectedModel = (profile?.ai_default_model || "sonar").trim();
  const model = provider === "gemini"
    ? (GEMINI_MODEL_SET.has(selectedModel) ? selectedModel : "gemini-2.0-flash")
    : (PERPLEXITY_MODEL_SET.has(selectedModel) ? selectedModel : "sonar");
  const webSearchEnabled = profile?.ai_web_search_enabled ?? false;
  const template = (profile?.ai_prompt_template || "").trim();
  if (!template) {
    throw new Error("Metadata prompt is not configured. Set Metadata Logic in Settings first.");
  }
  const sourceDescription = row.contents || row.description || "";
  const basePrompt = applyPromptTemplate(template, {
    title: row.title || "",
    course_code: row.course_code || "",
    university: row.university || "",
    level: row.category || "",
    prerequisites: row.prerequisites || "",
    corequisites: "",
    description: sourceDescription,
  });
  const prompt = `${basePrompt}

Output format requirements:
- Return HTML fragment only (no markdown, no code fences).
- Use only semantic tags like div, p, span, ul, li, strong, em, br.
- No script/style tags.
- Keep concise and readable for students.`.trim();

  const response = provider === "gemini"
    ? await (async () => {
        if (!process.env.GEMINI_API_KEY) {
          throw new Error("AI service is not configured. Please set GEMINI_API_KEY.");
        }

        return fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: "You are a precise university catalog editor." }],
              },
              contents: [
                {
                  role: "user",
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.5,
                maxOutputTokens: 700,
              },
              tools: webSearchEnabled
                ? [{ google_search: {} }]
                : undefined,
            }),
          },
        );
      })()
    : await (async () => {
        if (!process.env.PERPLEXITY_API_KEY) {
          throw new Error("AI service is not configured. Please set PERPLEXITY_API_KEY.");
        }

        return fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: "You are a precise university catalog editor." },
              { role: "user", content: prompt },
            ],
            temperature: 0.5,
            max_tokens: 700,
            return_images: false,
            return_related_questions: false,
            disable_search: !webSearchEnabled,
            stream_mode: "concise",
          }),
        });
      })();

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI generation failed (${response.status}): ${body || "No response body"}`);
  }

  const parsedJson = (await response.json()) as
    | { choices?: Array<{ message?: { content?: string } }> }
    | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

  const rawText = provider === "gemini"
    ? (
        (parsedJson as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
          .candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n")
          .trim() || ""
      )
    : (
        (parsedJson as { choices?: Array<{ message?: { content?: string } }> })
          .choices?.[0]?.message?.content?.trim() || ""
      );
  const text = rawText
    .replace(/^```(?:html)?/i, "")
    .replace(/```$/i, "")
    .trim();
  if (!text) {
    throw new Error("AI returned an empty description");
  }
  return text;
}

export async function updateProjectSeminarDescription(projectSeminarId: number, description: string) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("projects_seminars")
    .update({
      contents: description,
      description,
    })
    .eq("id", projectSeminarId);

  if (error) {
    console.error("Failed to update project/seminar description:", error);
    throw new Error("Failed to update project/seminar description");
  }

  revalidatePath(`/projects-seminars/${projectSeminarId}`);
  revalidatePath("/projects-seminars");
}
