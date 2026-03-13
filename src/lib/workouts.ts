import { Workout } from "@/types";
import type { WorkoutCourse } from "@/lib/scrapers/cau-sport";

interface WorkoutVariantEntry {
  schedule: string | null;
  duration: string | null;
  location: string | null;
  locationEn: string | null;
  bookingStatus: string | null;
  plannedDates?: string[];
  segments?: Array<{ start: string; end: string; day: string }>;
}

interface WorkoutCourseVariantEntry {
  schedule: string | null;
  duration: string | null;
  location: string | null;
  locationEn: string | null;
  bookingStatus: string | null;
  plannedDates?: string[];
  segments?: Array<{ start: string; end: string; day: string }>;
}

function deriveAggregateBookingStatus(statuses: Array<string | null | undefined>): string | null {
  const normalized = statuses.filter((status): status is string => Boolean(status));
  if (normalized.length === 0) return null;

  const nonExpired = normalized.filter((status) => status !== "expired");
  const candidates = nonExpired.length > 0 ? nonExpired : normalized;
  const priority = ["available", "waitlist", "scheduled", "see_text", "tbd", "fully_booked", "cancelled", "expired", "unknown"];

  for (const status of priority) {
    if (candidates.includes(status)) return status;
  }

  return candidates[0] ?? null;
}

function deriveRequiredAggregateBookingStatus(
  statuses: Array<string | null | undefined>,
  fallback?: string | null,
): string {
  return deriveAggregateBookingStatus(statuses) || fallback || "unknown";
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
    bookingStatus: workout.bookingStatus,
    plannedDates: Array.isArray(workout.details?.plannedDates) ? workout.details.plannedDates : undefined,
    segments: Array.isArray(workout.details?.segments) ? workout.details.segments : undefined,
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
    bookingStatus: workout.bookingStatus,
    plannedDates: Array.isArray(workout.details?.plannedDates) ? workout.details.plannedDates : undefined,
    segments: Array.isArray(workout.details?.segments) ? workout.details.segments : undefined,
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
    if (count <= 1) {
      const pd = Array.isArray(base.details?.plannedDates) ? base.details.plannedDates : [];
      return { ...base, details: { ...(base.details || {}), totalSessions: pd.length } };
    }

    const uniqueEntries = entries.filter((entry, index) => {
      const key = `${entry.schedule || ""}|${entry.duration || ""}|${entry.locationEn || ""}|${entry.location || ""}`;
      return entries.findIndex((candidate) =>
        `${candidate.schedule || ""}|${candidate.duration || ""}|${candidate.locationEn || ""}|${candidate.location || ""}` === key
      ) === index;
    });

    const bestPlannedDates = uniqueEntries.reduce((prev, curr) =>
      (curr.plannedDates?.length || 0) > (prev?.length || 0) ? curr.plannedDates : prev,
      uniqueEntries[0]?.plannedDates
    );
    const totalSessions = bestPlannedDates?.length || 0;

    return {
      ...base,
      bookingStatus: deriveRequiredAggregateBookingStatus(entries.map((entry) => entry.bookingStatus), base.bookingStatus),
      details: {
        ...(base.details || {}),
        aggregatedVariants: count,
        aggregatedEntries: uniqueEntries,
        plannedDates: bestPlannedDates,
        segments: uniqueEntries.reduce((prev, curr) =>
          (curr.segments?.length || 0) > (prev?.length || 0) ? curr.segments : prev,
          uniqueEntries[0]?.segments
        ),
        totalSessions,
      },
    };
  });
}

export function aggregateWorkoutCoursesByName(workouts: WorkoutCourse[]): WorkoutCourse[] {
  console.log(`[Aggregator] Processing ${workouts.length} items...`);
  const grouped = new Map<string, { base: WorkoutCourse; count: number; entries: WorkoutCourseVariantEntry[] }>();

  workouts.forEach((workout) => {
    const key = `${workout.source}::${normalizeWorkoutCourseTitle(workout)}`;
    const entry = createWorkoutCourseVariantEntry(workout);
    
    if (workout.details?.plannedDates) {
      console.log(`[Aggregator] Input ${workout.courseCode} has ${(workout.details.plannedDates as string[]).length} plannedDates`);
    }

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
    if (count <= 1) {
      const pd = base.details?.plannedDates;
      const totalSessions = Array.isArray(pd) ? pd.length : 0;
      if (totalSessions > 0) console.log(`[Aggregator] Single result ${base.courseCode} has ${totalSessions} plannedDates`);
      return {
        ...base,
        details: { ...(base.details || {}), totalSessions },
      };
    }

    const uniqueEntries = entries.filter((entry, index) => {
      const key = `${entry.schedule || ""}|${entry.duration || ""}|${entry.locationEn || ""}|${entry.location || ""}`;
      return entries.findIndex((candidate) =>
        `${candidate.schedule || ""}|${candidate.duration || ""}|${candidate.locationEn || ""}|${candidate.location || ""}` === key
      ) === index;
    });

    const bestPlannedDates = uniqueEntries.reduce((prev, curr) =>
      (curr.plannedDates?.length || 0) > (prev?.length || 0) ? curr.plannedDates : prev,
      uniqueEntries[0]?.plannedDates
    );
    // totalSessions = sessions per representative time-slot (how many weeks the course runs),
    // NOT the sum across all variants — that would inflate the count confusingly.
    const totalSessions = bestPlannedDates?.length || 0;

    if (totalSessions > 0) console.log(`[Aggregator] Aggregated result ${base.courseCode} has ${totalSessions} sessions (best variant, ${uniqueEntries.length} total variants)`);

    return {
      ...base,
      bookingStatus: deriveRequiredAggregateBookingStatus(entries.map((entry) => entry.bookingStatus), base.bookingStatus),
      details: {
        ...(base.details || {}),
        aggregatedVariants: count,
        aggregatedEntries: uniqueEntries,
        plannedDates: bestPlannedDates,
        segments: uniqueEntries.reduce((prev, curr) =>
          (curr.segments?.length || 0) > (prev?.length || 0) ? curr.segments : prev,
          uniqueEntries[0]?.segments
        ),
        totalSessions,
      },
    };
  });
}
