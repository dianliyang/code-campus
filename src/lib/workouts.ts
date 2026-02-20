import { Workout } from "@/types";
import type { WorkoutCourse } from "@/lib/scrapers/cau-sport";

interface WorkoutVariantEntry {
  schedule: string | null;
  duration: string | null;
  location: string | null;
  locationEn: string | null;
}

interface WorkoutCourseVariantEntry {
  schedule: string | null;
  duration: string | null;
  location: string | null;
  locationEn: string | null;
}

function normalizeTitle(workout: Workout): string {
  return (workout.titleEn || workout.title || "").trim().toLowerCase();
}

function toScheduleLabel(workout: Workout): string | null {
  const day = workout.dayOfWeek?.trim();
  const start = workout.startTime?.slice(0, 5);
  const end = workout.endTime?.slice(0, 5);

  if (day && start) return `${day} ${start}${end ? `-${end}` : ""}`;
  if (day) return day;
  if (start) return `${start}${end ? `-${end}` : ""}`;
  return null;
}

function createVariantEntry(workout: Workout): WorkoutVariantEntry {
  const duration = typeof workout.details?.duration === "string"
    ? workout.details.duration
    : (workout.startDate && workout.endDate ? `${workout.startDate} - ${workout.endDate}` : null);

  return {
    schedule: toScheduleLabel(workout),
    duration,
    location: workout.location,
    locationEn: workout.locationEn,
  };
}

function normalizeWorkoutCourseTitle(workout: WorkoutCourse): string {
  return (workout.titleEn || workout.title || "").trim().toLowerCase();
}

function toWorkoutCourseScheduleLabel(workout: WorkoutCourse): string | null {
  const day = workout.dayOfWeek?.trim();
  const start = workout.startTime?.slice(0, 5);
  const end = workout.endTime?.slice(0, 5);

  if (day && start) return `${day} ${start}${end ? `-${end}` : ""}`;
  if (day) return day;
  if (start) return `${start}${end ? `-${end}` : ""}`;
  return null;
}

function createWorkoutCourseVariantEntry(workout: WorkoutCourse): WorkoutCourseVariantEntry {
  const duration = typeof workout.duration === "string"
    ? workout.duration
    : (workout.startDate && workout.endDate ? `${workout.startDate} - ${workout.endDate}` : null);

  return {
    schedule: toWorkoutCourseScheduleLabel(workout),
    duration,
    location: workout.location || null,
    locationEn: workout.locationEn || null,
  };
}

export function aggregateWorkoutsByName(workouts: Workout[]): Workout[] {
  const grouped = new Map<string, { base: Workout; count: number; entries: WorkoutVariantEntry[] }>();

  workouts.forEach((workout) => {
    const key = normalizeTitle(workout);
    const entry = createVariantEntry(workout);

    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, {
        base: { ...workout },
        count: 1,
        entries: [entry],
      });
      return;
    }

    current.count += 1;
    current.entries.push(entry);
  });

  return Array.from(grouped.values()).map(({ base, count, entries }) => {
    if (count <= 1) return base;

    const uniqueEntries = entries.filter((entry, index) => {
      const key = `${entry.schedule || ""}|${entry.duration || ""}|${entry.locationEn || ""}|${entry.location || ""}`;
      return entries.findIndex((candidate) =>
        `${candidate.schedule || ""}|${candidate.duration || ""}|${candidate.locationEn || ""}|${candidate.location || ""}` === key
      ) === index;
    });

    return {
      ...base,
      details: {
        ...(base.details || {}),
        aggregatedVariants: count,
        aggregatedEntries: uniqueEntries,
      },
    };
  });
}

export function aggregateWorkoutCoursesByName(workouts: WorkoutCourse[]): WorkoutCourse[] {
  const grouped = new Map<string, { base: WorkoutCourse; count: number; entries: WorkoutCourseVariantEntry[] }>();

  workouts.forEach((workout) => {
    const key = `${workout.source}::${normalizeWorkoutCourseTitle(workout)}`;
    const entry = createWorkoutCourseVariantEntry(workout);
    const current = grouped.get(key);

    if (!current) {
      grouped.set(key, {
        base: { ...workout },
        count: 1,
        entries: [entry],
      });
      return;
    }

    current.count += 1;
    current.entries.push(entry);
  });

  return Array.from(grouped.values()).map(({ base, count, entries }) => {
    if (count <= 1) return base;

    const uniqueEntries = entries.filter((entry, index) => {
      const key = `${entry.schedule || ""}|${entry.duration || ""}|${entry.locationEn || ""}|${entry.location || ""}`;
      return entries.findIndex((candidate) =>
        `${candidate.schedule || ""}|${candidate.duration || ""}|${candidate.locationEn || ""}|${candidate.location || ""}` === key
      ) === index;
    });

    return {
      ...base,
      details: {
        ...(base.details || {}),
        aggregatedVariants: count,
        aggregatedEntries: uniqueEntries,
      },
    };
  });
}
