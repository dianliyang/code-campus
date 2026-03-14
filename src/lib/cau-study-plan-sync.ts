import type { Course as ScrapedCourse } from "@/lib/scrapers/types";
import type { StudyPlanPersistenceRow } from "@/lib/study-plan-persistence";

type CauScheduleEntry = {
  kind?: unknown;
  dayOfWeek?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  location?: unknown;
  exclude?: unknown;
};

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return null;
}

function asScheduleEntries(course: ScrapedCourse): CauScheduleEntry[] {
  const details = course.details;
  if (!details || typeof details !== "object") return [];
  const raw = (details as Record<string, unknown>).scheduleEntries;
  return Array.isArray(raw) ? raw.filter((entry) => entry && typeof entry === "object") as CauScheduleEntry[] : [];
}

export function buildCauStudyPlanRows({
  userId,
  courseId,
  course,
  timezone = "Europe/Berlin",
}: {
  userId: string;
  courseId: number;
  course: ScrapedCourse;
  timezone?: string;
}): StudyPlanPersistenceRow[] {
  const entries = asScheduleEntries(course);

  return entries.flatMap((entry) => {
    const dayOfWeek = typeof entry.dayOfWeek === "number" ? entry.dayOfWeek : Number.NaN;
    const startTime = normalizeTime(entry.startTime);
    const endTime = normalizeTime(entry.endTime);
    const startDate = typeof entry.startDate === "string" ? entry.startDate.trim() : "";
    const endDate = typeof entry.endDate === "string" ? entry.endDate.trim() : "";
    const location = typeof entry.location === "string" ? entry.location.trim() : "";
    const kind = typeof entry.kind === "string" ? entry.kind.trim() : "";
    const exclude = typeof entry.exclude === "string" ? entry.exclude.trim().toLowerCase() : "";

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 0 ||
      dayOfWeek > 6 ||
      !startTime ||
      !endTime ||
      !startDate ||
      !endDate ||
      (exclude !== "" && exclude !== "no")
    ) {
      return [];
    }

    return [{
      user_id: userId,
      course_id: courseId,
      start_date: startDate,
      end_date: endDate,
      days_of_week: [dayOfWeek],
      start_time: startTime,
      end_time: endTime,
      location: location || null,
      kind: kind || null,
      timezone,
    }];
  });
}

export async function syncCauStudyPlansForCourses({
  supabase,
  userId,
  courses,
  courseCodeToId,
}: {
  supabase: {
    from: (table: string) => {
      delete: () => {
        eq: (column: string, value: string) => {
          in: (inColumn: string, values: number[]) => Promise<{ error: { message?: string } | null }>;
        };
      };
      insert: (rows: StudyPlanPersistenceRow[]) => Promise<{ error: { message?: string } | null }>;
    };
  };
  userId: string;
  courses: ScrapedCourse[];
  courseCodeToId: Map<string, number>;
}) {
  const rowsByCourse = courses.flatMap((course) => {
    const courseId = courseCodeToId.get(course.courseCode);
    if (!courseId) return [];
    const rows = buildCauStudyPlanRows({ userId, courseId, course });
    if (rows.length === 0) return [];
    return [{ courseId, rows }] as Array<{ courseId: number; rows: StudyPlanPersistenceRow[] }>;
  });

  const affectedCourseIds = Array.from(new Set(rowsByCourse.map((entry) => entry.courseId)));

  if (affectedCourseIds.length === 0) {
    return { deletedCourseIds: [], insertedCount: 0 };
  }

  const { error: deleteError } = await supabase
    .from("study_plans")
    .delete()
    .eq("user_id", userId)
    .in("course_id", affectedCourseIds);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete CAU study plans");
  }

  const rows = rowsByCourse.flatMap((entry) => entry.rows);

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from("study_plans").insert(rows);
    if (insertError) {
      throw new Error(insertError.message || "Failed to insert CAU study plans");
    }
  }

  return {
    deletedCourseIds: affectedCourseIds,
    insertedCount: rows.length,
  };
}

export async function resolveSingletonUserId(supabase: {
  auth?: {
    admin?: {
      listUsers?: (params?: { page?: number; perPage?: number }) => Promise<{
        data?: { users?: Array<{ id: string }> };
        error?: { message?: string } | null;
      }>;
    };
  };
}): Promise<string | null> {
  const adminClient = supabase.auth?.admin;
  if (!adminClient || typeof adminClient.listUsers !== "function") return null;

  const { data, error } = await adminClient.listUsers({ page: 1, perPage: 2 });
  if (error) {
    throw new Error(error.message || "Failed to resolve singleton user");
  }

  const users = Array.isArray(data?.users) ? data.users : [];
  if (users.length !== 1) return null;
  return users[0]?.id || null;
}
