import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * External API for CAU Kiel courses.
 * 
 * Provides course data to other services.
 * Filters: university=CAU Kiel, is_hidden=false
 * Auth: Requires x-api-key header
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate the incoming request
  const authHeader = request.headers.get('x-api-key');
  const internalKey = process.env.INTERNAL_API_KEY;

  if (internalKey && authHeader !== internalKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Initialize Supabase Admin Client to query the database directly
    const supabase = createAdminClient();

    // 3. Query CAU courses and attach schedules from study_plans
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
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
        )
      `)
      .eq('university', 'CAU Kiel')
      .eq('is_hidden', false);

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    const coursesWithSchedule = (data ?? []).map((course) => {
      const { study_plans, ...courseFields } = course;
      return {
        ...courseFields,
        schedule: study_plans ?? [],
      };
    });

    // 4. Return all courses with schedule
    return NextResponse.json(coursesWithSchedule);
  } catch (error) {
    console.error('API implementation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
