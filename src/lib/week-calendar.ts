export interface WeekCalendarScheduleRowLike {
  source_type: string | null;
  plan_id: number | null;
  schedule_id: number | null;
  assignment_id: number | null;
  workout_id: number | null;
  course_id?: number | null;
  event_date?: string | null;
  start_time?: string | null;
}

export interface WeekCalendarEventColor {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
}

function deriveCourseHue(courseCode: string) {
  const normalized = courseCode.trim().toUpperCase();
  const letters = normalized.replace(/[^A-Z]/g, "");
  const digits = normalized.replace(/\D/g, "");
  const symbols = normalized.replace(/[A-Z0-9]/g, "");

  const letterValue = [...letters].reduce(
    (sum, letter, index) => sum + (letter.charCodeAt(0) - 64) * (index + 1),
    0,
  );
  const digitValue = [...digits].reduce(
    (sum, digit, index) => sum + Number(digit) * (index + 3),
    0,
  );
  const symbolValue = [...symbols].reduce(
    (sum, symbol, index) => sum + symbol.charCodeAt(0) * (index + 5),
    0,
  );

  return (letterValue * 11 + digitValue * 17 + symbolValue * 23 + normalized.length * 29) % 360;
}

export function getWeekCalendarEventColor(courseCode: string | null | undefined) {
  const hue = deriveCourseHue(courseCode || "unknown");
  return {
    borderColor: `hsl(${hue} 70% 45%)`,
    backgroundColor: `hsl(${hue} 85% 92%)`,
    textColor: `hsl(${hue} 55% 20%)`,
  };
}

export function shouldIncludeWeekCalendarRow(row: WeekCalendarScheduleRowLike): boolean {
  if (row.source_type === "workout" && row.workout_id != null) return true;
  if (row.source_type !== "study_plan") return false;
  return row.plan_id != null && row.schedule_id == null && row.assignment_id == null;
}

export interface TodayRoutineEventLike {
  key: string;
  sourceType: "study_plan" | "workout" | "assignment";
  courseId: number | null;
  date: string;
  planId: number | null;
  scheduleId: number | null;
  assignmentId: number | null;
  workoutId: number | null;
  startTime: string;
}

export interface TodayRoutineGroup<T extends TodayRoutineEventLike> {
  parent: T;
  children: T[];
}

export function buildTodayRoutineGroups<T extends TodayRoutineEventLike>(events: T[]): TodayRoutineGroup<T>[] {
  const getRoutineSortTime = (event: T) =>
    event.sourceType === "assignment" ? "98:00:00" : event.startTime;

  const sorted = [...events].sort((a, b) => getRoutineSortTime(a).localeCompare(getRoutineSortTime(b)) || a.key.localeCompare(b.key));
  const parentByCourseDate = new Map<string, T>();

  for (const event of sorted) {
    if (event.sourceType === "study_plan" && event.planId && !event.scheduleId && !event.assignmentId) {
      parentByCourseDate.set(`${event.courseId ?? "none"}::${event.date}`, event);
    }
  }

  const groups: TodayRoutineGroup<T>[] = [];
  const groupByParentKey = new Map<string, TodayRoutineGroup<T>>();

  for (const event of sorted) {
    const isParentStudyPlan = event.sourceType === "study_plan" && event.planId && !event.scheduleId && !event.assignmentId;
    const isCourseScheduleChild = event.sourceType === "study_plan" && event.scheduleId != null;
    const isCourseAssignmentChild = event.sourceType === "assignment" && event.assignmentId != null;

    if (isParentStudyPlan || event.sourceType === "workout") {
      const group = { parent: event, children: [] };
      groups.push(group);
      groupByParentKey.set(event.key, group);
      continue;
    }

    if (isCourseScheduleChild || isCourseAssignmentChild) {
      const parent = parentByCourseDate.get(`${event.courseId ?? "none"}::${event.date}`);
      if (parent) {
        const group = groupByParentKey.get(parent.key);
        if (group) {
          group.children.push(event);
          continue;
        }
      }
    }

    groups.push({ parent: event, children: [] });
  }

  return groups;
}
