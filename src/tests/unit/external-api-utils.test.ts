import { describe, it, expect } from 'vitest';
import {
  EXTERNAL_API_CACHE_CONTROL,
  transformExternalCourse,
  buildCachingHeaders,
} from '@/lib/external-api';

describe('external-api utils', () => {
  it('exports the canonical cache-control string', () => {
    expect(EXTERNAL_API_CACHE_CONTROL).toBe('no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  });

  it('buildCachingHeaders returns Cache-Control', () => {
    const headers = buildCachingHeaders();
    expect(headers['Cache-Control']).toBe(EXTERNAL_API_CACHE_CONTROL);
    expect(headers['Last-Modified']).toBeUndefined();
  });

  it('transformExternalCourse strips internal fields and returns only public schema', () => {
    const course = {
      id: 1,
      title: 'Test',
      is_hidden: false,
      is_internal: true,
      private_details: {},
      study_plans: [],
    };
    const result = transformExternalCourse(course);
    expect((result as Record<string, unknown>).is_hidden).toBeUndefined();
    expect((result as Record<string, unknown>).is_internal).toBeUndefined();
    expect((result as Record<string, unknown>).private_details).toBeUndefined();
    expect((result as Record<string, unknown>).study_plans).toBeUndefined();
    expect(result.assignments).toEqual([]);
    expect(result.schedules).toEqual([]);
  });
});
