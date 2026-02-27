import { NextResponse } from 'next/server';

export const EXTERNAL_API_CACHE_CONTROL =
  'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0';

/** Build standard headers including Cache-Control. */
export function buildCachingHeaders(): Record<string, string> {
  return {
    'Cache-Control': EXTERNAL_API_CACHE_CONTROL,
  };
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

  // New fields priority: subdomain, resources, category
  // If the new columns are populated, use them. Fallback to old mapping if not.
  const finalResources = Array.isArray(course.resources) && course.resources.length > 0
    ? course.resources
    : (Array.isArray(course.related_urls) ? course.related_urls : []);

  const finalCategory = course.category || (fields.length > 0 ? fields[0] : null);

  return {
    remoteID: course.id,
    name: course.title,
    code: course.course_code,
    university: course.university,
    units: course.units,
    credit: parseNum(course.credit),
    desc: course.description,
    urlString: course.url,
    instructors: Array.isArray(course.instructors) ? course.instructors : [],
    prerequisites: course.prerequisites,
    resources: finalResources,
    subdomain: course.subdomain || null,
    platforms: Array.isArray(details.platforms) ? details.platforms : [],
    crossListedCourses: typeof course.cross_listed_courses === 'string' 
      ? course.cross_listed_courses.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
      : [],
    category: finalCategory,
    department: course.department,
    latestTerm: latestTerm,
    logistics: details.logistics || null,
    level: course.level,
    difficulty: parseNum(course.difficulty),
    popularity: parseNum(course.popularity),
    workload: parseNum(course.workload),
    gpa: userCourse ? parseNum(userCourse.gpa) : null,
    score: userCourse ? parseNum(userCourse.score) : null,
    createdAtISO8601: course.created_at,
    updatedAtISO8601: userCourse?.updated_at || course.created_at || new Date().toISOString(),
    topics: fields,
    isEnrolled: !!userCourse,
    isFailed: userCourse?.status === 'failed',
    retry: 0,
    assignments: []
  };
}

/** Build a 304 Not Modified response with caching headers. */
export function notModifiedResponse(headers: Record<string, string>): NextResponse {
  return new NextResponse(null, { status: 304, headers });
}
