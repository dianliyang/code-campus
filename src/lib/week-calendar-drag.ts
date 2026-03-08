function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toTimeString(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function parseMinutes(time: string | null | undefined) {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

export type CalendarStudyPlanRecord = {
  id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  kind: string | null;
  timezone: string | null;
};

export function getDraggedStudyPlanDrop(input: {
  clientX: number;
  clientY: number;
  gridLeft: number;
  gridTop: number;
  gridWidth: number;
  pixelsPerHour: number;
}) {
  const dayWidth = input.gridWidth / 7;
  const dayOfWeek = clamp(Math.floor((input.clientX - input.gridLeft) / dayWidth), 0, 6);
  const rawMinutes = ((input.clientY - input.gridTop) / input.pixelsPerHour) * 60;
  const snappedMinutes = clamp(Math.round(rawMinutes / 15) * 15, 0, 24 * 60 - 15);

  return {
    dayOfWeek,
    startMinutes: snappedMinutes,
  };
}

export function buildDraggedStudyPlanUpdate(input: {
  planId: number;
  courseId: number;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  kind: string | null;
  timezone: string | null;
  droppedDayOfWeek: number;
  droppedStartMinutes: number;
}) {
  const currentStartMinutes = parseMinutes(input.startTime);
  const currentEndMinutes = parseMinutes(input.endTime || input.startTime);
  const durationMinutes = Math.max(0, currentEndMinutes - currentStartMinutes);
  const clampedStartMinutes = clamp(input.droppedStartMinutes, 0, Math.max(0, 24 * 60 - Math.max(durationMinutes, 15)));
  const clampedEndMinutes = clamp(clampedStartMinutes + durationMinutes, 0, 24 * 60 - 1);

  return {
    planId: input.planId,
    courseId: input.courseId,
    startDate: input.startDate,
    endDate: input.endDate,
    daysOfWeek: [input.droppedDayOfWeek],
    startTime: toTimeString(clampedStartMinutes),
    endTime: toTimeString(clampedEndMinutes),
    location: input.location || "",
    kind: input.kind,
    timezone: input.timezone || "UTC",
  };
}

export function getResizedStudyPlanTimes(input: {
  startMinutes: number;
  endMinutes: number;
  edge: "top" | "bottom";
  snappedMinutes: number;
  minDurationMinutes?: number;
}) {
  const minDurationMinutes = input.minDurationMinutes ?? 30;

  if (input.edge === "top") {
    return {
      startMinutes: clamp(input.snappedMinutes, 0, input.endMinutes - minDurationMinutes),
      endMinutes: input.endMinutes,
    };
  }

  return {
    startMinutes: input.startMinutes,
    endMinutes: clamp(input.snappedMinutes, input.startMinutes + minDurationMinutes, 24 * 60),
  };
}

export function buildResizedStudyPlanUpdate(input: {
  planId: number;
  courseId: number;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  location: string | null;
  kind: string | null;
  timezone: string | null;
  startMinutes: number;
  endMinutes: number;
}) {
  return {
    planId: input.planId,
    courseId: input.courseId,
    startDate: input.startDate,
    endDate: input.endDate,
    daysOfWeek: input.daysOfWeek,
    startTime: toTimeString(input.startMinutes),
    endTime: toTimeString(input.endMinutes),
    location: input.location || "",
    kind: input.kind,
    timezone: input.timezone || "UTC",
  };
}
