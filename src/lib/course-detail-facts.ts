function inferTermLabelFromDate(value: string): string | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month >= 10) return `Winter ${year}`;
  if (month >= 4) return `Spring ${year}`;
  if (month >= 1) return `Winter ${year - 1}`;
  return null;
}

export function formatCourseTermLabels(
  relatedSemesters: Array<{ semesters?: { term?: string; year?: number } | null }> | null | undefined,
  latestSemester: { term?: string; year?: number } | null | undefined,
  details?: Record<string, unknown> | null | undefined,
): string[] {
  const labels =
    (relatedSemesters || [])
      .map((item) => {
        const semester = item?.semesters;
        if (!semester?.term || semester.year == null) return null;
        return `${semester.term} ${semester.year}`;
      })
      .filter((label): label is string => Boolean(label));

  if (labels.length > 0) return labels;
  if (latestSemester?.term && latestSemester.year != null) {
    return [`${latestSemester.term} ${latestSemester.year}`];
  }
  const scheduleEntries = Array.isArray(details?.scheduleEntries) ? details.scheduleEntries : [];
  const inferredLabel = scheduleEntries
    .map((entry) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>).startDate : null))
    .filter((value): value is string => typeof value === "string")
    .sort()[0];
  if (inferredLabel) {
    const termLabel = inferTermLabelFromDate(inferredLabel);
    if (termLabel) return [termLabel];
  }
  return [];
}
