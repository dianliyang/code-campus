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

  it('transformExternalCourse strips is_hidden, is_internal, and private details keys', () => {
    const course = {
      id: 1,
      title: 'Test',
      is_hidden: false,
      is_internal: true,
      private_details: {},
      study_plans: [],
      other: 'keep',
    };
    const result = transformExternalCourse(course);
    expect(result.is_hidden).toBeUndefined();
    expect(result.is_internal).toBeUndefined();
    expect(result.private_details).toBeUndefined();
    expect(result.study_plans).toBeUndefined();
    expect(result.other).toBe('keep');
    expect(result.assignments).toEqual([]);
  });
});
