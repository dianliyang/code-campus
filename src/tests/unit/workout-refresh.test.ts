import { describe, expect, test } from "vitest";
import { partitionStaleWorkoutIds } from "@/lib/workout-refresh";

describe("partitionStaleWorkoutIds", () => {
  test("preserves stale workouts referenced by enrollment or attendance", () => {
    const result = partitionStaleWorkoutIds([11, 12, 13], [12, 13]);

    expect(result).toEqual({
      deletableIds: [11],
      preservedIds: [12, 13],
    });
  });

  test("deletes all stale workouts when none are user-linked", () => {
    const result = partitionStaleWorkoutIds([21, 22], []);

    expect(result).toEqual({
      deletableIds: [21, 22],
      preservedIds: [],
    });
  });
});
