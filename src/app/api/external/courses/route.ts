import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const EXTERNAL_API_CACHE_CONTROL = 'private, max-age=300, stale-while-revalidate=600';
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
 * External API for enrolled courses.
 *
 * Returns all courses the user is enrolled in (user_courses.status != 'hidden').
 * Auth: Requires x-api-key header when INTERNAL_API_KEY is set.
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

    const lastUpdatedMs = (data ?? []).reduce<number | null>((maxTime, course) => {
      const candidate = courseLastUpdatedAt(course as Record<string, unknown>);
      if (candidate === null) return maxTime;
      if (maxTime === null || candidate > maxTime) return candidate;
      return maxTime;
    }, null);

    const clientLastUpdate = parseTimestamp(request.headers.get('if-modified-since'));
    if (
      lastUpdatedMs !== null &&
      clientLastUpdate !== null &&
      clientLastUpdate >= lastUpdatedMs
    ) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Cache-Control': EXTERNAL_API_CACHE_CONTROL,
          [LAST_MODIFIED_HEADER]: new Date(lastUpdatedMs).toUTCString(),
        },
      });
    }

    const coursesWithEnrollment = (data ?? []).map((course) => {
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

      return {
        ...publicCourseFields,
        details,
        topics,
        schedule: study_plans ?? [],
        enrollment,
      };
    });

    return NextResponse.json(coursesWithEnrollment, {
      headers: {
        'Cache-Control': EXTERNAL_API_CACHE_CONTROL,
        ...(lastUpdatedMs !== null
          ? { [LAST_MODIFIED_HEADER]: new Date(lastUpdatedMs).toUTCString() }
          : {}),
      },
    });
  } catch (error) {
    console.error('API implementation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
