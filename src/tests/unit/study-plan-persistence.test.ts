import { describe, expect, test } from "vitest";
import { expandStudyPlanDays, normalizeStudyPlanDays } from "@/lib/study-plan-persistence";

describe("normalizeStudyPlanDays", () => {
  test("sorts and dedupes weekday values", () => {
    expect(normalizeStudyPlanDays([3, 1, 3, 5])).toEqual([1, 3, 5]);
  });
});

describe("expandStudyPlanDays", () => {
  test("fans one multi-day plan into one row per weekday", () => {
    expect(
      expandStudyPlanDays({
        user_id: "u1",
        course_id: 9,
        start_date: "2026-03-01",
        end_date: "2026-04-01",
        days_of_week: [1, 3, 5],
        start_time: "10:00:00",
        end_time: "12:00:00",
        location: "Library",
        kind: "reading",
        timezone: "UTC",
      }),
    ).toEqual([
      {
        user_id: "u1",
        course_id: 9,
        start_date: "2026-03-01",
        end_date: "2026-04-01",
        days_of_week: [1],
        start_time: "10:00:00",
        end_time: "12:00:00",
        location: "Library",
        kind: "reading",
        timezone: "UTC",
      },
      {
        user_id: "u1",
        course_id: 9,
        start_date: "2026-03-01",
        end_date: "2026-04-01",
        days_of_week: [3],
        start_time: "10:00:00",
        end_time: "12:00:00",
        location: "Library",
        kind: "reading",
        timezone: "UTC",
      },
      {
        user_id: "u1",
        course_id: 9,
        start_date: "2026-03-01",
        end_date: "2026-04-01",
        days_of_week: [5],
        start_time: "10:00:00",
        end_time: "12:00:00",
        location: "Library",
        kind: "reading",
        timezone: "UTC",
      },
    ]);
  });

  test("dedupes repeated weekday values before expansion", () => {
    expect(
      expandStudyPlanDays({
        user_id: "u1",
        course_id: 9,
        start_date: "2026-03-01",
        end_date: "2026-04-01",
        days_of_week: [2, 2, 4],
        start_time: "10:00:00",
        end_time: "12:00:00",
        location: "Library",
        kind: "reading",
        timezone: "UTC",
      }).map((row) => row.days_of_week),
    ).toEqual([[2], [4]]);
  });
});
