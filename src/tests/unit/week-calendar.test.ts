import { describe, expect, test } from "vitest";
import { buildTodayRoutineGroups, getWeekCalendarEventColor, shouldIncludeWeekCalendarRow } from "@/lib/week-calendar";

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

  test("groups same-course assignments under the same-day study plan parent after scheduled children", () => {
    const groups = buildTodayRoutineGroups([
      {
        key: "assignment-child",
        sourceType: "assignment" as const,
        courseId: 1,
        date: "2026-03-08",
        planId: null,
        scheduleId: null,
        assignmentId: 30,
        workoutId: null,
        startTime: "00:00:00",
      },
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
        key: "schedule-child",
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
    expect(groups[0].children.map((item) => item.key)).toEqual(["schedule-child", "assignment-child"]);
  });

  test("keeps assignments standalone when no same-day study plan parent exists", () => {
    const groups = buildTodayRoutineGroups([
      {
        key: "assignment-only",
        sourceType: "assignment" as const,
        courseId: 1,
        date: "2026-03-08",
        planId: null,
        scheduleId: null,
        assignmentId: 30,
        workoutId: null,
        startTime: "00:00:00",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].parent.key).toBe("assignment-only");
    expect(groups[0].children).toEqual([]);
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

  test("keeps course schedule rows standalone when no parent study plan exists", () => {
    const groups = buildTodayRoutineGroups([
      {
        key: "child-only",
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
    expect(groups[0].parent.key).toBe("child-only");
    expect(groups[0].children).toEqual([]);
  });

  test("falls back to a shared group key when a child is missing course id on the same day", () => {
    const groups = buildTodayRoutineGroups([
      {
        key: "child-task",
        sourceType: "study_plan" as const,
        courseId: null,
        groupKey: "6.1060",
        date: "2026-03-08",
        planId: null,
        scheduleId: 20,
        assignmentId: null,
        workoutId: null,
        startTime: "10:00:00",
      },
      {
        key: "child-assignment",
        sourceType: "assignment" as const,
        courseId: null,
        groupKey: "6.1060",
        date: "2026-03-08",
        planId: null,
        scheduleId: null,
        assignmentId: 30,
        workoutId: null,
        startTime: "23:59:59",
      },
      {
        key: "parent",
        sourceType: "study_plan" as const,
        courseId: 42,
        groupKey: "6.1060",
        date: "2026-03-08",
        planId: 10,
        scheduleId: null,
        assignmentId: null,
        workoutId: null,
        startTime: "09:00:00",
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].parent.key).toBe("parent");
    expect(groups[0].children.map((item) => item.key)).toEqual(["child-task", "child-assignment"]);
  });
});

describe("getWeekCalendarEventColor", () => {
  test("returns a stable tint for the same course code", () => {
    expect(getWeekCalendarEventColor("CS 336")).toEqual(getWeekCalendarEventColor("CS 336"));
  });

  test("can differentiate different course codes", () => {
    expect(getWeekCalendarEventColor("CS 336")).not.toEqual(getWeekCalendarEventColor("CS 229"));
  });

  test("avoids collisions for distinct course codes that previously matched", () => {
    expect(getWeekCalendarEventColor("15-113")).not.toEqual(getWeekCalendarEventColor("CS 145"));
  });
});
