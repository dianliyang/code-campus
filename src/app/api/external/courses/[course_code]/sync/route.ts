import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runCourseIntel } from '@/lib/ai/course-intel';
import { getCourseIntelErrorStatus } from '@/lib/ai/course-intel-errors';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) return true;
  return authHeader === internalKey;
}

async function resolveCourse(supabase: ReturnType<typeof createAdminClient>, courseCode: string) {
  const { data: courseRow, error: courseError } = await supabase
    .from('courses')
    .select('id, course_code, title, university, is_hidden')
    .eq('course_code', courseCode)
    .maybeSingle();

  if (courseError) throw new Error(`DB:${courseError.message}`);
  if (!courseRow || courseRow.is_hidden === true) return null;
  return courseRow;
}

/**
 * External API: trigger AI course sync for a specific course.
 * POST /api/external/courses/:course_code/sync
 *
 * Body:
 *  - userId?: string
 *  - fastMode?: boolean (default true)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ course_code: string }> }
) {
  if (!isAuthorized(request)) {
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
    const fastMode = typeof body?.fastMode === 'boolean' ? body.fastMode : true;

    const supabase = createAdminClient();
    const courseRow = await resolveCourse(supabase, courseCode);

    if (!courseRow) {
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

    const result = await runCourseIntel(userId, Number(courseRow.id), { fastMode });

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

    if (/^DB:/.test(message)) {
      return NextResponse.json({ error: 'Database error', details: message.replace(/^DB:/, '') }, { status: 500 });
    }

    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * External API: fetch current sync snapshot for a course.
 * GET /api/external/courses/:course_code/sync
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ course_code: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { course_code: courseCode } = await params;
  if (!courseCode) {
    return NextResponse.json({ error: 'Invalid course_code' }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        id,
        course_code,
        title,
        university,
        resources,
        course_syllabi(source_url, retrieved_at, updated_at),
        course_assignments(id, kind, label, due_on, updated_at)
      `)
      .eq('course_code', courseCode)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const syllabus = Array.isArray(course.course_syllabi) && course.course_syllabi.length > 0
      ? course.course_syllabi[0]
      : null;
    const assignments = Array.isArray(course.course_assignments) ? course.course_assignments : [];

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        code: course.course_code,
        title: course.title,
        university: course.university,
      },
      resourcesCount: Array.isArray(course.resources) ? course.resources.length : 0,
      syllabus: syllabus
        ? {
            sourceUrl: syllabus.source_url ?? null,
            retrievedAt: syllabus.retrieved_at ?? null,
            updatedAt: syllabus.updated_at ?? null,
          }
        : null,
      assignmentsCount: assignments.length,
      assignmentsPreview: assignments.slice(0, 10),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
