import { describe, expect, test } from "vitest";
import type { Workout } from "@/types";
import { getWorkoutDurationUrl } from "@/lib/workout-links";

function createWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 1,
    source: "CAU Kiel Sportzentrum",
    courseCode: "SP-001",
    category: "Swimming",
    categoryEn: "Swimming",
    title: "Swimming",
    titleEn: "Swimming",
    dayOfWeek: "Mon",
    startTime: "10:00:00",
    endTime: "11:00:00",
    location: "Pool",
    locationEn: "Pool",
    instructor: null,
    startDate: "2025-10-06",
    endDate: "2026-03-30",
    priceStudent: 10,
    priceStaff: 12,
    priceExternal: null,
    priceExternalReduced: null,
    bookingStatus: "available",
    bookingUrl: null,
    url: null,
    semester: "Winter 2025/26",
    details: null,
    ...overrides,
  };
}

describe("getWorkoutDurationUrl", () => {
  test("returns the duration detail url when present", () => {
    const workout = createWorkout({
      details: { durationUrl: "https://example.com/duration" },
    });

    expect(getWorkoutDurationUrl(workout)).toBe("https://example.com/duration");
  });

  test("returns null when no duration detail url exists", () => {
    expect(getWorkoutDurationUrl(createWorkout())).toBeNull();
  });
});
