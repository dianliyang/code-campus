import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  buildCachingHeaders,
  transformExternalCourse,
} from '@/lib/external-api';

/**
 * External API for enrolled courses.
 *
 * Returns all courses the user is enrolled in (user_courses.status != 'hidden').
 * Auth: Requires x-api-key header when INTERNAL_API_KEY is set.
 * Supports conditional GET via If-Modified-Since → 304 Not Modified.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY;

  if (internalKey && authHeader !== internalKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        subdomain,
        resources,
        category,
        is_hidden,
        latest_semester,
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
      .neq('user_courses.status', 'hidden');

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    const cachingHeaders = buildCachingHeaders();

    const coursesWithEnrollment = (data ?? [])
      .filter((course) => course.is_hidden !== true)
      .map((course) => transformExternalCourse(course as Record<string, unknown>));

    return NextResponse.json({ courses: coursesWithEnrollment }, { headers: cachingHeaders });
  } catch (error) {
    console.error('API implementation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
