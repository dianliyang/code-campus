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
  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.key.localeCompare(b.key));
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

    if (isParentStudyPlan || event.sourceType === "workout") {
      const group = { parent: event, children: [] };
      groups.push(group);
      groupByParentKey.set(event.key, group);
      continue;
    }

    if (isCourseScheduleChild) {
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
