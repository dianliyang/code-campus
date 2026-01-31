import { expect, test, describe, vi } from 'vitest'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => Promise.resolve({ data: [{ id: 1, name: 'Test' }], error: null })),
  })),
}

describe('Integration Tests', () => {
  test('mocks supabase call', async () => {
    const { data, error } = await mockSupabase.from('test').select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].name).toBe('Test')
  })
})
