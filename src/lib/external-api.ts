import { NextResponse } from 'next/server';

export const EXTERNAL_API_CACHE_CONTROL =
  'private, max-age=3600, stale-while-revalidate=600';

export function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

export function courseLastUpdatedAt(course: Record<string, unknown>): number | null {
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

export function buildCachingHeaders(
  lastUpdatedMs: number | null
): Record<string, string> {
  return {
    'Cache-Control': EXTERNAL_API_CACHE_CONTROL,
    ...(lastUpdatedMs !== null
      ? { 'Last-Modified': new Date(lastUpdatedMs).toUTCString() }
      : {}),
  };
}

/** Returns true when the client already has the current version. */
export function checkNotModified(
  ifModifiedSinceHeader: string | null,
  lastUpdatedMs: number | null
): boolean {
  if (!ifModifiedSinceHeader || lastUpdatedMs === null) return false;
  const clientTime = Date.parse(ifModifiedSinceHeader);
  if (Number.isNaN(clientTime)) return false;
  return clientTime >= lastUpdatedMs;
}

export function transformExternalCourse(course: Record<string, unknown>): Record<string, unknown> {
  const {
    course_fields,
    user_courses,
    latest_semester,
    related_urls,
    ...courseFields
  } = course as {
    course_fields: Array<{ fields?: { name?: string } }>;
    user_courses: Array<Record<string, unknown>>;
    latest_semester: { term?: string; year?: number } | null;
    related_urls: string[];
    [key: string]: unknown;
  };

  const enrollment =
    Array.isArray(user_courses) && user_courses.length > 0 ? user_courses[0] : null;

  const topics = Array.isArray(course_fields)
    ? course_fields
        .map((item) => item?.fields?.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    : [];

  const rawDetails = courseFields.details;
  const details =
    rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)
      ? (rawDetails as Record<string, unknown>)
      : {};

  const parseNumber = (val: unknown): number | null => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const latestTerm = latest_semester
    ? `${latest_semester.term || ''} ${latest_semester.year || ''}`.trim()
    : null;

  const crossListedCourses = courseFields.cross_listed_courses
    ? String(courseFields.cross_listed_courses)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    remoteID: courseFields.id,
    name: courseFields.title,
    code: courseFields.course_code,
    university: courseFields.university,
    units: courseFields.units ? String(courseFields.units) : null,
    credit: parseNumber(courseFields.credit),
    desc: courseFields.description,
    urlString: courseFields.url,
    instructors: Array.isArray(courseFields.instructors) ? courseFields.instructors : [],
    prerequisites: courseFields.prerequisites,
    resources: Array.isArray(related_urls) ? related_urls : [],
    platforms: Array.isArray(details.platforms) ? details.platforms : [],
    crossListedCourses,
    category: topics[0] || courseFields.department || null,
    department: courseFields.department,
    latestTerm,
    logistics: details.logistics || null,
    level: courseFields.level,
    difficulty: parseNumber(courseFields.difficulty),
    popularity: parseNumber(courseFields.popularity),
    workload: parseNumber(courseFields.workload),
    gpa: enrollment ? parseNumber(enrollment.gpa) : null,
    score: enrollment ? parseNumber(enrollment.score) : null,
    createdAtISO8601: courseFields.created_at,
    updatedAtISO8601: new Date(courseLastUpdatedAt(course) || Date.now()).toISOString(),
    topic: topics[0] || null,
    isEnrolled: true,
    isFailed: enrollment?.status === 'failed',
    retry: 0,
    assignments: [],
  };
}

/** Build a 304 Not Modified response with caching headers. */
export function notModifiedResponse(headers: Record<string, string>): NextResponse {
  return new NextResponse(null, { status: 304, headers });
}
