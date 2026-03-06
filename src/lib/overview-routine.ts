type OverviewStudyPlan = {
  id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string | null;
  end_time: string | null;
  kind: string | null;
  location: string | null;
  courses: {
    title: string;
    course_code: string;
    university: string;
  } | null;
};

type OverviewStudyLog = {
  plan_id: number;
  log_date: string;
  is_completed: boolean | null;
};

type OverviewWorkout = {
  id: number;
  title: string;
  category: string | null;
  source: string | null;
  day_of_week: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
};

type OverviewWorkoutLog = {
  workout_id: number;
  log_date: string;
  is_attended: boolean | null;
};

type OverviewAssignment = {
  id: number;
  course_id: number;
  label: string;
  kind: string;
  due_on: string | null;
  url: string | null;
  courses: {
    title: string;
    course_code: string;
    university: string;
  } | null;
};

export type OverviewRoutineItem = {
  key: string;
  sourceType: "study_plan" | "workout" | "assignment";
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
    | { type: "toggle_complete"; planId: number; date: string }
    | { type: "toggle_attended"; workoutId: number; date: string }
    | null;
};

function toDateOnly(value: string | null | undefined) {
  if (!value) return "";
  return value.includes("T") ? value.split("T")[0] : value;
}

function parseWorkoutDayOfWeek(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  const dayMap: Record<string, number> = {
    sun: 0,
    sunday: 0,
    mon: 1,
    monday: 1,
    tue: 2,
    tues: 2,
    tuesday: 2,
    wed: 3,
    wednesday: 3,
    thu: 4,
    thur: 4,
    thurs: 4,
    thursday: 4,
    fri: 5,
    friday: 5,
    sat: 6,
    saturday: 6,
  };
  return Number.isInteger(dayMap[normalized]) ? dayMap[normalized] : null;
}

function getTimeLabel(start: string | null, end: string | null) {
  if (!start && !end) return "All day";
  if (!start) return end ? `Until ${end.slice(0, 5)}` : "All day";
  if (!end) return start.slice(0, 5);
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
}

function getSortTime(start: string | null) {
  return start?.slice(0, 5) || "99:99";
}

export function buildOverviewRoutineItems({
  date,
  plans,
  logs,
  workouts,
  workoutLogs,
  assignments,
}: {
  date: string;
  plans: OverviewStudyPlan[];
  logs: OverviewStudyLog[];
  workouts: OverviewWorkout[];
  workoutLogs: OverviewWorkoutLog[];
  assignments: OverviewAssignment[];
}): OverviewRoutineItem[] {
  const targetDay = new Date(date).getDay();
  const logMap = new Map(
    logs.map((log) => [`${log.plan_id}:${toDateOnly(log.log_date)}`, Boolean(log.is_completed)])
  );
  const workoutLogMap = new Map(
    workoutLogs.map((log) => [`${log.workout_id}:${toDateOnly(log.log_date)}`, Boolean(log.is_attended)])
  );

  const studyItems = plans
    .filter((plan) => {
      const inRange = plan.start_date <= date && plan.end_date >= date;
      return inRange && plan.days_of_week.includes(targetDay);
    })
    .map((plan) => {
      const isDone = Boolean(logMap.get(`${plan.id}:${date}`));
      const metaBits = [
        plan.courses?.course_code || plan.courses?.title || "Study plan",
        plan.courses?.university || null,
      ].filter(Boolean);
      return {
        key: `study:${plan.id}:${date}`,
        sourceType: "study_plan" as const,
        title: plan.courses?.title || "Study session",
        meta: metaBits.join(" · "),
        timeLabel: getTimeLabel(plan.start_time, plan.end_time),
        statusLabel: isDone ? "Completed" : "Mark complete",
        kind: plan.kind || "study",
        location: plan.location,
        href: null,
        startsAtSort: getSortTime(plan.start_time),
        isDone,
        action: { type: "toggle_complete" as const, planId: plan.id, date },
      };
    });

  const workoutItems = workouts
    .filter((workout) => {
      const dayOfWeek = parseWorkoutDayOfWeek(workout.day_of_week);
      if (dayOfWeek == null) return false;
      if (!workout.start_date || !workout.end_date) return false;
      return workout.start_date <= date && workout.end_date >= date && dayOfWeek === targetDay;
    })
    .map((workout) => {
      const isDone = Boolean(workoutLogMap.get(`${workout.id}:${date}`));
      const metaBits = [workout.category, workout.source].filter(Boolean);
      return {
        key: `workout:${workout.id}:${date}`,
        sourceType: "workout" as const,
        title: workout.title,
        meta: metaBits.join(" · ") || "Workout",
        timeLabel: getTimeLabel(workout.start_time, workout.end_time),
        statusLabel: isDone ? "Attended" : "Mark attended",
        kind: "workout",
        location: workout.location,
        href: null,
        startsAtSort: getSortTime(workout.start_time),
        isDone,
        action: { type: "toggle_attended" as const, workoutId: workout.id, date },
      };
    });

  const assignmentItems = assignments
    .filter((assignment) => toDateOnly(assignment.due_on) === date)
    .map((assignment) => {
      const metaBits = [
        assignment.courses?.course_code || assignment.courses?.title || "Assignment",
        assignment.courses?.university || null,
      ].filter(Boolean);
      return {
        key: `assignment:${assignment.id}`,
        sourceType: "assignment" as const,
        title: assignment.label,
        meta: metaBits.join(" · "),
        timeLabel: "Due today",
        statusLabel: assignment.kind,
        kind: assignment.kind,
        location: null,
        href: assignment.url,
        startsAtSort: "98:00",
        isDone: false,
        action: null,
      };
    });

  return [...studyItems, ...workoutItems, ...assignmentItems].sort((a, b) => {
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
