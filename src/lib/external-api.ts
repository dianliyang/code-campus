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
  const { study_plans, course_fields, user_courses, ...courseFields } = course as {
    study_plans: unknown[];
    course_fields: Array<{ fields?: { name?: string } }>;
    user_courses: unknown[];
    [key: string]: unknown;
  };

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

  const enrollment =
    Array.isArray(user_courses) && user_courses.length > 0 ? user_courses[0] : null;

  return {
    ...publicCourseFields,
    details,
    topics,
    schedule: study_plans ?? [],
    enrollment,
  };
}

/** Build a 304 Not Modified response with caching headers. */
export function notModifiedResponse(headers: Record<string, string>): NextResponse {
  return new NextResponse(null, { status: 304, headers });
}
