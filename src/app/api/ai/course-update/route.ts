import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { logAiUsage } from '@/lib/ai/log-usage';
import { getAiRuntimeConfig } from '@/lib/ai/runtime-config';
import { resolveModelForProvider } from '@/lib/ai/models';

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
    .select('ai_provider, ai_default_model, ai_course_update_prompt_template')
    .eq('id', user.id)
    .maybeSingle();

  const runtimeConfig = await getAiRuntimeConfig();
  const modelName = await resolveModelForProvider('perplexity', String(profile?.ai_default_model || '').trim());
  const template = (profile?.ai_course_update_prompt_template || '').trim() || runtimeConfig.prompts.courseUpdate;

  const prompt = template
    .replace('{course_code}', course.course_code)
    .replace('{university}', course.university);

  try {
    const { text, usage } = await generateText({
      model: perplexity.chat(modelName),
      prompt,
      maxOutputTokens: 1024,
    });

    await logAiUsage({
      userId: user.id,
      provider: 'perplexity',
      model: modelName,
      feature: 'course-update',
      tokensInput: usage.inputTokens,
      tokensOutput: usage.outputTokens,
      prompt,
      responseText: text,
      requestPayload: { courseId, courseCode: course.course_code, university: course.university },
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned no JSON' }, { status: 422 });
    }

    const updates = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const rawUrls = Array.isArray(updates.related_urls) ? updates.related_urls : [];
    const relatedUrls = Array.from(
      new Set(
        rawUrls
          .filter((u): u is string => typeof u === 'string')
          .map((u) => u.trim())
          .filter((u) => /^https?:\/\//i.test(u))
      )
    );

    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from('courses')
      .update({ related_urls: relatedUrls })
      .eq('id', courseId);

    if (updateError) {
      console.error('[course-update] Supabase update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: ["related_urls"], count: relatedUrls.length });
  } catch (err) {
    console.error('[course-update] AI call failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI call failed' },
      { status: 500 }
    );
  }
}
