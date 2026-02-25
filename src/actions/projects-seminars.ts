"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient, getUser } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { resolveModelForProvider } from "@/lib/ai/models";
import { logAiUsage } from "@/lib/ai/log-usage";

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
  let row: {
    title?: string | null;
    course_code?: string | null;
    university?: string | null;
    category?: string | null;
    prerequisites?: string | null;
    contents?: string | null;
    description?: string | null;
    details?: unknown;
  } | null = null;

  const { data: modernRow, error: modernError } = await supabase
    .from("projects_seminars")
    .select("title, course_code, university, category, prerequisites, contents, description")
    .eq("id", projectSeminarId)
    .single();

  if (!modernError && modernRow) {
    row = modernRow;
  } else {
    const { data: legacyRow, error: legacyError } = await supabase
      .from("projects_seminars")
      .select("title, course_code, university, category, description, details")
      .eq("id", projectSeminarId)
      .single();
    if (legacyError || !legacyRow) {
      throw new Error("Project/Seminar not found");
    }
    const details =
      legacyRow.details && typeof legacyRow.details === "object" && !Array.isArray(legacyRow.details)
        ? (legacyRow.details as Record<string, unknown>)
        : {};
    row = {
      ...legacyRow,
      prerequisites:
        (typeof details.prerequisites === "string" && details.prerequisites) ||
        (typeof details.prerequisites_organisational_information === "string" &&
          details.prerequisites_organisational_information) ||
        null,
      contents: (typeof details.contents === "string" && details.contents) || null,
    };
  }

  const profileSelectVariants = [
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template",
    "ai_default_model, ai_web_search_enabled, ai_prompt_template",
    "ai_web_search_enabled, ai_prompt_template",
    "ai_prompt_template",
    "id",
  ];
  let profile: Record<string, unknown> | null = null;
  let lastProfileError: { code?: string; message?: string } | null = null;

  for (const selectColumns of profileSelectVariants) {
    const { data, error } = await supabase
      .from("profiles")
      .select(selectColumns)
      .eq("id", user.id)
      .maybeSingle();
    if (!error) {
      profile = (data as Record<string, unknown> | null) || null;
      lastProfileError = null;
      break;
    }
    lastProfileError = error;
  }

  if (lastProfileError) {
    const msg = lastProfileError.message || "";
    if (
      (lastProfileError.code === "PGRST204" && msg.includes("'ai_prompt_template'")) ||
      msg.includes('column "ai_prompt_template"')
    ) {
      throw new Error("Database column `profiles.ai_prompt_template` is missing. Please run the prompt template migration.");
    }
    throw new Error("Failed to load AI profile settings.");
  }

  const provider = profile?.ai_provider === "gemini" ? "gemini" : "perplexity";
  const selectedModel = (String(profile?.ai_default_model || "")).trim();
  const model = await resolveModelForProvider(provider, selectedModel);
  const webSearchEnabled = Boolean(profile?.ai_web_search_enabled ?? false);
  const template = String(profile?.ai_prompt_template || "").trim();
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
    | { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } }
    | { usage?: { prompt_tokens?: number; completion_tokens?: number } };

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

  const usage = provider === "gemini"
    ? {
        input: Number(
          (parsedJson as { usageMetadata?: { promptTokenCount?: number } })
            .usageMetadata?.promptTokenCount ?? 0
        ),
        output: Number(
          (parsedJson as { usageMetadata?: { candidatesTokenCount?: number } })
            .usageMetadata?.candidatesTokenCount ?? 0
        ),
      }
    : {
        input: Number(
          (parsedJson as { usage?: { prompt_tokens?: number } })
            .usage?.prompt_tokens ?? 0
        ),
        output: Number(
          (parsedJson as { usage?: { completion_tokens?: number } })
            .usage?.completion_tokens ?? 0
        ),
      };

  await logAiUsage({
    userId: user.id,
    provider,
    model,
    feature: "description",
    tokensInput: Number.isFinite(usage.input) ? usage.input : 0,
    tokensOutput: Number.isFinite(usage.output) ? usage.output : 0,
    prompt,
    responseText: text,
    requestPayload: { projectSeminarId, courseCode: row.course_code || "", university: row.university || "" },
    responsePayload: { description: text },
  });

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

  if (error?.message?.includes("contents") || error?.code === "PGRST204") {
    const { error: fallbackError } = await supabase
      .from("projects_seminars")
      .update({ description })
      .eq("id", projectSeminarId);
    if (fallbackError) {
      console.error("Failed to update project/seminar description (fallback):", fallbackError);
      throw new Error("Failed to update project/seminar description");
    }
  } else if (error) {
    console.error("Failed to update project/seminar description:", error);
    throw new Error("Failed to update project/seminar description");
  }

  revalidatePath(`/projects-seminars/${projectSeminarId}`);
  revalidatePath("/projects-seminars");
}

export async function toggleProjectSeminarEnrollmentAction(projectSeminarId: number, isEnrolled: boolean) {
  const user = await getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  if (isEnrolled) {
    const { error } = await supabase
      .from("user_projects_seminars")
      .delete()
      .match({ user_id: user.id, project_seminar_id: projectSeminarId });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("user_projects_seminars")
      .upsert({
        user_id: user.id,
        project_seminar_id: projectSeminarId,
        status: "in_progress",
        progress: 0,
        updated_at: new Date().toISOString(),
      });
    if (error) throw error;
  }

  revalidatePath(`/projects-seminars/${projectSeminarId}`);
  revalidatePath("/projects-seminars");
}
