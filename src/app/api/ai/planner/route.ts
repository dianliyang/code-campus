import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { logAiUsage } from "@/lib/ai/log-usage";
import { applyPromptTemplate, getAiRuntimeConfig } from "@/lib/ai/runtime-config";

export const runtime = "nodejs";

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || "",
  baseURL: "https://api.perplexity.ai",
});

const PRESET_KEYWORDS: Record<string, string> = {
  "AI Infra": "distributed systems ml infrastructure kubernetes model serving gpu systems compiler performance",
  "ML Systems": "machine learning systems mlops model deployment feature store training pipeline",
  "LLM Engineering": "llm nlp transformers retrieval augmented generation inference optimization prompt engineering",
  "Data Engineering": "data engineering databases etl pipelines data warehouse stream processing",
  "Security Engineering": "security cryptography network security secure systems privacy",
};

function keywordScore(text: string, tokens: string[]) {
  const target = text.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (target.includes(token)) score += 1;
  }
  return score;
}

export async function POST(request: NextRequest) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const preset = String(body?.preset || "").trim();
  if (!preset || !PRESET_KEYWORDS[preset]) {
    return NextResponse.json({ error: "Invalid preset" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const keywordQuery = PRESET_KEYWORDS[preset];
  const tokens = keywordQuery
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 10);

  const { data: rows, error } = await supabase
    .from("courses")
    .select("id, university, course_code, title, level, credit, description")
    .eq("is_hidden", false)
    .textSearch("search_vector", keywordQuery, { type: "websearch" })
    .limit(80);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let candidates = rows || [];

  if (candidates.length === 0) {
    const { data: fallbackRows, error: fallbackError } = await supabase
      .from("courses")
      .select("id, university, course_code, title, level, credit, description, popularity")
      .eq("is_hidden", false)
      .order("popularity", { ascending: false, nullsFirst: false })
      .limit(300);

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 });
    }

    const ranked = (fallbackRows || [])
      .map((c) => {
        const haystack = `${c.title || ""} ${c.course_code || ""} ${c.description || ""}`;
        return { c, score: keywordScore(haystack, tokens) };
      })
      .sort((a, b) => b.score - a.score);

    const withScore = ranked.filter((x) => x.score > 0).slice(0, 80).map((x) => x.c);
    candidates = withScore.length > 0 ? withScore : ranked.slice(0, 80).map((x) => x.c);
  }

  const catalog = candidates.map((c) => ({
    id: c.id,
    title: c.title,
    course_code: c.course_code,
    university: c.university,
    level: c.level,
    credit: c.credit,
    description: c.description,
  }));

  const runtimeConfig = await getAiRuntimeConfig();
  const modelName = runtimeConfig.models.planner;
  let plannerPromptTemplate = runtimeConfig.prompts.planner;

  // Support per-user planner prompt overrides while remaining backward-compatible
  // with databases that don't yet have this column.
  const { data: profilePrompt } = await supabase
    .from("profiles")
    .select("ai_planner_prompt_template")
    .eq("id", user.id)
    .maybeSingle();
  const customPlannerPrompt = String(profilePrompt?.ai_planner_prompt_template || "").trim();
  if (customPlannerPrompt) {
    plannerPromptTemplate = customPlannerPrompt;
  }

  const prompt = applyPromptTemplate(plannerPromptTemplate, {
    preset,
    catalog_json: JSON.stringify(catalog),
  });

  try {
    const { text, usage } = await generateText({
      model: perplexity.chat(modelName),
      prompt,
      maxOutputTokens: 1800,
      temperature: 0.3,
    });

    logAiUsage({
      userId: user.id,
      provider: "perplexity",
      model: modelName,
      feature: "planner",
      tokensInput: usage.inputTokens,
      tokensOutput: usage.outputTokens,
      prompt,
      responseText: text,
      requestPayload: { preset, candidateCount: catalog.length },
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 422 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, result: parsed, candidateCount: catalog.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Planner generation failed" },
      { status: 500 }
    );
  }
}
