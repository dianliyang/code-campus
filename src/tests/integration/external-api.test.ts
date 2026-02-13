import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/external/courses/route';
import { NextRequest } from 'next/server';

// Mock createAdminClient
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

// Re-import after mock
import { createAdminClient } from '@/lib/supabase/server';

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

  it('should query Supabase with correct filters', async () => {
    const mockData = [{
      id: 1,
      title: 'Course 1',
      instructors: ['Prof A'],
      prerequisites: 'Math 101',
      related_urls: ['https://example.com'],
      cross_listed_courses: 'CS-101',
      details: {
        schedule: { Lecture: ['Mon 10:00'] },
        internalId: 'x1',
        relatedUrls: ['legacy-url'],
        prerequisites: 'legacy-prereq',
      },
      study_plans: [{ id: 11, course_id: 1 }]
    }];
    
    // Setup deep mock for supabase.from().select().eq().eq()
    const mockEq2 = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses', {
      headers: { 'x-api-key': 'test-internal-key' }
    });
    
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{
      id: 1,
      title: 'Course 1',
      instructors: ['Prof A'],
      prerequisites: 'Math 101',
      related_urls: ['https://example.com'],
      cross_listed_courses: 'CS-101',
      details: { internalId: 'x1' },
      schedule: [{ id: 11, course_id: 1 }]
    }]);

    expect(mockFrom).toHaveBeenCalledWith('courses');
    const selectArg = mockSelect.mock.calls[0][0] as string;
    expect(selectArg).toContain('study_plans');
    expect(selectArg).not.toContain('user_id');
    expect(mockEq1).toHaveBeenCalledWith('university', 'CAU Kiel');
    expect(mockEq2).toHaveBeenCalledWith('is_hidden', false);
  });

  it('should handle database errors', async () => {
    const mockEq2 = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } });
    const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/courses', {
      headers: { 'x-api-key': 'test-internal-key' }
    });
    
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Database error');
  });

});
