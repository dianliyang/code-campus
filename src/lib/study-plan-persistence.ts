export type StudyPlanPersistenceRow = {
  user_id: string;
  course_id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  kind: string | null;
  timezone: string | null;
  updated_at?: string;
};

export function normalizeStudyPlanDays(days: number[]) {
  return Array.from(new Set((Array.isArray(days) ? days : []).filter((day) => Number.isInteger(day)))).sort((a, b) => a - b);
}

export function expandStudyPlanDays<T extends { days_of_week: number[] }>(row: T): Array<Omit<T, "days_of_week"> & { days_of_week: number[] }> {
  const normalizedDays = normalizeStudyPlanDays(row.days_of_week);
  return normalizedDays.map((day) => ({
    ...row,
    days_of_week: [day],
  }));
}
