import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Course as ScrapedCourse } from "@/lib/scrapers/types";

const mockCreateSupabaseClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateSupabaseClient,
}));

describe("CAU saveCourses latest semester refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCreateSupabaseClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  test("updates latest_semester, credit, and is_internal for existing CAU rows during non-force schedule refresh", async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const fakeSupabase = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        },
      },
      from: vi.fn((table: string) => {
        if (table === "courses") {
          return {
            select: vi.fn((query: string) => {
              if (query === "id, course_code, details, credit, latest_semester, is_internal") {
                return {
                  eq: vi.fn(() => ({
                    in: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 42,
                          course_code: "infMobRob-01a",
                          credit: null,
                          latest_semester: { term: "Winter", year: 2026 },
                          is_internal: null,
                          details: { schedule: { Lecture: ["old"] } },
                        },
                      ],
                      error: null,
                    }),
                  })),
                };
              }

              if (query === "id, course_code") {
                return {
                  eq: vi.fn(() => ({
                    in: vi.fn().mockResolvedValue({
                      data: [{ id: 42, course_code: "infMobRob-01a" }],
                      error: null,
                    }),
                  })),
                };
              }

              if (query === "course_code, latest_semester, description") {
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        course_code: "infMobRob-01a",
                        latest_semester: { term: "Winter", year: 2026 },
                        description: "Existing description",
                      },
                    ],
                    error: null,
                  }),
                };
              }

              throw new Error(`Unexpected courses.select query: ${query}`);
            }),
            update: updateMock,
          };
        }

        if (table === "semesters") {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 7, term: "Winter", year: 2025 }],
                error: null,
              }),
            })),
          };
        }

        if (table === "course_semesters") {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === "study_plans") {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mockCreateSupabaseClient.mockReturnValue(fakeSupabase);

    const { SupabaseDatabase } = await import("@/lib/supabase/server");
    const db = new SupabaseDatabase();
    const course: ScrapedCourse = {
      university: "CAU Kiel",
      courseCode: "infMobRob-01a",
      title: "Mobile Robotics",
      credit: 8,
      semesters: [{ term: "Winter", year: 2025 }],
      details: {
        schedule: { Lecture: ["Wednesday 10:15-11:45"] },
        scheduleEntries: [
          {
            kind: "Lecture",
            dayOfWeek: 3,
            startTime: "10:15",
            endTime: "11:45",
            startDate: "2025-10-13",
            endDate: "2026-02-06",
            location: "CAP 4",
          },
        ],
      },
    };

    await db.saveCourses([course]);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latest_semester: { term: "Winter", year: 2025 },
        credit: 8,
        is_internal: true,
      }),
    );
  });

  test("keeps CAU force updates internal when upserting course rows", async () => {
    const courseUpsertMock = vi.fn().mockResolvedValue({ error: null });

    const fakeSupabase = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: [] }, error: null }),
        },
      },
      from: vi.fn((table: string) => {
        if (table === "courses") {
          return {
            select: vi.fn((query: string) => {
              if (query === "course_code, description, resources, details") {
                return {
                  eq: vi.fn(() => ({
                    in: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  })),
                };
              }

              if (query === "id, course_code") {
                return {
                  eq: vi.fn(() => ({
                    in: vi.fn().mockResolvedValue({
                      data: [{ id: 88, course_code: "infKDDM-01a" }],
                      error: null,
                    }),
                  })),
                };
              }

              throw new Error(`Unexpected courses.select query: ${query}`);
            }),
            upsert: courseUpsertMock,
          };
        }

        if (table === "semesters") {
          return {
            upsert: vi.fn(() => ({
              select: vi.fn().mockResolvedValue({
                data: [{ id: 7, term: "Winter", year: 2025 }],
                error: null,
              }),
            })),
          };
        }

        if (table === "course_semesters") {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        if (table === "study_plans") {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    mockCreateSupabaseClient.mockReturnValue(fakeSupabase);

    const { SupabaseDatabase } = await import("@/lib/supabase/server");
    const db = new SupabaseDatabase();
    const course: ScrapedCourse = {
      university: "CAU Kiel",
      courseCode: "infKDDM-01a",
      title: "Knowledge Discovery and Data Mining",
      semesters: [{ term: "Winter", year: 2025 }],
      details: {},
    };

    await db.saveCourses([course], { forceUpdate: true });

    expect(courseUpsertMock).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          course_code: "infKDDM-01a",
          is_internal: true,
        }),
      ],
      { onConflict: "university,course_code" },
    );
  });

});
