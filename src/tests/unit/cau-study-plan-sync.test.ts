import { describe, expect, test } from "vitest";
import type { Course } from "@/lib/scrapers/types";
import {
  buildCauStudyPlanRows,
  resolveSingletonUserId,
  syncCauStudyPlansForCourses,
} from "@/lib/cau-study-plan-sync";

describe("buildCauStudyPlanRows", () => {
  test("converts CAU schedule entries into single-day study plan rows", () => {
    const course: Course = {
      university: "CAU Kiel",
      courseCode: "infEOR-01a",
      title: "Einfuhrung in Operations Research",
      details: {
        scheduleEntries: [
          {
            kind: "Lecture",
            dayOfWeek: 4,
            startTime: "12:15",
            endTime: "13:45",
            startDate: "2026-04-12",
            endDate: "2026-07-12",
            location: "CAP3 - Horsaal 1",
          },
          {
            kind: "Exercise",
            dayOfWeek: 1,
            startTime: "12:15",
            endTime: "13:45",
            startDate: "2026-04-12",
            endDate: "2026-07-12",
            location: "CAP3 - Horsaal 1",
          },
        ],
      },
    };

    expect(buildCauStudyPlanRows({ userId: "user-1", courseId: 42, course })).toEqual([
      {
        user_id: "user-1",
        course_id: 42,
        start_date: "2026-04-12",
        end_date: "2026-07-12",
        days_of_week: [4],
        start_time: "12:15:00",
        end_time: "13:45:00",
        location: "CAP3 - Horsaal 1",
        kind: "Lecture",
        timezone: "Europe/Berlin",
      },
      {
        user_id: "user-1",
        course_id: 42,
        start_date: "2026-04-12",
        end_date: "2026-07-12",
        days_of_week: [1],
        start_time: "12:15:00",
        end_time: "13:45:00",
        location: "CAP3 - Horsaal 1",
        kind: "Exercise",
        timezone: "Europe/Berlin",
      },
    ]);
  });

  test("skips malformed schedule entries", () => {
    const course: Course = {
      university: "CAU Kiel",
      courseCode: "infBad-01a",
      title: "Broken Schedule",
      details: {
        scheduleEntries: [
          {
            kind: "Lecture",
            dayOfWeek: 4,
            startTime: "12:15",
            endTime: "",
            startDate: "2026-04-12",
            endDate: "2026-07-12",
            location: "CAP3 - Horsaal 1",
          },
        ],
      },
    };

    expect(buildCauStudyPlanRows({ userId: "user-1", courseId: 42, course })).toEqual([]);
  });

  test("skips entries with unsupported exclusion rules", () => {
    const course: Course = {
      university: "CAU Kiel",
      courseCode: "infExcluded-01a",
      title: "Excluded Schedule",
      details: {
        scheduleEntries: [
          {
            kind: "Lecture",
            dayOfWeek: 4,
            startTime: "12:15",
            endTime: "13:45",
            startDate: "2026-04-12",
            endDate: "2026-07-12",
            location: "CAP3 - Horsaal 1",
            exclude: "vac",
          },
        ],
      },
    };

    expect(buildCauStudyPlanRows({ userId: "user-1", courseId: 42, course })).toEqual([]);
  });
});

describe("syncCauStudyPlansForCourses", () => {
  test("replaces existing study plans for affected CAU course ids", async () => {
    const deleted: Array<{ userId?: string; courseIds?: number[] }> = [];
    const inserted: unknown[] = [];
    const supabase = {
      from(table: string) {
        if (table !== "study_plans") throw new Error(`Unexpected table: ${table}`);
        return {
          delete() {
            return {
              eq(column: string, value: string) {
                if (column !== "user_id") throw new Error(`Unexpected eq column: ${column}`);
                return {
                  async in(inColumn: string, values: number[]) {
                    if (inColumn !== "course_id") throw new Error(`Unexpected in column: ${inColumn}`);
                    deleted.push({ userId: value, courseIds: values });
                    return { error: null };
                  },
                };
              },
            };
          },
          async insert(rows: unknown[]) {
            inserted.push(...rows);
            return { error: null };
          },
        };
      },
    };

    const course: Course = {
      university: "CAU Kiel",
      courseCode: "infEOR-01a",
      title: "Einfuhrung in Operations Research",
      details: {
        scheduleEntries: [
          {
            kind: "Lecture",
            dayOfWeek: 4,
            startTime: "12:15",
            endTime: "13:45",
            startDate: "2026-04-12",
            endDate: "2026-07-12",
            location: "CAP3 - Horsaal 1",
          },
        ],
      },
    };

    const result = await syncCauStudyPlansForCourses({
      supabase,
      userId: "user-1",
      courses: [course],
      courseCodeToId: new Map([["infEOR-01a", 42]]),
    });

    expect(result).toEqual({ deletedCourseIds: [42], insertedCount: 1 });
    expect(deleted).toEqual([{ userId: "user-1", courseIds: [42] }]);
    expect(inserted).toEqual([
      {
        user_id: "user-1",
        course_id: 42,
        start_date: "2026-04-12",
        end_date: "2026-07-12",
        days_of_week: [4],
        start_time: "12:15:00",
        end_time: "13:45:00",
        location: "CAP3 - Horsaal 1",
        kind: "Lecture",
        timezone: "Europe/Berlin",
      },
    ]);
  });

  test("does not delete plans for courses without fresh usable rows", async () => {
    const deleted: Array<{ userId?: string; courseIds?: number[] }> = [];
    const inserted: unknown[] = [];
    const supabase = {
      from(table: string) {
        if (table !== "study_plans") throw new Error(`Unexpected table: ${table}`);
        return {
          delete() {
            return {
              eq(column: string, value: string) {
                if (column !== "user_id") throw new Error(`Unexpected eq column: ${column}`);
                return {
                  async in(inColumn: string, values: number[]) {
                    if (inColumn !== "course_id") throw new Error(`Unexpected in column: ${inColumn}`);
                    deleted.push({ userId: value, courseIds: values });
                    return { error: null };
                  },
                };
              },
            };
          },
          async insert(rows: unknown[]) {
            inserted.push(...rows);
            return { error: null };
          },
        };
      },
    };

    const course: Course = {
      university: "CAU Kiel",
      courseCode: "infEOR-01a",
      title: "Einfuhrung in Operations Research",
      details: {
        scheduleEntries: [
          {
            kind: "Lecture",
            dayOfWeek: 4,
            startTime: "12:15",
            endTime: "13:45",
            startDate: "2026-04-12",
            endDate: "2026-07-12",
            location: "CAP3 - Horsaal 1",
            exclude: "vac",
          },
        ],
      },
    };

    const result = await syncCauStudyPlansForCourses({
      supabase,
      userId: "user-1",
      courses: [course],
      courseCodeToId: new Map([["infEOR-01a", 42]]),
    });

    expect(result).toEqual({ deletedCourseIds: [], insertedCount: 0 });
    expect(deleted).toEqual([]);
    expect(inserted).toEqual([]);
  });
});

describe("resolveSingletonUserId", () => {
  test("calls listUsers with the admin client context intact", async () => {
    const userId = await resolveSingletonUserId({
      auth: {
        admin: {
          fetch: async () => undefined,
          async listUsers(this: { fetch?: () => Promise<unknown> }) {
            if (typeof this.fetch !== "function") {
              throw new TypeError("Cannot read properties of undefined (reading 'fetch')");
            }
            return { data: { users: [{ id: "user-1" }] }, error: null };
          },
        },
      },
    });

    expect(userId).toBe("user-1");
  });

  test("returns the only user id when exactly one user exists", async () => {
    const userId = await resolveSingletonUserId({
      auth: {
        admin: {
          async listUsers() {
            return { data: { users: [{ id: "user-1" }] }, error: null };
          },
        },
      },
    });

    expect(userId).toBe("user-1");
  });

  test("returns null when there is not exactly one user", async () => {
    const userId = await resolveSingletonUserId({
      auth: {
        admin: {
          async listUsers() {
            return { data: { users: [{ id: "user-1" }, { id: "user-2" }] }, error: null };
          },
        },
      },
    });

    expect(userId).toBeNull();
  });
});
