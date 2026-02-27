import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  buildCachingHeaders,
  transformExternalCourse,
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
        resources,
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
          uid,
          course_id,
          start_date,
          end_date,
          days_of_week,
          start_time,
          end_time,
          location,
          kind,
          timezone,
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
    const cachingHeaders = buildCachingHeaders();

    return NextResponse.json(
      { courses: [transformExternalCourse(course as Record<string, unknown>)] },
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

/**
 * Partial update for a course via external API.
 */
export async function PATCH(
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
    const body = await request.json();
    const supabase = createAdminClient();

    // Mapping of external body fields to internal database columns
    const updatePayload: Record<string, string | number | boolean | string[] | null> = {};

    // Whitelist of allowed fields for partial update
    const allowedFields: Record<string, string> = {
      subdomain: 'subdomain',
      resources: 'resources',
      category: 'category',
      workload: 'workload',
      difficulty: 'difficulty',
      popularity: 'popularity',
      description: 'description',
      units: 'units',
      credit: 'credit',
      level: 'level',
      department: 'department',
      corequisites: 'corequisites',
      prerequisites: 'prerequisites',
      instructors: 'instructors',
      title: 'title',
      url: 'url',
      cross_listed_courses: 'cross_listed_courses',
      is_hidden: 'is_hidden',
      is_internal: 'is_internal'
    };

    for (const [key, dbCol] of Object.entries(allowedFields)) {
      if (key in body) {
        updatePayload[dbCol] = body[key];
      }
    }

    // Schedule updates: only location and kind are allowed
    const scheduleUpdates = Array.isArray(body.schedules)
      ? (body.schedules as Array<{ id: string; location?: string; kind?: string }>)
          .filter((s) => typeof s.id === 'string')
      : [];

    if (Object.keys(updatePayload).length === 0 && scheduleUpdates.length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    // Update course fields
    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from('courses')
        .update(updatePayload)
        .eq('course_code', courseCode)
        .select('id, course_code')
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }
        return NextResponse.json(
          { error: 'Database error', details: error.message },
          { status: 500 }
        );
      }
    }

    // Update schedules (location and kind only)
    const scheduleErrors: string[] = [];
    for (const s of scheduleUpdates) {
      const schedulePayload: { location?: string; kind?: string } = {};
      if ('location' in s) schedulePayload.location = s.location;
      if ('kind' in s) schedulePayload.kind = s.kind;
      if (Object.keys(schedulePayload).length === 0) continue;

      const { error } = await supabase
        .from('study_plans')
        .update(schedulePayload)
        .eq('uid', s.id);

      if (error) {
        console.error('Schedule update error:', error);
        scheduleErrors.push(s.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Course ${courseCode} updated successfully`,
      updated_fields: Object.keys(updatePayload),
      updated_schedules: scheduleUpdates.length - scheduleErrors.length,
      ...(scheduleErrors.length > 0 && { schedule_errors: scheduleErrors }),
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
