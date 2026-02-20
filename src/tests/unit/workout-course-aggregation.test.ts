import { describe, expect, test } from "vitest";
import type { WorkoutCourse } from "@/lib/scrapers/cau-sport";
import { aggregateWorkoutCoursesByName } from "@/lib/workouts";

function createWorkoutCourse(overrides: Partial<WorkoutCourse>): WorkoutCourse {
  return {
    source: "CAU Kiel Sportzentrum",
    courseCode: "SP-100",
    category: "Fitness",
    categoryEn: "Fitness",
    title: "Yoga Basics",
    titleEn: "Yoga Basics",
    dayOfWeek: "Mon",
    startTime: "10:00",
    endTime: "11:00",
    location: "Hall A",
    locationEn: "Hall A",
    instructor: "Coach",
    startDate: "27.10.",
    endDate: "27.01.",
    priceStudent: 10,
    priceStaff: 15,
    priceExternal: 20,
    priceExternalReduced: null,
    bookingStatus: "available",
    bookingUrl: "https://example.com/book",
    url: "https://example.com/course",
    semester: "WiSe 25/26",
    details: {},
    ...overrides,
  };
}

describe("aggregateWorkoutCoursesByName", () => {
  test("aggregates same-name workouts for DB persistence", () => {
    const input: WorkoutCourse[] = [
      createWorkoutCourse({
        courseCode: "SP-100-A",
        dayOfWeek: "Mon",
        startTime: "10:00",
        endTime: "11:00",
        location: "Hall A",
        locationEn: "Hall A",
      }),
      createWorkoutCourse({
        courseCode: "SP-100-B",
        dayOfWeek: "Wed",
        startTime: "18:00",
        endTime: "19:00",
        location: "Hall B",
        locationEn: "Hall B",
      }),
    ];

    const output = aggregateWorkoutCoursesByName(input);

    expect(output).toHaveLength(1);
    expect(output[0].courseCode).toBe("SP-100-A");
    expect(output[0].details).toMatchObject({
      aggregatedVariants: 2,
      aggregatedEntries: [
        { schedule: "Mon 10:00-11:00", duration: "27.10. - 27.01.", location: "Hall A", locationEn: "Hall A" },
        { schedule: "Wed 18:00-19:00", duration: "27.10. - 27.01.", location: "Hall B", locationEn: "Hall B" },
      ],
    });
  });

  test("does not merge different workout names", () => {
    const input: WorkoutCourse[] = [
      createWorkoutCourse({ title: "Yoga", titleEn: "Yoga", courseCode: "SP-1" }),
      createWorkoutCourse({ title: "Pilates", titleEn: "Pilates", courseCode: "SP-2" }),
    ];

    const output = aggregateWorkoutCoursesByName(input);
    expect(output).toHaveLength(2);
  });
});
