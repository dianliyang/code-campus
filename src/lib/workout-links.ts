import type { Workout } from "@/types";

export function getWorkoutDurationUrl(workout: Workout): string | null {
  const rawDetails = workout.details as Record<string, unknown> | null;
  const durationUrl = rawDetails?.durationUrl;
  return typeof durationUrl === "string" && durationUrl.length > 0 ? durationUrl : null;
}
