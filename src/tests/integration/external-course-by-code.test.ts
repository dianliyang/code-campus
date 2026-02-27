import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/external/courses/[course_code]/route';
import { NextRequest } from 'next/server';
import { EXTERNAL_API_CACHE_CONTROL } from '@/lib/external-api';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';

function makeMock(resolvedValue: { data: unknown; error: unknown }) {
  const mockEq2 = vi.fn().mockResolvedValue(resolvedValue);
  const mockNeq = vi.fn().mockReturnValue({ eq: mockEq2 });
  const mockSelect = vi.fn().mockReturnValue({ neq: mockNeq });
  const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
  return { mockFrom, mockSelect, mockNeq, mockEq2 };
}

describe('GET /api/external/courses/[course_code]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.INTERNAL_API_KEY = 'test-internal-key';
  });

  it('should return 401 if x-api-key is missing or incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/external/courses/CS-101', {
      headers: { 'x-api-key': 'wrong-key' }
    });
    const res = await GET(req, { params: Promise.resolve({ course_code: 'CS-101' }) });
    expect(res.status).toBe(401);
  });

  it('should return a single enrolled course by course_code', async () => {
    const mockData = {
      id: 1,
      university: 'CAU Kiel',
      course_code: 'CS-101',
      title: 'Course 1',
      units: '3',
      credit: 3,
      description: 'desc',
      url: 'https://example.com/course',
      details: {
        schedule: { Lecture: ['Mon 10:00'] },
        internalId: 'x1',
        relatedUrls: ['legacy-url'],
        prerequisites: 'legacy-prereq',
      },
      instructors: ['Prof A'],
      prerequisites: 'Math 101',
      related_urls: ['https://example.com'],
      cross_listed_courses: 'CS-001',
      department: 'CS',
      corequisites: null,
      level: 'undergraduate',
      difficulty: 2,
      popularity: 10,
      workload: 'medium',
      is_hidden: false,
      is_internal: true,
      created_at: '2026-02-14T00:00:00.000Z',
      course_fields: [
        { fields: { name: 'Computer Science' } },
        { fields: { name: 'Machine Learning' } },
      ],
      study_plans: [{ id: 11, course_id: 1 }],
      user_courses: [{ status: 'in_progress', progress: 75, gpa: null, score: null, notes: null, priority: 1, updated_at: null }],
    };

    const { mockFrom, mockSelect, mockNeq, mockEq2 } = makeMock({ data: mockData, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses/CS-101', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req, { params: Promise.resolve({ course_code: 'CS-101' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(EXTERNAL_API_CACHE_CONTROL);
    expect(data).toEqual({
      courses: [{
        remoteID: 1,
        name: 'Course 1',
        code: 'CS-101',
        university: 'CAU Kiel',
        units: '3',
        credit: 3,
        desc: 'desc',
        urlString: 'https://example.com/course',
        instructors: ['Prof A'],
        prerequisites: 'Math 101',
        resources: ['https://example.com'],
        subdomain: null,
        platforms: [],
        crossListedCourses: ['CS-001'],
        category: 'Computer Science',
        department: 'CS',
        latestTerm: null,
        logistics: null,
        level: 'undergraduate',
        difficulty: 2,
        popularity: 10,
        workload: null, // 'medium' is not a number
        gpa: null,
        score: null,
        createdAtISO8601: '2026-02-14T00:00:00.000Z',
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
    expect(selectArg).toContain('course_fields');
    expect(selectArg).toContain('study_plans');
    expect(selectArg).toContain('user_courses');
    expect(selectArg).toContain('is_hidden');
    expect(selectArg).toContain('latest_semester');
    expect(mockNeq).toHaveBeenCalledWith('user_courses.status', 'hidden');
    expect(mockEq2).toHaveBeenCalledWith('course_code', 'CS-101');
  });

  it('should return 404 when course is not found', async () => {
    const { mockFrom } = makeMock({ data: null, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses/NOPE-404', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req, { params: Promise.resolve({ course_code: 'NOPE-404' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Not found');
  });

  it('should handle database errors', async () => {
    const { mockFrom } = makeMock({ data: null, error: { message: 'DB Error' } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses/CS-500', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req, { params: Promise.resolve({ course_code: 'CS-500' }) });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Database error');
  });
});
