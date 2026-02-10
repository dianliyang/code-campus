import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * External API for study schedules.
 *
 * Data source: study_plans table.
 * Required filter: course_id query param.
 * Auth: Requires x-api-key header (when INTERNAL_API_KEY is configured).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY;

  if (internalKey && authHeader !== internalKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const courseIdParam = request.nextUrl.searchParams.get('course_id');
    const courseId = Number(courseIdParam);

    if (!courseIdParam || Number.isNaN(courseId)) {
      return NextResponse.json({ error: 'course_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('study_plans')
      .select(`
        id,
        course_id,
        start_date,
        end_date,
        days_of_week,
        start_time,
        end_time,
        location,
        type,
        created_at,
        updated_at,
        courses(id, title, course_code, university)
      `)
      .eq('course_id', courseId);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      course_id: courseId,
      schedule: data ?? [],
    });
  } catch (error) {
    console.error('API implementation error:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
