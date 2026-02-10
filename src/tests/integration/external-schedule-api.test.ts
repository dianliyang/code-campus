import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/external/schedule/route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';

describe('GET /api/external/schedule', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.INTERNAL_API_KEY = 'test-internal-key';
  });

  it('should return 401 if x-api-key is missing or incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/external/schedule', {
      headers: { 'x-api-key': 'wrong-key' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('should query study_plans by course_id and return schedule rows', async () => {
    const mockData = [{ id: 1, course_id: 10 }];

    const mockEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/schedule?course_id=10', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ course_id: 10, schedule: mockData });
    expect(mockFrom).toHaveBeenCalledWith('study_plans');
    expect(mockEq).toHaveBeenCalledWith('course_id', 10);
  });

  it('should handle database errors', async () => {
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createAdminClient as any).mockReturnValue({ from: mockFrom });

    const req = new NextRequest('http://localhost:3000/api/external/schedule?course_id=10', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe('Database error');
  });

  it('should return 400 when course_id is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/external/schedule', {
      headers: { 'x-api-key': 'test-internal-key' },
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('course_id is required');
  });
});
