import { describe, it, expect } from 'vitest';
import {
  EXTERNAL_API_CACHE_CONTROL,
  parseTimestamp,
  courseLastUpdatedAt,
  transformExternalCourse,
  buildCachingHeaders,
  checkNotModified,
  notModifiedResponse,
} from '@/lib/external-api';

describe('external-api utils', () => {
  it('exports the canonical cache-control string', () => {
    expect(EXTERNAL_API_CACHE_CONTROL).toBe('private, max-age=3600, stale-while-revalidate=600');
  });

  it('parseTimestamp returns null for empty string', () => {
    expect(parseTimestamp('')).toBeNull();
  });

  it('parseTimestamp parses ISO strings', () => {
    expect(parseTimestamp('2026-02-14T12:00:00.000Z')).toBe(Date.parse('2026-02-14T12:00:00.000Z'));
  });

  it('courseLastUpdatedAt returns max of course and plan timestamps', () => {
    const course = {
      created_at: '2026-02-13T00:00:00.000Z',
      study_plans: [
        { updated_at: '2026-02-14T00:00:00.000Z', created_at: '2026-02-12T00:00:00.000Z' },
      ],
    };
    const ms = courseLastUpdatedAt(course as Record<string, unknown>);
    expect(ms).toBe(Date.parse('2026-02-14T00:00:00.000Z'));
  });

  it('buildCachingHeaders returns Cache-Control and Last-Modified', () => {
    const ts = Date.parse('2026-02-14T12:00:00.000Z');
    const headers = buildCachingHeaders(ts);
    expect(headers['Cache-Control']).toBe(EXTERNAL_API_CACHE_CONTROL);
    expect(headers['Last-Modified']).toBe(new Date(ts).toUTCString());
  });

  it('buildCachingHeaders omits Last-Modified when null', () => {
    const headers = buildCachingHeaders(null);
    expect(headers['Cache-Control']).toBe(EXTERNAL_API_CACHE_CONTROL);
    expect(headers['Last-Modified']).toBeUndefined();
  });

  it('checkNotModified returns true when client is up-to-date', () => {
    const lastMs = Date.parse('2026-02-14T12:00:00.000Z');
    expect(checkNotModified('Sat, 14 Feb 2026 12:00:00 GMT', lastMs)).toBe(true);
  });

  it('checkNotModified returns false when data is newer', () => {
    const lastMs = Date.parse('2026-02-14T12:00:01.000Z');
    expect(checkNotModified('Sat, 14 Feb 2026 12:00:00 GMT', lastMs)).toBe(false);
  });

  it('checkNotModified returns false when header is missing', () => {
    expect(checkNotModified(null, 1739534400000)).toBe(false);
  });

  it('transformExternalCourse strips is_hidden, is_internal, and private details keys', () => {
    const raw = {
      id: 1,
      title: 'Test',
      is_hidden: false,
      is_internal: true,
      details: {
        schedule: { Lecture: ['Mon'] },
        internalId: 'x',
        relatedUrls: [],
        prerequisites: 'none',
        crossListedCourses: [],
        instructors: [],
      },
      course_fields: [{ fields: { name: 'CS' } }],
      study_plans: [{ id: 11 }],
      user_courses: [{ status: 'active' }],
    };
    const result = transformExternalCourse(raw as Record<string, unknown>);
    expect(result.is_hidden).toBeUndefined();
    expect(result.is_internal).toBeUndefined();
    expect((result.details as Record<string, unknown>).internalId).toBe('x');
    expect((result.details as Record<string, unknown>).schedule).toBeUndefined();
    expect(result.topics).toEqual(['CS']);
    expect(result.schedule).toEqual([{ id: 11 }]);
    expect(result.enrollment).toEqual({ status: 'active' });
  });

  it('notModifiedResponse returns a 304 NextResponse with the given headers', () => {
    const headers = { 'Cache-Control': 'private, max-age=3600', 'Last-Modified': 'Sat, 14 Feb 2026 12:00:00 GMT' };
    const res = notModifiedResponse(headers);
    expect(res.status).toBe(304);
    expect(res.headers.get('Cache-Control')).toBe(headers['Cache-Control']);
    expect(res.headers.get('Last-Modified')).toBe(headers['Last-Modified']);
  });
});
