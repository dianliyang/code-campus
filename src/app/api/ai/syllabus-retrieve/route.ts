import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser, createAdminClient } from '@/lib/supabase/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { logAiUsage } from '@/lib/ai/log-usage';
import { getAiRuntimeConfig } from '@/lib/ai/runtime-config';
import { resolveModelForProvider } from '@/lib/ai/models';
import { parseLenientJson } from '@/lib/ai/parse-json';
import type { Json } from '@/lib/supabase/database.types';

export const runtime = 'nodejs';

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY || '',
  baseURL: 'https://api.perplexity.ai',
});

export async function POST(request: NextRequest) {
  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { courseId } = await request.json();
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('course_code, university, title')
    .eq('id', courseId)
    .single();
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('ai_default_model, ai_syllabus_prompt_template')
    .eq('id', user.id)
    .maybeSingle();

  const runtimeConfig = await getAiRuntimeConfig();
  const modelName = await resolveModelForProvider('perplexity', String(profile?.ai_default_model || '').trim());
  const template = (profile?.ai_syllabus_prompt_template || '').trim() || runtimeConfig.prompts.syllabusRetrieve;

  const prompt = template
    .replace('{{course_code}}', course.course_code)
    .replace('{{university}}', course.university)
    .replace('{{title}}', course.title || '');

  try {
    const { text, usage } = await generateText({
      model: perplexity.chat(modelName),
      prompt,
      maxOutputTokens: 4096,
    });

    await logAiUsage({
      userId: user.id,
      provider: 'perplexity',
      model: modelName,
      feature: 'syllabus-retrieve',
      tokensInput: usage.inputTokens,
      tokensOutput: usage.outputTokens,
      prompt,
      responseText: text,
      requestPayload: { courseId, courseCode: course.course_code, university: course.university },
    });

    const parsed = parseLenientJson(text) as Record<string, unknown> | null;
    if (!parsed) {
      return NextResponse.json({ error: 'AI returned no valid JSON' }, { status: 422 });
    }

    const sourceUrl = typeof parsed.source_url === 'string' ? parsed.source_url : null;
    const content = (parsed.content && typeof parsed.content === 'object' ? parsed.content : {}) as Json;
    const scheduleArray = Array.isArray(parsed.schedule) ? parsed.schedule : [];
    const schedule = scheduleArray as Json;

    const adminSupabase = createAdminClient();

    const { error: upsertError } = await adminSupabase
      .from('course_syllabi')
      .upsert(
        {
          course_id: courseId,
          source_url: sourceUrl,
          raw_text: text,
          content,
          schedule,
          retrieved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'course_id' }
      );

    if (upsertError) {
      console.error('[syllabus-retrieve] Supabase upsert error:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, scheduleEntries: scheduleArray.length });
  } catch (err) {
    console.error('[syllabus-retrieve] AI call failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI call failed' },
      { status: 500 }
    );
  }
}
