import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runCourseIntel } from '@/lib/ai/course-intel';
import { getCourseIntelErrorStatus } from '@/lib/ai/course-intel-errors';

/**
 * External API: trigger AI course sync for a specific course.
 *
 * Auth:
 * - Requires x-api-key when INTERNAL_API_KEY is set.
 *
 * Input:
 * - Path param: course_code
 * - Optional JSON body: { userId?: string }
 *
 * Behavior:
 * - Resolves course by course_code.
 * - If userId is not provided, it infers one from an enrolled (non-hidden) user_courses row.
 * - Runs runCourseIntel(userId, courseId) and returns sync summary.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ course_code: string }> }
) {
  const authHeader = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY;

  if (internalKey && authHeader !== internalKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { course_code: courseCode } = await params;
  if (!courseCode) {
    return NextResponse.json({ error: 'Invalid course_code' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const requestedUserId = typeof body?.userId === 'string' && body.userId.trim().length > 0
      ? body.userId.trim()
      : null;

    const supabase = createAdminClient();

    const { data: courseRow, error: courseError } = await supabase
      .from('courses')
      .select('id, course_code, title, university, is_hidden')
      .eq('course_code', courseCode)
      .maybeSingle();

    if (courseError) {
      return NextResponse.json({ error: 'Database error', details: courseError.message }, { status: 500 });
    }
    if (!courseRow || courseRow.is_hidden === true) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    let userId = requestedUserId;

    if (!userId) {
      const { data: ucRows, error: ucError } = await supabase
        .from('user_courses')
        .select('user_id, status')
        .eq('course_id', courseRow.id)
        .neq('status', 'hidden')
        .limit(1);

      if (ucError) {
        return NextResponse.json({ error: 'Database error', details: ucError.message }, { status: 500 });
      }

      const inferred = Array.isArray(ucRows) && ucRows.length > 0 ? ucRows[0]?.user_id : null;
      if (typeof inferred === 'string' && inferred.trim().length > 0) {
        userId = inferred;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unable to resolve userId. Provide {"userId":"..."} in request body.' },
        { status: 400 }
      );
    }

    const result = await runCourseIntel(userId, Number(courseRow.id));

    return NextResponse.json({
      success: true,
      course: {
        id: courseRow.id,
        code: courseRow.course_code,
        title: courseRow.title,
        university: courseRow.university,
      },
      usedUserId: userId,
      sync: result,
    });
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : 'Course intel failed';
    const message =
      /^unauthorized$/i.test(rawMessage) || /^forbidden$/i.test(rawMessage)
        ? 'AI provider authentication failed. Check provider keys/permissions.'
        : rawMessage;

    let status = getCourseIntelErrorStatus(rawMessage);
    if (status === 401 && /^unauthorized$/i.test(rawMessage)) status = 502;

    return NextResponse.json({ error: message }, { status });
  }
}
