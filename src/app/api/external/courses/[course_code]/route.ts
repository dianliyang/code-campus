import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const EXTERNAL_API_CACHE_CONTROL = 'private, max-age=3600, stale-while-revalidate=600';
const LAST_MODIFIED_HEADER = 'Last-Modified';

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function courseLastUpdatedAt(course: Record<string, unknown>): number | null {
  let maxTime: number | null = parseTimestamp(course.created_at);

  const plans = Array.isArray(course.study_plans) ? course.study_plans : [];
  for (const plan of plans) {
    if (!plan || typeof plan !== 'object') continue;
    const record = plan as Record<string, unknown>;
    const updatedAt = parseTimestamp(record.updated_at);
    const createdAt = parseTimestamp(record.created_at);
    const candidate = updatedAt ?? createdAt;
    if (candidate !== null && (maxTime === null || candidate > maxTime)) {
      maxTime = candidate;
    }
  }

  return maxTime;
}

/**
 * External API for a single enrolled course by course_code.
 *
 * Returns the course only if it is enrolled (user_courses.status != 'hidden').
 * Auth: Requires x-api-key header when INTERNAL_API_KEY is set.
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
    const { study_plans, course_fields, user_courses, ...courseFields } = course;
    const publicCourseFields = { ...courseFields } as Record<string, unknown>;
    delete publicCourseFields.is_hidden;
    delete publicCourseFields.is_internal;

    const topics = Array.isArray(course_fields)
      ? course_fields
          .map((item) => item?.fields?.name)
          .filter((name): name is string => typeof name === 'string' && name.length > 0)
      : [];

    const rawDetails = courseFields.details;
    const details =
      rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)
        ? (() => {
            const {
              schedule,
              prerequisites,
              relatedUrls,
              crossListedCourses,
              instructors,
              ...rest
            } = rawDetails as Record<string, unknown>;
            void schedule;
            void prerequisites;
            void relatedUrls;
            void crossListedCourses;
            void instructors;
            return rest;
          })()
        : rawDetails;

    const enrollment = Array.isArray(user_courses) && user_courses.length > 0
      ? user_courses[0]
      : null;

    return NextResponse.json(
      {
        ...publicCourseFields,
        details,
        topics,
        schedule: study_plans ?? [],
        enrollment,
      },
      {
        headers: {
          'Cache-Control': EXTERNAL_API_CACHE_CONTROL,
          ...(lastUpdatedMs !== null
            ? { [LAST_MODIFIED_HEADER]: new Date(lastUpdatedMs).toUTCString() }
            : {}),
        },
      }
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
