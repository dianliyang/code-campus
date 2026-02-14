import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/external/courses/[course_code]/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';

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

  it('should return a single course by course_code', async () => {
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
      study_plans: [{ id: 11, course_id: 1 }]
    };

    const mockEq3 = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses/CS-101', {
      headers: { 'x-api-key': 'test-internal-key' }
    });

    const res = await GET(req, { params: { course_code: 'CS-101' } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, max-age=300, stale-while-revalidate=600');
    expect(data).toEqual({
      id: 1,
      university: 'CAU Kiel',
      course_code: 'CS-101',
      title: 'Course 1',
      units: '3',
      credit: 3,
      description: 'desc',
      url: 'https://example.com/course',
      details: { internalId: 'x1' },
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
      created_at: '2026-02-14T00:00:00.000Z',
      topics: ['Computer Science', 'Machine Learning'],
      schedule: [{ id: 11, course_id: 1 }]
    });

    expect(mockFrom).toHaveBeenCalledWith('courses');
    const selectArg = mockSelect.mock.calls[0][0] as string;
    expect(selectArg).toContain('course_fields');
    expect(selectArg).toContain('study_plans');
    expect(selectArg).not.toContain('is_hidden');
    expect(selectArg).not.toContain('is_internal');
    expect(mockEq1).toHaveBeenCalledWith('university', 'CAU Kiel');
    expect(mockEq2).toHaveBeenCalledWith('is_hidden', false);
    expect(mockEq3).toHaveBeenCalledWith('course_code', 'CS-101');
  });

  it('should return 404 when course is not found', async () => {
    const mockEq3 = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses/NOPE-404', {
      headers: { 'x-api-key': 'test-internal-key' }
    });

    const res = await GET(req, { params: Promise.resolve({ course_code: 'NOPE-404' }) });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe('Not found');
  });

  it('should return 304 when x-last-update is up to date', async () => {
    const mockData = {
      id: 1,
      university: 'CAU Kiel',
      course_code: 'CS-101',
      title: 'Course 1',
      created_at: '2026-02-14T12:00:00.000Z',
      details: null,
      course_fields: [],
      study_plans: [{ id: 11, course_id: 1, updated_at: '2026-02-14T12:00:00.000Z', created_at: '2026-02-13T12:00:00.000Z' }]
    };

    const mockEq3 = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses/CS-101', {
      headers: {
        'x-api-key': 'test-internal-key',
        'if-modified-since': 'Sat, 14 Feb 2026 12:00:00 GMT'
      }
    });

    const res = await GET(req, { params: Promise.resolve({ course_code: 'CS-101' }) });
    expect(res.status).toBe(304);
  });

  it('should handle database errors', async () => {
    const mockEq3 = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } });
    const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses/CS-500', {
      headers: { 'x-api-key': 'test-internal-key' }
    });

    const res = await GET(req, { params: Promise.resolve({ course_code: 'CS-500' }) });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Database error');
  });
});
