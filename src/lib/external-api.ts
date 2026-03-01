import { NextResponse } from 'next/server';

export const EXTERNAL_API_CACHE_CONTROL =
  'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';

/** Build standard headers including Cache-Control. */
export function buildCachingHeaders(): Record<string, string> {
  return {
    'Cache-Control': EXTERNAL_API_CACHE_CONTROL,
  };
}

function transformSchedules(plans: Array<Record<string, unknown>>) {
  return plans.map((plan) => ({
    id: plan.uid,
    kind: typeof plan.kind === 'string'
      ? plan.kind.charAt(0).toUpperCase() + plan.kind.slice(1)
      : null,
    location: plan.location || null,
    timezone: typeof plan.timezone === 'string' && plan.timezone ? plan.timezone : 'UTC',
    startDate: plan.start_date || null,
    endDate: plan.end_date || null,
    daysOfWeek: Array.isArray(plan.days_of_week) ? plan.days_of_week : [],
    startTime: typeof plan.start_time === 'string' ? plan.start_time.slice(0, 5) : null,
    endTime: typeof plan.end_time === 'string' ? plan.end_time.slice(0, 5) : null,
  }));
}

function transformAssignments(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => ({
    id: row.id ?? null,
    kind: typeof row.kind === 'string' ? row.kind : 'other',
    label: typeof row.label === 'string' ? row.label : null,
    dueOn: row.due_on ?? null,
    url: typeof row.url === 'string' ? row.url : null,
    description: typeof row.description === 'string' ? row.description : null,
    sourceSequence: typeof row.source_sequence === 'string' ? row.source_sequence : null,
    sourceRowDate: row.source_row_date ?? null,
    updatedAt: row.updated_at ?? null,
  }));
}

/** Transform internal course data to the external API structure. */
export function transformExternalCourse(course: Record<string, unknown>) {
  const parseNum = (val: unknown) => {
    const n = parseFloat(String(val));
    return isNaN(n) ? null : n;
  };

  const details = (course.details && typeof course.details === 'object' ? course.details : {}) as Record<string, unknown>;
  const userCourse = Array.isArray(course.user_courses) && course.user_courses.length > 0
    ? (course.user_courses[0] as Record<string, unknown>)
    : null;

  const fields = Array.isArray(course.course_fields)
    ? (course.course_fields as Array<Record<string, unknown>>).map((cf) => (cf.fields as Record<string, unknown>)?.name).filter(Boolean)
    : [];

  const semester = course.latest_semester as Record<string, unknown> | null;
  const latestTerm = semester && semester.term && semester.year
    ? `${semester.term} ${semester.year}`
    : null;

  const finalResources = Array.isArray(course.resources) && course.resources.length > 0
    ? course.resources
    : (Array.isArray(course.resources) ? course.resources : []);

  const finalCategory = course.category || (fields.length > 0 ? fields[0] : null);

  const studyPlans = Array.isArray(course.study_plans)
    ? (course.study_plans as Array<Record<string, unknown>>)
    : [];
  const assignmentRows = Array.isArray(course.course_assignments)
    ? (course.course_assignments as Array<Record<string, unknown>>)
    : [];
  const syllabus = Array.isArray(course.course_syllabi) && course.course_syllabi.length > 0
    ? (course.course_syllabi[0] as Record<string, unknown>)
    : null;

  return {
    code: course.course_code,
    name: course.title,
    university: course.university,
    units: course.units,
    credit: parseNum(course.credit),
    department: course.department,
    level: course.level,
    category: finalCategory,
    latestTerm: latestTerm,
    logistics: details.logistics || null,
    prerequisites: course.prerequisites,
    instructors: Array.isArray(course.instructors) ? course.instructors : [],
    subdomain: course.subdomain || null,
    topics: fields,
    resources: finalResources,
    desc: course.description,
    urlString: course.url,
    isEnrolled: !!userCourse,
    isFailed: userCourse?.status === 'failed',
    retry: 0,
    gpa: userCourse ? parseNum(userCourse.gpa) : null,
    score: userCourse ? parseNum(userCourse.score) : null,
    assignments: transformAssignments(assignmentRows),
    syllabus: syllabus
      ? {
          sourceUrl: typeof syllabus.source_url === 'string' ? syllabus.source_url : null,
          content: syllabus.content ?? null,
          schedule: syllabus.schedule ?? null,
          retrievedAt: syllabus.retrieved_at ?? null,
          updatedAt: syllabus.updated_at ?? null,
        }
      : null,
    schedules: transformSchedules(studyPlans),
  };
}

/** Build a 304 Not Modified response with caching headers. */
export function notModifiedResponse(headers: Record<string, string>): NextResponse {
  return new NextResponse(null, { status: 304, headers });
}
