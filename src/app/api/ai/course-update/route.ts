import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUser } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { DEFAULT_COURSE_UPDATE_PROMPT } from '@/lib/ai/prompts';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

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
    .select('ai_course_update_prompt_template')
    .eq('id', user.id)
    .maybeSingle();

  const template = (profile?.ai_course_update_prompt_template || '').trim() || DEFAULT_COURSE_UPDATE_PROMPT;

  const prompt = template
    .replace('{course_code}', course.course_code)
    .replace('{university}', course.university);

  try {
    const { text } = await generateText({
      model: perplexity.chat('sonar'),
      prompt,
      maxOutputTokens: 1024,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI returned no JSON' }, { status: 422 });
    }

    const updates = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Never overwrite user-managed fields
    delete updates.is_hidden;
    delete updates.is_internal;

    const adminSupabase = createAdminClient();
    const { error: updateError } = await adminSupabase
      .from('courses')
      .update(updates)
      .eq('id', courseId);

    if (updateError) {
      console.error('[course-update] Supabase update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: Object.keys(updates) });
  } catch (err) {
    console.error('[course-update] AI call failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI call failed' },
      { status: 500 }
    );
  }
}
