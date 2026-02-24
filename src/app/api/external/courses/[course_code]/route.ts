import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  courseLastUpdatedAt,
  buildCachingHeaders,
  checkNotModified,
  transformExternalCourse,
  notModifiedResponse,
} from '@/lib/external-api';

/**
 * External API for a single enrolled course by course_code.
 *
 * Returns the course only if it is enrolled (user_courses.status != 'hidden').
 * Auth: Requires x-api-key header when INTERNAL_API_KEY is set.
 * Supports conditional GET via If-Modified-Since → 304 Not Modified.
 */
export async function GET(
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
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        university,
        course_code,
        title,
        units,
        credit,
        description,
        url,
        details,
        instructors,
        prerequisites,
        related_urls,
        cross_listed_courses,
        department,
        corequisites,
        level,
        difficulty,
        popularity,
        workload,
        is_hidden,
        created_at,
        course_fields(
          fields(
            name
          )
        ),
        study_plans(
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
          updated_at
        ),
        user_courses!inner(
          status,
          progress,
          gpa,
          score,
          notes,
          priority,
          updated_at
        )
      `)
      .neq('user_courses.status', 'hidden')
      .eq('course_code', courseCode);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    const activeData = (Array.isArray(data) ? data : data ? [data] : []).filter((c) => {
      if (c.is_hidden === true) return false;
      const uc = Array.isArray(c.user_courses) ? c.user_courses : [];
      return uc.some((r) => r.status !== 'hidden');
    });

    if (!activeData.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const course = activeData[0];
    const lastUpdatedMs = courseLastUpdatedAt(course as Record<string, unknown>);
    const cachingHeaders = buildCachingHeaders(lastUpdatedMs);

    const ifModifiedSince = request.headers.get('if-modified-since');
    if (checkNotModified(ifModifiedSince, lastUpdatedMs)) {
      return notModifiedResponse(cachingHeaders);
    }

    return NextResponse.json(
      transformExternalCourse(course as Record<string, unknown>),
      { headers: cachingHeaders }
    );
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
