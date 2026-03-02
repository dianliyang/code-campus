export type PlanTaskKind =
  | "reading"
  | "assignment"
  | "project"
  | "lab"
  | "exercise"
  | "quiz"
  | "exam"
  | "task";

export type PlanSeedTask = {
  kind: PlanTaskKind;
  title: string;
  due_on: string | null;
  source_sequence: string | null;
  url: string | null;
  description: string | null;
};

export type DailyPlanTask = {
  title: string;
  kind?: PlanTaskKind | string;
  minutes?: number;
};

export type DailyPlanDay = {
  date: string;
  focus: string;
  tasks: DailyPlanTask[];
};

export type DailyPlan = {
  days: DailyPlanDay[];
};

export type AssignmentPersistKind = "assignment" | "lab" | "exam" | "project" | "quiz" | "other";

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function normalizeTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function readTaskItems(
  row: Record<string, unknown>,
  key: "readings" | "assignments" | "projects" | "labs" | "exams" | "quizzes" | "exercises"
): Array<Record<string, unknown>> {
  const value = row[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
}

function normalizeKind(value: unknown): PlanTaskKind {
  const raw = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (!raw) return "task";
  if (raw.includes("read")) return "reading";
  if (raw.includes("project")) return "project";
  if (raw.includes("lab")) return "lab";
  if (raw.includes("exercise")) return "exercise";
  if (raw.includes("quiz")) return "quiz";
  if (raw.includes("exam") || raw.includes("midterm") || raw.includes("final")) return "exam";
  if (raw.includes("assignment") || raw.includes("homework") || raw.includes("problem set") || raw.includes("pset")) return "assignment";
  return "task";
}

function dedupePlanTasks(tasks: PlanSeedTask[]): PlanSeedTask[] {
  const seen = new Set<string>();
  const out: PlanSeedTask[] = [];
  for (const task of tasks) {
    const key = `${task.kind}|${task.title.toLowerCase()}|${task.due_on || ""}`;
    if (!task.title || seen.has(key)) continue;
    seen.add(key);
    out.push(task);
  }
  return out;
}

export function toIsoDateUtc(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function buildPlanSeedTasks(scheduleRows: Array<Record<string, unknown>>): PlanSeedTask[] {
  const out: PlanSeedTask[] = [];
  for (const row of scheduleRows) {
    const sourceSequence = typeof row.sequence === "string" ? row.sequence : null;
    const rowDate = normalizeDate(row.date);

    for (const reading of readTaskItems(row, "readings")) {
      const title = normalizeTitle(reading.label || reading.title);
      if (!title) continue;
      out.push({
        kind: normalizeKind("reading"),
        title,
        due_on: rowDate,
        source_sequence: sourceSequence,
        url: typeof reading.url === "string" ? reading.url : null,
        description: null,
      });
    }

    for (const assignment of readTaskItems(row, "assignments")) {
      const title = normalizeTitle(assignment.label || assignment.title);
      if (!title) continue;
      out.push({
        kind: normalizeKind(assignment.kind || "assignment"),
        title,
        due_on: normalizeDate(assignment.due_date) || rowDate,
        source_sequence: sourceSequence,
        url: typeof assignment.url === "string" ? assignment.url : null,
        description: typeof assignment.description === "string" ? assignment.description : null,
      });
    }

    for (const project of readTaskItems(row, "projects")) {
      const title = normalizeTitle(project.label || project.title);
      if (!title) continue;
      out.push({
        kind: normalizeKind(project.kind || "project"),
        title,
        due_on: normalizeDate(project.due_date) || rowDate,
        source_sequence: sourceSequence,
        url: typeof project.url === "string" ? project.url : null,
        description: typeof project.description === "string" ? project.description : null,
      });
    }

    for (const lab of readTaskItems(row, "labs")) {
      const title = normalizeTitle(lab.label || lab.title);
      if (!title) continue;
      out.push({
        kind: normalizeKind(lab.kind || "lab"),
        title,
        due_on: normalizeDate(lab.due_date) || rowDate,
        source_sequence: sourceSequence,
        url: typeof lab.url === "string" ? lab.url : null,
        description: typeof lab.description === "string" ? lab.description : null,
      });
    }

    for (const exam of readTaskItems(row, "exams")) {
      const title = normalizeTitle(exam.label || exam.title);
      if (!title) continue;
      out.push({
        kind: normalizeKind(exam.kind || "exam"),
        title,
        due_on: normalizeDate(exam.due_date) || rowDate,
        source_sequence: sourceSequence,
        url: typeof exam.url === "string" ? exam.url : null,
        description: typeof exam.description === "string" ? exam.description : null,
      });
    }

    for (const quiz of readTaskItems(row, "quizzes")) {
      const title = normalizeTitle(quiz.label || quiz.title);
      if (!title) continue;
      out.push({
        kind: normalizeKind(quiz.kind || "quiz"),
        title,
        due_on: normalizeDate(quiz.due_date) || rowDate,
        source_sequence: sourceSequence,
        url: typeof quiz.url === "string" ? quiz.url : null,
        description: typeof quiz.description === "string" ? quiz.description : null,
      });
    }

    for (const exercise of readTaskItems(row, "exercises")) {
      const title = normalizeTitle(exercise.label || exercise.title);
      if (!title) continue;
      out.push({
        kind: normalizeKind(exercise.kind || "exercise"),
        title,
        due_on: normalizeDate(exercise.due_date) || rowDate,
        source_sequence: sourceSequence,
        url: typeof exercise.url === "string" ? exercise.url : null,
        description: typeof exercise.description === "string" ? exercise.description : null,
      });
    }
  }
  return dedupePlanTasks(out);
}

export function sanitizeDailyPlan(raw: unknown, todayIso: string): DailyPlan {
  const rows = Array.isArray((raw as { days?: unknown[] } | null)?.days)
    ? (((raw as { days?: unknown[] }).days || []) as unknown[])
    : [];
  const days: DailyPlanDay[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const date = normalizeDate(rec.date);
    if (!date || date < todayIso) continue;
    const focus = normalizeTitle(rec.focus) || "Study";
    const taskRows = Array.isArray(rec.tasks) ? rec.tasks : [];
    const tasks: DailyPlanTask[] = taskRows
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({
        title: normalizeTitle(item.title),
        kind: typeof item.kind === "string" ? normalizeKind(item.kind) : undefined,
        minutes: Number.isFinite(Number(item.minutes)) ? Number(item.minutes) : undefined,
      }))
      .filter((item) => item.title.length > 0);
    if (tasks.length === 0) continue;
    days.push({ date, focus, tasks });
  }
  return { days: days.sort((a, b) => a.date.localeCompare(b.date)) };
}

export function parseLooseDailyPlanText(raw: string, todayIso: string): DailyPlan {
  const lines = String(raw || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const days: DailyPlanDay[] = [];
  let current: DailyPlanDay | null = null;

  for (const line of lines) {
    const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s*[:|-]?\s*(.*)$/);
    if (dateMatch) {
      const date = normalizeDate(dateMatch[1]);
      if (!date || date < todayIso) {
        current = null;
        continue;
      }
      const focus = normalizeTitle(dateMatch[2]) || "Study";
      current = { date, focus, tasks: [] };
      days.push(current);
      continue;
    }

    if (!current) continue;
    const taskMatch = line.match(/^[-*]\s*(.+)$/);
    if (!taskMatch) continue;
    const rawTask = normalizeTitle(taskMatch[1]);
    if (!rawTask) continue;
    const kind = normalizeKind(rawTask);
    current.tasks.push({
      title: rawTask,
      kind,
      minutes: kind === "reading" ? 45 : kind === "quiz" ? 30 : 75,
    });
  }

  return {
    days: days
      .map((day) => ({ ...day, tasks: day.tasks.slice(0, 4) }))
      .filter((day) => day.tasks.length > 0)
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function buildFallbackDailyPlan(tasks: PlanSeedTask[], todayIso: string, windowDays = 21): DailyPlan {
  const today = new Date(`${todayIso}T00:00:00.000Z`);
  const byDate = new Map<string, DailyPlanTask[]>();
  const sorted = [...tasks].sort((a, b) => {
    const ad = a.due_on || "9999-12-31";
    const bd = b.due_on || "9999-12-31";
    return ad.localeCompare(bd);
  });
  let rollingIndex = 0;
  for (const task of sorted) {
    const target = task.due_on && task.due_on >= todayIso
      ? task.due_on
      : toIsoDateUtc(new Date(today.getTime() + (rollingIndex % Math.max(1, windowDays)) * 86400000));
    const day = byDate.get(target) || [];
    const minutes = task.kind === "reading"
      ? 45
      : task.kind === "quiz"
        ? 30
        : task.kind === "exam"
          ? 120
          : 75;
    day.push({ title: task.title, kind: task.kind, minutes });
    byDate.set(target, day);
    rollingIndex += 1;
  }
  const days = Array.from(byDate.entries())
    .filter(([date]) => date >= todayIso)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, windowDays)
    .map(([date, dayTasks]) => ({
      date,
      focus: dayTasks[0]?.kind === "reading" ? "Reading" : "Course Work",
      tasks: dayTasks.slice(0, 4),
    }));
  return { days };
}

export function mapPlanKindToAssignmentKind(kind: string | undefined | null): AssignmentPersistKind {
  const normalized = normalizeKind(kind || "");
  if (normalized === "lab") return "lab";
  if (normalized === "project") return "project";
  if (normalized === "quiz") return "quiz";
  if (normalized === "exam") return "exam";
  if (normalized === "assignment" || normalized === "exercise" || normalized === "task") return "assignment";
  return "other";
}

export function buildAssignmentsFromDailyPlan(input: {
  courseId: number;
  syllabusId: number | null;
  plan: DailyPlan;
  nowIso: string;
}): Array<{
  course_id: number;
  syllabus_id: number | null;
  course_schedule_id: number | null;
  kind: AssignmentPersistKind;
  label: string;
  due_on: string | null;
  url: string | null;
  description: string | null;
  source_sequence: string | null;
  source_row_date: string | null;
  metadata: Record<string, unknown>;
  retrieved_at: string;
  updated_at: string;
}> {
  const out: Array<{
    course_id: number;
    syllabus_id: number | null;
    course_schedule_id: number | null;
    kind: AssignmentPersistKind;
    label: string;
    due_on: string | null;
    url: string | null;
    description: string | null;
    source_sequence: string | null;
    source_row_date: string | null;
    metadata: Record<string, unknown>;
    retrieved_at: string;
    updated_at: string;
  }> = [];

  for (const day of input.plan.days) {
    const dueDate = normalizeDate(day.date);
    if (!dueDate) continue;
    for (const task of day.tasks) {
      const label = normalizeTitle(task.title);
      if (!label) continue;
      const kind = mapPlanKindToAssignmentKind(task.kind);
      if (kind === "other") continue;
      out.push({
        course_id: input.courseId,
        syllabus_id: input.syllabusId,
        course_schedule_id: null,
        kind,
        label,
        due_on: dueDate,
        url: null,
        description: day.focus || null,
        source_sequence: null,
        source_row_date: dueDate,
        metadata: {
          source: "ai_practical_plan",
          task_kind: task.kind || null,
          minutes: typeof task.minutes === "number" ? task.minutes : null,
        },
        retrieved_at: input.nowIso,
        updated_at: input.nowIso,
      });
    }
  }
  return out;
}

export function buildCourseSchedulesFromDailyPlan(input: {
  courseId: number;
  syllabusId: number | null;
  plan: DailyPlan;
  nowIso: string;
}): Array<{
  course_id: number;
  syllabus_id: number | null;
  schedule_date: string;
  focus: string | null;
  task_kind: string | null;
  task_title: string;
  duration_minutes: number | null;
  source: string;
  metadata: Record<string, unknown>;
  retrieved_at: string;
  updated_at: string;
}> {
  const rows: Array<{
    course_id: number;
    syllabus_id: number | null;
    schedule_date: string;
    focus: string | null;
    task_kind: string | null;
    task_title: string;
    duration_minutes: number | null;
    source: string;
    metadata: Record<string, unknown>;
    retrieved_at: string;
    updated_at: string;
  }> = [];

  for (const day of input.plan.days) {
    const scheduleDate = normalizeDate(day.date);
    if (!scheduleDate) continue;
    for (const task of day.tasks) {
      const taskTitle = normalizeTitle(task.title);
      if (!taskTitle) continue;
      rows.push({
        course_id: input.courseId,
        syllabus_id: input.syllabusId,
        schedule_date: scheduleDate,
        focus: normalizeTitle(day.focus) || null,
        task_kind: task.kind ? normalizeKind(task.kind) : null,
        task_title: taskTitle,
        duration_minutes: Number.isFinite(Number(task.minutes)) ? Number(task.minutes) : null,
        source: "ai_course_intel",
        metadata: {
          generated_by: "ai_course_intel",
        },
        retrieved_at: input.nowIso,
        updated_at: input.nowIso,
      });
    }
  }
  return rows;
}
