import { describe, expect, test } from "vitest";
import { buildOverviewRoutineItems, buildWeeklyActivity } from "@/lib/overview-routine";

describe("buildOverviewRoutineItems", () => {
  test("merges study plans, workouts, and assignments into a sorted daily routine", () => {
    const items = buildOverviewRoutineItems({
      date: "2026-03-10",
      plans: [
        {
          id: 10,
          course_id: 1,
          start_date: "2026-03-01",
          end_date: "2026-03-31",
          days_of_week: [2],
          start_time: "09:00:00",
          end_time: "11:00:00",
          kind: "lecture",
          location: "Room 101",
          courses: { title: "Deep Learning", course_code: "CS 230", university: "Stanford" },
        },
      ],
      logs: [{ plan_id: 10, log_date: "2026-03-10", is_completed: true }],
      workouts: [
        {
          id: 7,
          title: "Campus Run",
          category: "Cardio",
          source: "Uni Sport",
          day_of_week: "Tuesday",
          start_date: "2026-03-01",
          end_date: "2026-03-31",
          start_time: "18:00:00",
          end_time: "19:00:00",
          location: "Track",
        },
      ],
      workoutLogs: [{ workout_id: 7, log_date: "2026-03-10", is_attended: false }],
      assignments: [
        {
          id: 3,
          course_id: 1,
          label: "Assignment 2",
          kind: "assignment",
          due_on: "2026-03-10",
          url: null,
          courses: { title: "Deep Learning", course_code: "CS 230", university: "Stanford" },
        },
      ],
    });

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
      action: null,
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
