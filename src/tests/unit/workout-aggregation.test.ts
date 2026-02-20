import { describe, expect, test } from "vitest";
import type { Workout } from "@/types";
import { aggregateWorkoutsByName } from "@/lib/workouts";

function createWorkout(overrides: Partial<Workout>): Workout {
  return {
    id: 1,
    source: "CAU Kiel Sportzentrum",
    courseCode: "SP-001",
    category: "Fitness",
    categoryEn: "Fitness",
    title: "Yoga",
    titleEn: "Yoga",
    dayOfWeek: "Mon",
    startTime: "10:00:00",
    endTime: "11:00:00",
    location: "Hall A",
    locationEn: "Hall A",
    instructor: null,
    startDate: null,
    endDate: null,
    priceStudent: 10,
    priceStaff: null,
    priceExternal: null,
    priceExternalReduced: null,
    bookingStatus: "available",
    bookingUrl: null,
    url: null,
    semester: "Winter 2025",
    details: null,
    ...overrides,
  };
}

describe("aggregateWorkoutsByName", () => {
  test("aggregates workouts with same title and keeps all schedules and locations", () => {
    const input: Workout[] = [
      createWorkout({ id: 1, dayOfWeek: "Mon", startTime: "10:00:00", endTime: "11:00:00", location: "Hall A" }),
      createWorkout({ id: 2, dayOfWeek: "Wed", startTime: "18:00:00", endTime: "19:00:00", location: "Hall B", locationEn: "Hall B" }),
    ];

    const output = aggregateWorkoutsByName(input);

    expect(output).toHaveLength(1);
    expect(output[0].dayOfWeek).toBe("Mon");
    expect(output[0].startTime).toBe("10:00:00");
    expect(output[0].endTime).toBe("11:00:00");
    expect(output[0].location).toBe("Hall A");
    expect(output[0].details).toMatchObject({
      aggregatedVariants: 2,
      aggregatedEntries: [
        { schedule: "Mon 10:00-11:00", location: "Hall A", locationEn: "Hall A" },
        { schedule: "Wed 18:00-19:00", location: "Hall B", locationEn: "Hall B" },
      ],
    });
  });

  test("does not merge workouts with different titles", () => {
    const input: Workout[] = [
      createWorkout({ id: 1, title: "Yoga", titleEn: "Yoga" }),
      createWorkout({ id: 2, title: "Pilates", titleEn: "Pilates" }),
    ];

    const output = aggregateWorkoutsByName(input);

    expect(output).toHaveLength(2);
    expect(output[0].startTime).toBe("10:00:00");
    expect(output[1].title).toBe("Pilates");
  });
});
