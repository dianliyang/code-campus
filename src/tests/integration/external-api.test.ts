import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/external/courses/route';
import { NextRequest } from 'next/server';
import { EXTERNAL_API_CACHE_CONTROL } from '@/lib/external-api';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';

function makeMock(resolvedValue: { data: unknown; error: unknown }) {
  const mockNeq = vi.fn().mockResolvedValue(resolvedValue);
  const mockSelect = vi.fn().mockReturnValue({ neq: mockNeq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockFrom, mockSelect, mockNeq };
}

describe('GET /api/external/courses', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.INTERNAL_API_KEY = 'test-internal-key';
  });

  it('should return 401 if x-api-key is missing or incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/external/courses', {
      headers: { 'x-api-key': 'wrong-key' }
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('should query enrolled courses excluding hidden', async () => {
    const mockData = [{
      id: 1,
      title: 'Course 1',
      course_code: 'C1',
      university: 'Uni',
      description: 'desc',
      url: 'url',
      is_hidden: false,
      is_internal: true,
      instructors: ['Prof A'],
      prerequisites: 'Math 101',
      related_urls: ['https://example.com'],
      cross_listed_courses: 'CS-101',
      department: 'CS',
      details: {
        platforms: ['Canvas'],
        logistics: 'Online',
        internalId: 'x1',
      },
      latest_semester: { term: 'Spring', year: 2026 },
      course_fields: [
        { fields: { name: 'Computer Science' } },
        { fields: { name: 'Machine Learning' } },
      ],
      study_plans: [{ id: 11, course_id: 1 }],
      user_courses: [{ status: 'in_progress', progress: 50, gpa: null, score: null, notes: null, priority: 0, updated_at: null }],
      created_at: '2026-02-14T12:00:00Z',
    }];

    const { mockFrom, mockSelect, mockNeq } = makeMock({ data: mockData, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(EXTERNAL_API_CACHE_CONTROL);
    expect(data).toEqual({
      courses: [{
        remoteID: 1,
        name: 'Course 1',
        code: 'C1',
        university: 'Uni',
        units: undefined,
        credit: null,
        desc: 'desc',
        urlString: 'url',
        instructors: ['Prof A'],
        prerequisites: 'Math 101',
        resources: ['https://example.com'],
        subdomain: null,
        platforms: ['Canvas'],
        crossListedCourses: ['CS-101'],
        category: 'Computer Science',
        department: 'CS',
        latestTerm: 'Spring 2026',
        logistics: 'Online',
        level: undefined,
        difficulty: null,
        popularity: null,
        workload: null,
        gpa: null,
        score: null,
        createdAtISO8601: '2026-02-14T12:00:00Z',
        updatedAtISO8601: expect.any(String),
        topics: ['Computer Science', 'Machine Learning'],
        isEnrolled: true,
        isFailed: false,
        retry: 0,
        assignments: [],
      }]
    });

    expect(mockFrom).toHaveBeenCalledWith('courses');
    const selectArg = mockSelect.mock.calls[0][0] as string;
    expect(selectArg).toContain('study_plans');
    expect(selectArg).toContain('course_fields');
    expect(selectArg).toContain('user_courses');
    expect(selectArg).toContain('is_hidden');
    expect(selectArg).toContain('latest_semester');
    expect(mockNeq).toHaveBeenCalledWith('user_courses.status', 'hidden');
  });

  it('should handle database errors', async () => {
    const { mockFrom } = makeMock({ data: null, error: { message: 'DB Error' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Database error');
  });
});
