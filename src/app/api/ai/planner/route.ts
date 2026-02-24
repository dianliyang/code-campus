import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

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

  const { data: rows, error } = await supabase
    .from("courses")
    .select("id, university, course_code, title, level, credit, description")
    .eq("is_hidden", false)
    .textSearch("search_vector", keywordQuery, { type: "websearch" })
    .limit(80);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const catalog = (rows || []).map((c) => ({
    id: c.id,
    title: c.title,
    course_code: c.course_code,
    university: c.university,
    level: c.level,
    credit: c.credit,
    description: c.description,
  }));

  const prompt = `You are an expert CS learning architect.

Target track: ${preset}

Candidate courses (JSON):
${JSON.stringify(catalog)}

Return ONLY valid JSON with this exact schema:
{
  "track": "string",
  "overview": "string",
  "roadmap": [
    {
      "phase": "string",
      "goal": "string",
      "courses": [
        {
          "id": number,
          "title": "string",
          "course_code": "string",
          "university": "string",
          "why": "string"
        }
      ]
    }
  ],
  "study_plan": [
    {
      "week": number,
      "focus": "string",
      "tasks": ["string"]
    }
  ]
}

Rules:
- Build a practical roadmap from foundations to advanced.
- Use only course ids present in candidate list.
- Keep roadmap 3-5 phases.
- Keep study_plan 8-12 weeks.
- No markdown, no extra text.`;

  try {
    const { text } = await generateText({
      model: perplexity.chat("sonar"),
      prompt,
      maxOutputTokens: 1800,
      temperature: 0.3,
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
