import { describe, expect, test } from "vitest";
import { buildCourseDetailCalendar } from "@/lib/course-detail-calendar";

describe("buildCourseDetailCalendar", () => {
  test("does not include recurring generated study plan sessions when there are no scheduled tasks", () => {
    const result = buildCourseDetailCalendar({
      courseTitle: "Fundamentals of Programming",
      assignments: [],
      scheduleItems: [],
      studyPlans: [
        {
          id: 10,
          startDate: "2026-03-05",
          endDate: "2026-03-05",
          daysOfWeek: [4],
          startTime: "09:00",
          endTime: "11:00",
          location: "Library",
          kind: "Self-Study",
        },
      ],
    });

    expect(result.range).toBeNull();
    expect(result.eventsByDate.get("2026-03-05")).toBeUndefined();
  });

  test("keeps scheduled task duration and infers a concrete kind from the task text", () => {
    const result = buildCourseDetailCalendar({
      courseTitle: "Fundamentals of Programming",
      assignments: [],
      scheduleItems: [
        {
          date: "2026-03-10",
          title: "Read cache notes",
          kind: null,
          focus: "Caching",
          durationMinutes: 45,
        },
      ],
      studyPlans: [],
    });

    expect(result.eventsByDate.get("2026-03-10")).toEqual([
      {
        label: "Read cache notes",
        meta: "reading · 45m",
        kind: "reading",
        badgeLabel: "reading",
        timeLabel: "45m",
      },
    ]);
  });
});
