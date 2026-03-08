import { describe, expect, test } from "vitest";
import { buildOverviewRoutineItems, buildWeeklyActivity } from "@/lib/overview-routine";

describe("buildOverviewRoutineItems", () => {
  test("merges study plans, workouts, and assignments into a sorted daily routine", () => {
    const items = buildOverviewRoutineItems([
      {
        event_date: "2026-03-10",
        course_id: 1,
        title: "Deep Learning",
        course_code: "CS 230",
        university: "Stanford",
        kind: "lecture",
        start_time: "09:00:00",
        end_time: "11:00:00",
        location: "Room 101",
        is_completed: true,
        plan_id: 10,
        schedule_id: null,
        assignment_id: null,
        workout_id: null,
        source_type: "study_plan",
      },
      {
        event_date: "2026-03-10",
        course_id: null,
        title: "Campus Run",
        course_code: "Cardio",
        university: "Uni Sport",
        kind: "workout",
        start_time: "18:00:00",
        end_time: "19:00:00",
        location: "Track",
        is_completed: false,
        plan_id: null,
        schedule_id: null,
        assignment_id: null,
        workout_id: 7,
        source_type: "workout",
      },
      {
        event_date: "2026-03-10",
        course_id: 1,
        title: "Assignment 2",
        course_code: "CS 230",
        university: "Stanford",
        kind: "assignment",
        start_time: null,
        end_time: null,
        location: null,
        is_completed: false,
        plan_id: null,
        schedule_id: null,
        assignment_id: 3,
        workout_id: null,
        source_type: "assignment",
      },
    ]);

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.sourceType)).toEqual(["study_plan", "workout", "assignment"]);
    expect(items[0]).toMatchObject({
      title: "Deep Learning",
      statusLabel: "Completed",
      location: "Room 101",
    });
    expect(items[1]).toMatchObject({
      title: "Campus Run",
      statusLabel: "Mark attended",
      meta: "Cardio · Uni Sport",
    });
    expect(items[2]).toMatchObject({
      title: "Assignment 2",
      timeLabel: "Due today",
      action: {
        type: "toggle_complete",
        planId: null,
        date: "2026-03-10",
        assignmentId: 3,
      },
    });
  });
});

describe("buildWeeklyActivity", () => {
  test("bins updates into six weekly buckets from oldest to newest", () => {
    const now = new Date("2026-03-06T12:00:00.000Z").getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const realNow = Date.now;
    Date.now = () => now;

    const weeks = buildWeeklyActivity([
      new Date(now - dayMs).toISOString(),
      new Date(now - 8 * dayMs).toISOString(),
      new Date(now - 8 * dayMs).toISOString(),
      new Date(now - 20 * dayMs).toISOString(),
      new Date(now - 39 * dayMs).toISOString(),
    ]);

    Date.now = realNow;

    expect(weeks).toEqual([1, 0, 0, 1, 2, 1]);
  });
});
