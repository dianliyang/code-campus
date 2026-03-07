export type OverviewRoutineItem = {
  key: string;
  sourceType: "study_plan" | "workout" | "assignment";
  courseId: number | null;
  title: string;
  meta: string;
  timeLabel: string;
  statusLabel: string;
  kind: string;
  location: string | null;
  href?: string | null;
  startsAtSort: string;
  isDone: boolean;
  action:
    | { type: "toggle_complete"; planId: number | null; date: string; scheduleId?: number; assignmentId?: number }
    | { type: "toggle_attended"; workoutId: number; date: string }
    | null;
};

export type DatabaseScheduleRow = {
  event_date: string;
  course_id: number | null;
  title: string;
  course_code: string;
  university: string;
  kind: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  is_completed: boolean;
  plan_id: number | null;
  schedule_id: number | null;
  assignment_id: number | null;
  workout_id: number | null;
  source_type: string;
};

type LegacyOverviewInput = {
  date: string;
  plans?: Array<{
    id: number;
    course_id: number | null;
    start_time: string | null;
    end_time: string | null;
    kind?: string;
    location?: string | null;
    courses?: { title?: string; course_code?: string; university?: string };
  }>;
  logs?: Array<{ plan_id: number; log_date: string; is_completed: boolean }>;
  workouts?: Array<{
    id: number;
    title: string;
    category?: string | null;
    source?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
  }>;
  workoutLogs?: Array<{ workout_id: number; log_date: string; is_attended: boolean }>;
  assignments?: Array<{
    id: number;
    course_id: number | null;
    label: string;
    kind?: string;
    due_on: string;
    courses?: { course_code?: string; university?: string };
  }>;
};

function getTimeLabel(start: string | null, end: string | null, sourceType: string) {
  if (sourceType === 'assignment') return "Due today";
  if (!start && !end) return "All day";
  if (!start) return end ? `Until ${end.slice(0, 5)}` : "All day";
  if (!end || end.startsWith("23:59")) return start.slice(0, 5);
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
}

function getSortTime(start: string | null, sourceType: string) {
  if (sourceType === 'assignment') return "98:00";
  return start?.slice(0, 5) || "99:99";
}

function normalizeRows(input: DatabaseScheduleRow[] | LegacyOverviewInput): DatabaseScheduleRow[] {
  if (Array.isArray(input)) return input;

  const logsByPlan = new Map((input.logs || []).map((item) => [`${item.plan_id}:${item.log_date}`, item.is_completed]));
  const logsByWorkout = new Map(
    (input.workoutLogs || []).map((item) => [`${item.workout_id}:${item.log_date}`, item.is_attended])
  );

  const plans: DatabaseScheduleRow[] = (input.plans || []).map((plan) => ({
    event_date: input.date,
    course_id: plan.course_id,
    title: plan.courses?.title || 'Study Session',
    course_code: plan.courses?.course_code || '',
    university: plan.courses?.university || '',
    kind: plan.kind || 'study',
    start_time: plan.start_time,
    end_time: plan.end_time,
    location: plan.location || null,
    is_completed: Boolean(logsByPlan.get(`${plan.id}:${input.date}`)),
    plan_id: plan.id,
    schedule_id: null,
    assignment_id: null,
    workout_id: null,
    source_type: 'study_plan',
  }));

  const workouts: DatabaseScheduleRow[] = (input.workouts || []).map((workout) => ({
    event_date: input.date,
    course_id: null,
    title: workout.title,
    course_code: workout.category || '',
    university: workout.source || '',
    kind: 'workout',
    start_time: workout.start_time || null,
    end_time: workout.end_time || null,
    location: workout.location || null,
    is_completed: Boolean(logsByWorkout.get(`${workout.id}:${input.date}`)),
    plan_id: null,
    schedule_id: null,
    assignment_id: null,
    workout_id: workout.id,
    source_type: 'workout',
  }));

  const assignments: DatabaseScheduleRow[] = (input.assignments || [])
    .filter((assignment) => assignment.due_on === input.date)
    .map((assignment) => ({
      event_date: input.date,
      course_id: assignment.course_id,
      title: assignment.label,
      course_code: assignment.courses?.course_code || '',
      university: assignment.courses?.university || '',
      kind: assignment.kind || 'assignment',
      start_time: null,
      end_time: null,
      location: null,
      is_completed: false,
      plan_id: null,
      schedule_id: null,
      assignment_id: assignment.id,
      workout_id: null,
      source_type: 'assignment',
    }));

  return [...plans, ...workouts, ...assignments];
}

export function buildOverviewRoutineItems(input: DatabaseScheduleRow[] | LegacyOverviewInput): OverviewRoutineItem[] {
  const rows = normalizeRows(input);
  return rows.map((row) => {
    const isWorkout = row.source_type === "workout";
    const isAssignment = row.source_type === "assignment" || (row.assignment_id != null && row.source_type === 'study_plan');
    
    // Determine sourceType for the UI
    let uiSourceType: "study_plan" | "workout" | "assignment" = "study_plan";
    if (isWorkout) uiSourceType = "workout";
    else if (isAssignment) uiSourceType = "assignment";

    const metaBits = [row.course_code, row.university].filter(Boolean);
    
    const isDone = Boolean(row.is_completed);
    
    let action: OverviewRoutineItem["action"] = null;
    if (isWorkout && row.workout_id) {
      action = { type: "toggle_attended", workoutId: row.workout_id, date: row.event_date };
    } else if (!isAssignment) {
      action = { 
        type: "toggle_complete", 
        planId: row.plan_id, 
        date: row.event_date,
        scheduleId: row.schedule_id || undefined,
        assignmentId: row.assignment_id || undefined
      };
    }

    return {
      key: `${row.source_type}:${row.plan_id || row.schedule_id || row.assignment_id || row.workout_id}:${row.event_date}:${row.start_time}`,
      sourceType: uiSourceType,
      courseId: row.course_id,
      title: row.title,
      meta: metaBits.join(" · "),
      timeLabel: getTimeLabel(row.start_time, row.end_time, row.source_type),
      statusLabel: isDone ? (isWorkout ? "Attended" : "Completed") : (isWorkout ? "Mark attended" : "Mark complete"),
      kind: row.kind,
      location: row.location,
      startsAtSort: getSortTime(row.start_time, row.source_type),
      isDone,
      action,
    };
  }).sort((a, b) => {
    if (a.startsAtSort !== b.startsAtSort) return a.startsAtSort.localeCompare(b.startsAtSort);
    return a.title.localeCompare(b.title);
  });
}

export function buildWeeklyActivity(updatedAtValues: Array<string | null | undefined>) {
  const weeks = [0, 0, 0, 0, 0, 0];
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  for (const value of updatedAtValues) {
    if (!value) continue;
    const ts = new Date(value).getTime();
    if (!Number.isFinite(ts) || ts > now) continue;
    const diffWeeks = Math.floor((now - ts) / weekMs);
    if (diffWeeks < 0 || diffWeeks >= weeks.length) continue;
    weeks[weeks.length - 1 - diffWeeks] += 1;
  }

  return weeks;
}
