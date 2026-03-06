export interface CourseDetailCalendarAssignment {
  id: number;
  kind: string;
  label: string;
  due_on: string | null;
  url: string | null;
  description: string | null;
}

export interface CourseDetailCalendarScheduleItem {
  date: string;
  title: string | null;
  kind: string | null;
  focus: string | null;
  durationMinutes: number | null;
}

export interface CourseDetailCalendarStudyPlan {
  id?: number;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string;
  kind: string;
}

export interface CourseDetailCalendarEvent {
  label: string;
  meta: string;
  kind: string;
  badgeLabel: string;
  timeLabel: string | null;
  isCompleted: boolean;
}

export interface CourseDetailCalendarResult {
  range: null | { startIso: string; endIso: string };
  months: Array<{
    key: string;
    label: string;
    cells: Array<{
      dateIso: string;
      day: number;
      inMonth: boolean;
      inRange: boolean;
    }>;
  }>;
  eventsByDate: Map<string, CourseDetailCalendarEvent[]>;
}

function parseIsoDate(value: string): Date | null {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDateUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUtc(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function inferCalendarKind(input: Array<string | null | undefined>): string {
  const text = input
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text.trim()) return "task";
  if (/\b(read|reading|chapter|notes|textbook)\b/.test(text)) return "reading";
  if (/\b(lab|studio|workshop)\b/.test(text)) return "lab";
  if (/\b(project|milestone)\b/.test(text)) return "project";
  if (/\b(exam|midterm|final)\b/.test(text)) return "exam";
  if (/\b(quiz)\b/.test(text)) return "quiz";
  if (/\b(assignment|homework|hw\b|pset|problem set)\b/.test(text)) return "assignment";
  if (/\b(lecture|watch|video|recitation)\b/.test(text)) return "lecture";
  return "task";
}

function normalizeCalendarKind(
  explicitKind: string,
  fallbackInput: Array<string | null | undefined>,
): string {
  const normalizedExplicitKind = explicitKind.trim().toLowerCase();
  if (!normalizedExplicitKind) return inferCalendarKind(fallbackInput);
  if (normalizedExplicitKind === "task" || normalizedExplicitKind === "scheduled") {
    return inferCalendarKind(fallbackInput);
  }
  return normalizedExplicitKind;
}

export function buildCourseDetailCalendar({
  courseTitle: _courseTitle,
  assignments,
  scheduleItems,
  studyPlans: _studyPlans,
  completionByDate = new Map<string, boolean>(),
}: {
  courseTitle: string;
  assignments: CourseDetailCalendarAssignment[];
  scheduleItems: CourseDetailCalendarScheduleItem[];
  studyPlans: CourseDetailCalendarStudyPlan[];
  completionByDate?: Map<string, boolean>;
}): CourseDetailCalendarResult {
  const scheduleRows = scheduleItems
    .map((item) => {
      const parsedDate = parseIsoDate(item.date);
      if (!parsedDate) return null;
      const dateIso = toIsoDateUtc(parsedDate);
      const label = String(item.title || item.focus || item.kind || "Scheduled Task").trim();
      const duration =
        typeof item.durationMinutes === "number" && Number.isFinite(item.durationMinutes)
          ? `${Math.max(1, Math.round(item.durationMinutes))}m`
          : "";
      const kind = normalizeCalendarKind(String(item.kind || ""), [item.title, item.focus]);
      const meta = [kind, duration].filter(Boolean).join(" · ") || "Scheduled";
      return {
        dateIso,
        label,
        meta,
        kind,
        badgeLabel: kind,
        timeLabel: duration || null,
        isCompleted: completionByDate.get(dateIso) ?? false,
      };
    })
    .filter((row): row is { dateIso: string; label: string; meta: string; kind: string; badgeLabel: string; timeLabel: string | null; isCompleted: boolean } => row !== null);

  const deadlineRows = assignments
    .map((item) => {
      if (!item.due_on) return null;
      const parsedDate = parseIsoDate(item.due_on);
      if (!parsedDate) return null;
      const dateIso = toIsoDateUtc(parsedDate);
      const label = String(item.label || "Deadline").trim() || "Deadline";
      const kind = String(item.kind || "deadline").trim().toLowerCase() || "deadline";
      return {
        dateIso,
        label,
        meta: `Deadline${kind ? ` · ${kind}` : ""}`,
        kind,
        badgeLabel: kind,
        timeLabel: null,
        isCompleted: completionByDate.get(dateIso) ?? false,
      };
    })
    .filter((row): row is { dateIso: string; label: string; meta: string; kind: string; badgeLabel: string; timeLabel: null; isCompleted: boolean } => row !== null);

  const rows = [...scheduleRows, ...deadlineRows];
  if (rows.length === 0) {
    return {
      range: null,
      months: [],
      eventsByDate: new Map<string, CourseDetailCalendarEvent[]>(),
    };
  }

  const datedSorted = rows.map((row) => row.dateIso).sort();
  const rangeStart = parseIsoDate(datedSorted[0])!;
  const rangeEnd = parseIsoDate(datedSorted[datedSorted.length - 1])!;
  const rangeStartIso = toIsoDateUtc(rangeStart);
  const rangeEndIso = toIsoDateUtc(rangeEnd);
  const eventsByDate = new Map<string, CourseDetailCalendarEvent[]>();
  for (const row of rows) {
    const list = eventsByDate.get(row.dateIso) || [];
      list.push({
        label: row.label,
        meta: row.meta,
        kind: row.kind,
        badgeLabel: row.badgeLabel,
        timeLabel: row.timeLabel,
        isCompleted: row.isCompleted,
      });
    eventsByDate.set(row.dateIso, list);
  }

  const months: CourseDetailCalendarResult["months"] = [];
  for (
    let cursor = new Date(Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1));
    cursor <= new Date(Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), 1));
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
    const gridStart = addDaysUtc(monthStart, -monthStart.getUTCDay());
    const gridEnd = addDaysUtc(monthEnd, 6 - monthEnd.getUTCDay());
    const cells: CourseDetailCalendarResult["months"][number]["cells"] = [];

    for (let d = new Date(gridStart.getTime()); d <= gridEnd; d = addDaysUtc(d, 1)) {
      const dateIso = toIsoDateUtc(d);
      cells.push({
        dateIso,
        day: d.getUTCDate(),
        inMonth: d.getUTCMonth() === monthStart.getUTCMonth(),
        inRange: dateIso >= rangeStartIso && dateIso <= rangeEndIso,
      });
    }

    months.push({
      key: `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, "0")}`,
      label: monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      cells,
    });
  }

  return {
    range: { startIso: rangeStartIso, endIso: rangeEndIso },
    months,
    eventsByDate,
  };
}
