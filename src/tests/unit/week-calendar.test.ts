import { describe, expect, test } from "vitest";
import { buildTodayRoutineGroups, shouldIncludeWeekCalendarRow } from "@/lib/week-calendar";

describe("shouldIncludeWeekCalendarRow", () => {
  test("includes recurring study plans", () => {
    expect(
      shouldIncludeWeekCalendarRow({
        source_type: "study_plan",
        plan_id: 1,
        schedule_id: null,
        assignment_id: null,
        workout_id: null,
      }),
    ).toBe(true);
  });

  test("includes workouts", () => {
    expect(
      shouldIncludeWeekCalendarRow({
        source_type: "workout",
        plan_id: null,
        schedule_id: null,
        assignment_id: null,
        workout_id: 9,
      }),
    ).toBe(true);
  });

  test("excludes course schedule task rows", () => {
    expect(
      shouldIncludeWeekCalendarRow({
        source_type: "study_plan",
        plan_id: null,
        schedule_id: 22,
        assignment_id: null,
        workout_id: null,
      }),
    ).toBe(false);
  });

  test("excludes assignment deadline rows", () => {
    expect(
      shouldIncludeWeekCalendarRow({
        source_type: "study_plan",
        plan_id: null,
        schedule_id: null,
        assignment_id: 33,
        workout_id: null,
      }),
    ).toBe(false);
  });
});

describe("buildTodayRoutineGroups", () => {
  test("groups course schedules under the same-day study plan parent", () => {
    const groups = buildTodayRoutineGroups([
      {
        key: "parent",
        sourceType: "study_plan" as const,
        courseId: 1,
        date: "2026-03-08",
        planId: 10,
        scheduleId: null,
        assignmentId: null,
        workoutId: null,
        startTime: "09:00:00",
      },
      {
        key: "child",
        sourceType: "study_plan" as const,
        courseId: 1,
        date: "2026-03-08",
        planId: null,
        scheduleId: 20,
        assignmentId: null,
        workoutId: null,
        startTime: "10:00:00",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].parent.key).toBe("parent");
    expect(groups[0].children.map((item) => item.key)).toEqual(["child"]);
  });

  test("keeps workouts as standalone groups", () => {
    const groups = buildTodayRoutineGroups([
      {
        key: "workout",
        sourceType: "workout" as const,
        courseId: null,
        date: "2026-03-08",
        planId: null,
        scheduleId: null,
        assignmentId: null,
        workoutId: 99,
        startTime: "18:00:00",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].parent.key).toBe("workout");
    expect(groups[0].children).toEqual([]);
  });
});
