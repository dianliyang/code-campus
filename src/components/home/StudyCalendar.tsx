"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { cn } from "@/lib/utils";
import { BookOpen, Check, ChevronLeft, ChevronRight, Clock, Coffee, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Item,
  ItemContent,
  ItemTitle,
} from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EnrolledCourse extends Course {
  status: string;
  progress: number;
  updated_at: string;
}

interface StudyPlan {
  id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  location: string | null;
  kind: string;
  courses: {
    id: number;
    title: string;
    course_code: string;
    university: string;
  } | null;
}

interface StudyLog {
  id: number;
  plan_id: number | null;
  course_schedule_id?: number | null;
  course_assignment_id?: number | null;
  log_date: string;
  is_completed: boolean | null;
  notes: string | null;
}

interface WorkoutSchedule {
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
}

interface CalendarEvent {
  key: string;
  planId: number | null;
  scheduleId?: number | null;
  assignmentId?: number | null;
  courseId: number | null;
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  isCompleted: boolean;
  title: string;
  courseCode: string;
  university: string;
  credit?: number;
  location: string | null;
  kind: string;
  sourceType: "study_plan" | "workout";
}

interface StudyCalendarProps {
  courses: EnrolledCourse[];
  plans: StudyPlan[];
  workouts?: WorkoutSchedule[];
  schedules?: Array<{
    id: number;
    course_id: number;
    schedule_date: string;
    task_title: string;
    task_kind: string | null;
    focus: string | null;
    duration_minutes: number | null;
    courses: { title: string; course_code: string; university: string } | null;
  }>;
  assignments?: Array<{
    id: number;
    course_id: number;
    label: string;
    kind: string;
    due_on: string | null;
    url: string | null;
    courses: { title: string; course_code: string; university: string } | null;
  }>;
  logs: StudyLog[];
  dict: Dictionary["dashboard"]["roadmap"];
  initialDate?: Date;
}

const HOUR_START = 0;
const HOUR_END = 24;
const PIXELS_PER_HOUR = 44;

function toDateOnly(value: string) {
  return value.includes("T") ? value.split("T")[0] : value;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
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

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getIsoWeekNumber(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatTimeLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export default function StudyCalendar({ courses, plans, workouts = [], schedules = [], assignments = [], logs, dict, initialDate }: StudyCalendarProps) {
  const router = useRouter();
  const anchorToday = initialDate ?? new Date();
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const [monthCursor, setMonthCursor] = useState(new Date(anchorToday.getFullYear(), anchorToday.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(startOfWeek(anchorToday));
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [openWeekPopoverKey, setOpenWeekPopoverKey] = useState<string | null>(null);
  const [selectedSmallDateKey, setSelectedSmallDateKey] = useState<string>(() => formatDateKey(anchorToday));
  const [localLogs, setLocalLogs] = useState<StudyLog[]>(logs);
  const [pendingEventKeys, setPendingEventKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLocalLogs(logs);
  }, [logs]);

  const weekdays =
  (dict.calendar_weekdays as string[] | undefined)?.length === 7 &&
  (dict.calendar_weekdays as string[]).every((d) => d.length >= 3) ?
  dict.calendar_weekdays as string[] :
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames =
  dict.calendar_months as string[] | undefined ||
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const courseMap = useMemo(
    () => new Map(courses.map((course) => [course.id, course])),
    [courses]
  );

  const allEvents = useMemo(() => {
    const items: CalendarEvent[] = [];

    const dateStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 2, 1);
    const dateEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 3, 0);
    const todayIso = formatDateKey(new Date());

    // 1. Assignments
    for (const ass of assignments) {
      if (!ass.due_on) continue;
      const date = toDateOnly(ass.due_on);
      const cursor = new Date(date);
      if (cursor < dateStart || cursor > dateEnd) continue;

      const log = localLogs.find((entry) => entry.course_assignment_id === ass.id);

      items.push({
        key: `assignment:${ass.id}`,
        planId: null,
        assignmentId: ass.id,
        courseId: ass.course_id,
        date,
        dayOfWeek: cursor.getDay(),
        startTime: "09:00:00",
        endTime: "10:00:00",
        startMinutes: 540,
        endMinutes: 600,
        isCompleted: Boolean(log?.is_completed),
        title: ass.label,
        courseCode: ass.courses?.course_code || "Assignment",
        university: ass.courses?.university || "",
        location: null,
        kind: ass.kind || "assignment",
        sourceType: "study_plan",
      });
    }

    // 2. Schedules (Tasks)
    const coursesWithTasksToday = new Set<number>();
    for (const sch of schedules) {
      const date = toDateOnly(sch.schedule_date);
      const cursor = new Date(date);
      if (cursor < dateStart || cursor > dateEnd) continue;
      
      if (date === todayIso) {
        coursesWithTasksToday.add(sch.course_id);
      }

      const log = localLogs.find((entry) => entry.course_schedule_id === sch.id);

      const startMin = 600; 
      const duration = sch.duration_minutes || 60;
      const endMin = startMin + duration;

      items.push({
        key: `task:${sch.id}`,
        planId: null,
        scheduleId: sch.id,
        courseId: sch.course_id,
        date,
        dayOfWeek: cursor.getDay(),
        startTime: "10:00:00",
        endTime: "11:00:00",
        startMinutes: startMin,
        endMinutes: endMin,
        isCompleted: Boolean(log?.is_completed),
        title: sch.task_title,
        courseCode: sch.courses?.course_code || "Task",
        university: sch.courses?.university || "",
        location: sch.focus,
        kind: sch.task_kind || "task",
        sourceType: "study_plan",
      });
    }

    // 3. Study Plans
    for (const plan of plans) {
      if (!plan.courses) continue;
      const days = (plan.days_of_week || []).
      map((v) => typeof v === "number" ? v : Number(v)).
      filter((v) => Number.isInteger(v) && v >= 0 && v <= 6);
      if (days.length === 0) continue;

      const startDate = new Date(plan.start_date);
      const endDate = new Date(plan.end_date);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;

      const from = startDate > dateStart ? startDate : dateStart;
      const to = endDate < dateEnd ? endDate : dateEnd;

      for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
        const dayOfWeek = cursor.getDay();
        if (!days.includes(dayOfWeek)) continue;

        const date = formatDateKey(cursor);
        
        // If today has specific tasks for this course, skip the recurring study plan
        if (date === todayIso && coursesWithTasksToday.has(plan.course_id)) {
          continue;
        }

        const log = localLogs.find((entry) => entry.plan_id === plan.id && toDateOnly(entry.log_date) === date);
        const startMinutes = parseMinutes(plan.start_time);
        const endMinutes = parseMinutes(plan.end_time);

        items.push({
          key: `${plan.id}:${date}`,
          planId: plan.id,
          courseId: plan.course_id,
          date,
          dayOfWeek,
          startTime: plan.start_time,
          endTime: plan.end_time,
          startMinutes,
          endMinutes,
          isCompleted: Boolean(log?.is_completed),
          title: plan.courses.title,
          courseCode: plan.courses.course_code,
          university: plan.courses.university,
          credit: courseMap.get(plan.course_id)?.credit,
          location: plan.location,
          kind: plan.kind || "session",
          sourceType: "study_plan",
        });
      }
    }

    for (const workout of workouts) {
      const dayOfWeek = parseWorkoutDayOfWeek(workout.day_of_week);
      if (
        dayOfWeek == null ||
        !workout.start_date ||
        !workout.end_date ||
        !workout.start_time ||
        !workout.end_time
      ) {
        continue;
      }

      const startDate = new Date(workout.start_date);
      const endDate = new Date(workout.end_date);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;

      const from = startDate > dateStart ? startDate : dateStart;
      const to = endDate < dateEnd ? endDate : dateEnd;
      const startMinutes = parseMinutes(workout.start_time);
      const endMinutes = parseMinutes(workout.end_time);

      for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
        if (cursor.getDay() !== dayOfWeek) continue;

        items.push({
          key: `workout:${workout.id}:${formatDateKey(cursor)}`,
          planId: null,
          courseId: null,
          date: formatDateKey(cursor),
          dayOfWeek,
          startTime: workout.start_time,
          endTime: workout.end_time,
          startMinutes,
          endMinutes,
          isCompleted: false,
          title: workout.title,
          courseCode: workout.category || "Workout",
          university: workout.source || "Workout",
          location: workout.location,
          kind: "workout",
          sourceType: "workout",
        });
      }
    }

    return items.sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  }, [courseMap, localLogs, plans, monthCursor, workouts, schedules, assignments]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of allEvents) {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    }
    for (const [key, list] of map.entries()) {
      map.set(
        key,
        [...list].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes)
      );
    }
    return map;
  }, [allEvents]);

  const todayKey = formatDateKey(anchorToday);
  const activeDateKey = selectedSmallDateKey || todayKey;
  const todayEvents = useMemo(() => {
    const list = eventsByDate.get(todayKey) || [];
    return [...list].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes;
    });
  }, [eventsByDate, todayKey]);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const smallCalendarLabel = `${monthNames[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;
  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).getDay();
  const monthGrid = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const weekLabel = `${monthNames[weekDates[0].getMonth()]} ${weekDates[0].getDate()} - ${monthNames[weekDates[6].getMonth()]} ${
  weekDates[6].getDate()}, ${
  weekDates[6].getFullYear()}`;
  const weekNumber = getIsoWeekNumber(weekDates[0]);

  const timelineHeight = (HOUR_END - HOUR_START) * PIXELS_PER_HOUR;
  const currentDayKey = formatDateKey(anchorToday);
  const isTodayVisibleInWeek = weekDates.some((date) => formatDateKey(date) === currentDayKey);
  const currentTimeTop =
    ((anchorToday.getHours() * 60 + anchorToday.getMinutes()) - HOUR_START * 60) / 60 * PIXELS_PER_HOUR;
  const currentTimeLabel = formatTimeLabel(anchorToday);

  useEffect(() => {
    if (!isTodayVisibleInWeek || !timelineScrollRef.current) return;

    const container = timelineScrollRef.current;
    const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
    const nextScrollTop = Math.min(Math.max(currentTimeTop - container.clientHeight / 2, 0), maxScrollTop);

    container.scrollTo({ top: nextScrollTop, behavior: "smooth" });
  }, [currentTimeTop, isTodayVisibleInWeek, weekStart]);

  const setOptimisticCompletion = (planId: number | null, date: string, isCompleted: boolean, scheduleId?: number | null, assignmentId?: number | null) => {
    setLocalLogs((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((entry) => {
        if (planId && entry.plan_id === planId && toDateOnly(entry.log_date) === date) return true;
        if (scheduleId && entry.course_schedule_id === scheduleId) return true;
        if (assignmentId && entry.course_assignment_id === assignmentId) return true;
        return false;
      });

      if (existingIndex >= 0) {
        next[existingIndex] = {
          ...next[existingIndex],
          is_completed: isCompleted,
        };
        return next;
      }
      next.push({
        id: -Date.now(),
        plan_id: planId,
        course_schedule_id: scheduleId,
        course_assignment_id: assignmentId,
        log_date: date,
        is_completed: isCompleted,
        notes: null,
      });
      return next;
    });
  };

  const handleToggleComplete = async (event: CalendarEvent) => {
    if (event.sourceType !== "study_plan") return;
    const previous = event.isCompleted;
    setPendingEventKeys((current) => ({ ...current, [event.key]: true }));
    setOptimisticCompletion(event.planId, event.date, !previous, event.scheduleId, event.assignmentId);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle_complete",
          planId: event.planId,
          scheduleId: event.scheduleId,
          assignmentId: event.assignmentId,
          date: event.date,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle event completion");
      }

      setSelectedEventKey(null);
      setOpenWeekPopoverKey(null);
      router.refresh();
    } catch {
      setOptimisticCompletion(event.planId, event.date, previous, event.scheduleId, event.assignmentId);
    } finally {
      setPendingEventKeys((current) => {
        const next = { ...current };
        delete next[event.key];
        return next;
      });
    }
  };

  const renderToggleButton = (event: CalendarEvent) => (
    event.sourceType !== "study_plan" ? null :
    <Button
      variant="outline"
      size="sm"
      type="button"
      disabled={Boolean(pendingEventKeys[event.key])}
      onClick={() => handleToggleComplete(event)}
      aria-label={event.isCompleted ? `mark incomplete ${event.title}` : `mark complete ${event.title}`}
      className="h-7 px-2 text-[11px]"
    >
      {pendingEventKeys[event.key] ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
      {event.isCompleted ? "Mark incomplete" : "Mark complete"}
    </Button>
  );

  const getTodayRowClassName = (event: CalendarEvent) =>
    event.sourceType === "workout"
      ? "border-stone-200 bg-white text-[#0f172a] hover:bg-stone-50"
      :
    event.isCompleted
      ? "border-stone-200 bg-stone-100 text-stone-400"
      : "border-stone-200 bg-white text-[#0f172a] hover:bg-stone-50";
  const resetToToday = () => {
    const now = initialDate ?? new Date();
    const nowKey = formatDateKey(now);
    setWeekStart(startOfWeek(now));
    setSelectedSmallDateKey(nowKey);
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  };
  const getEventMetaLine = (event: CalendarEvent) => {
    if (typeof event.credit === "number") return `${event.credit} · ${event.university}`;
    return `${event.courseCode} · ${event.university}`;
  };
  const getEventDurationLabel = (event: CalendarEvent) => {
    const durationMinutes = Math.max(0, event.endMinutes - event.startMinutes);
    if (!durationMinutes) return "0m";
    return `${durationMinutes}m`;
  };


  return (
    <div className="h-full overflow-hidden">
      <div className="h-full lg:grid lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-0">
        <div
          className="flex h-full min-h-0 flex-col border-r border-[#f5f5f5] pr-2"
          data-testid="calendar-left-column"
        >
          <section className="flex min-h-0 flex-1 flex-col rounded-lg py-0 pr-0">
            <div className="mb-2 flex h-14 items-center rounded-lg px-2" data-testid="today-heading">
              <h3
                className="text-xl font-medium tracking-tight text-[#1f2937]"
                data-testid="today-header-title"
              >
                Today
              </h3>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-auto pb-4 pr-1" data-testid="today-events-list">
              {todayEvents.length > 0 ?
              <div className="space-y-2">
                  {todayEvents.map((event) =>
                <div key={event.key} data-testid="today-event-card">
                  <Button
                    variant="ghost"
                    className={`h-auto w-full justify-start px-0 py-0 text-left hover:bg-transparent ${event.isCompleted ? "opacity-80" : ""}`}
                    type="button"
                    aria-label={
                      event.sourceType === "workout"
                        ? `View event ${event.title}`
                        : `Toggle completion for ${event.title}`
                    }
                    onClick={() => {
                      setWeekStart(startOfWeek(new Date(event.date)));
                      setSelectedEventKey(event.key);
                      setOpenWeekPopoverKey(null);
                      if (event.sourceType === "study_plan") {
                        void handleToggleComplete(event);
                      } else {
                        setOpenWeekPopoverKey(event.key);
                      }
                    }}
                  >
                    <Card size="small" className={`w-full transition-colors border-border shadow-none ${getTodayRowClassName(event)}`}>
                      <CardContent className="flex items-start gap-2 p-2.5">
                        {event.sourceType === "study_plan" ? (
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                              event.isCompleted ? "border-stone-400 bg-stone-400 text-white" : "border-stone-300 bg-white"
                            }`}
                          >
                            {event.isCompleted ? <span className="text-[10px] leading-none">✓</span> : ""}
                          </span>
                        ) : (
                          <span
                            aria-hidden="true"
                            className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-stone-300 bg-white text-[#64748b]"
                          >
                            <Coffee className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <Item size="sm" className="w-full px-0 py-0 bg-transparent border-0 shadow-none h-auto min-h-0">
                          <ItemContent className="gap-0.5">
                            <p className={`text-[10px] font-medium uppercase tracking-wider leading-none mb-1 ${event.isCompleted ? "text-stone-400" : "text-muted-foreground/80"}`}>
                              {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                            </p>
                            <ItemTitle className={`w-full whitespace-normal break-words text-[14px] font-medium tracking-tight leading-tight ${event.isCompleted ? "text-stone-500 line-through" : "text-[#0f172a]"}`}>
                              {event.title}
                            </ItemTitle>
                            <div className={`w-full flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium uppercase tracking-wider mt-1 ${event.isCompleted ? "text-stone-400" : "text-muted-foreground/70"}`}>
                              <span>{getEventMetaLine(event).split(' · ')[0]}</span>
                              {event.location && (
                                <>
                                  <span className="text-muted-foreground/30 text-[8px] tracking-normal">·</span>
                                  <span>{event.location}</span>
                                </>
                              )}
                            </div>
                          </ItemContent>
                        </Item>
                      </CardContent>
                    </Card>
                  </Button>
                    </div>
                )}
                </div> :

              <div
                className="flex min-h-[240px] flex-col items-center justify-center px-5 text-center"
                data-testid="today-empty-state"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border">
                  <Coffee className="h-5 w-5 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-foreground">
                  Rest Day
                </h3>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  No activities
                </p>
                <p className="mt-3 max-w-[200px] text-sm leading-6 text-muted-foreground">
                  Rest today, study tomorrow.
                </p>
              </div>
              }
            </div>
          </section>

          <div className="px-2 my-2">
            <div className="h-px bg-[#f5f5f5] w-full" />
          </div>

          <div className="mt-auto rounded-lg px-0 pt-1" data-testid="mini-calendar-section">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#1f2937]">{smallCalendarLabel}</h3>
              <div className="flex items-center gap-1" data-testid="mini-calendar-controls">
                <Button variant="outline"
                size="icon"
                className="h-7 w-7"
                type="button"
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}

                aria-label="Previous month">
                  
                  <ChevronLeft className="mx-auto" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  type="button"
                  onClick={resetToToday}
                  aria-label="Mini calendar today"
                >
                  Today
                </Button>
                <Button variant="outline"
                size="icon"
                className="h-7 w-7"
                type="button"
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}

                aria-label="Next month">
                  
                  <ChevronRight className="mx-auto" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-[11px]">
              {weekdays.map((day, idx) =>
              <div key={`${day}-${idx}`} className="text-center text-[#64748b] py-1 font-medium">
                  {day}
                </div>
              )}
              {monthGrid.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-7" />;
                }
                const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
                const dateKey = formatDateKey(date);
                const isActiveDay = dateKey === activeDateKey;
                const hasEvent = (eventsByDate.get(dateKey) || []).length > 0;
                return (
                  <Button variant="ghost"
                  className="h-7 p-0 hover:bg-transparent"
                  key={dateKey}
                  type="button"
                  onClick={() => {
                    setWeekStart(startOfWeek(date));
                    setSelectedSmallDateKey(dateKey);
                  }}>

                    
                    <span
                      className={`h-6 w-6 inline-flex items-center justify-center rounded-full ${
                      isActiveDay ?
                      " bg-[#111111] text-white" :
                      hasEvent ?
                      " text-[#334155] font-semibold" :
                      " text-[#334155]"}`
                      }>
                      
                      {day}
                    </span>
                  </Button>);

              })}
            </div>
          </div>
        </div>

        <section className="bg-transparent overflow-hidden h-full min-h-0 relative flex flex-col">
          <div className="mb-2 flex h-14 items-center justify-between rounded-lg px-2" data-testid="week-header">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80 leading-none mb-1.5">
                Week {weekNumber}
              </p>
              <h2
                className="truncate text-xl font-medium tracking-tight text-[#0f172a] leading-none"
                data-testid="week-header-title"
              >
                {weekLabel}
              </h2>
            </div>
            <div className="ml-3 flex items-center gap-1">
              <Button variant="outline"
              size="sm"
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}

              aria-label="Previous week">
                
                <ChevronLeft />
              </Button>
              <Button variant="outline"
              size="sm"
              type="button"
              onClick={resetToToday}

              aria-label="Today">
                
                Today
              </Button>
              <Button variant="outline"
              size="sm"
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}

              aria-label="Next week">
                
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div
            ref={timelineScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4"
            data-testid="calendar-timeline-scroll"
          >
            <div className="relative w-full">
              <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] w-full">
              <div className="border-r border-[#f5f5f5] bg-[#fafafa]">
                <div className="h-10 sticky top-0 z-30 bg-[#f5f5f5]" />
                {Array.from({ length: HOUR_END - HOUR_START }).map((_, hourIndex) =>
                <div
                  key={hourIndex}
                  className="flex items-center justify-end pr-2 text-[10px] text-[#6b7280]"

                  style={{ height: PIXELS_PER_HOUR }}>
                  
                    {String(HOUR_START + hourIndex).padStart(2, "0")}:00
                </div>
                )}
              </div>

              {weekDates.map((date, i) => {
                const dayKey = formatDateKey(date);
                const dayEvents = eventsByDate.get(dayKey) || [];
                const isActiveColumn = dayKey === activeDateKey;
                return (
                  <div
                    key={dayKey}
                    className={`relative border-r border-[#f5f5f5] last:border-r-0 ${
                    isActiveColumn ? "bg-[#fafafa]" : ""}`
                    }>
                    
                    <div className="sticky top-0 z-20 flex h-10 items-center justify-between bg-[#f5f5f5] px-2">
                      <span
                        className={`text-xs ${
                        isActiveColumn ? "text-[#111111] font-semibold" : "text-[#334155]"}`
                        }>
                        
                        {weekdays[i]}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                        isActiveColumn ?
                        "text-white bg-[#111111] h-6 w-6 rounded-full inline-flex items-center justify-center" :
                        "text-[#0f172a]"}`
                        }>
                        
                        {date.getDate()}
                      </span>
                    </div>

                    <div className="relative" style={{ height: timelineHeight }}>
                      {Array.from({ length: HOUR_END - HOUR_START }).map((_, hourIndex) =>
                      <div
                        key={hourIndex}
                        className="absolute left-0 right-0"
                        style={{ top: hourIndex * PIXELS_PER_HOUR }} />

                      )}

                      {dayEvents.map((event) => {
                        const top = (event.startMinutes - HOUR_START * 60) / 60 * PIXELS_PER_HOUR;
                        const rawHeight = (event.endMinutes - event.startMinutes) / 60 * PIXELS_PER_HOUR;
                        const height = Math.max(rawHeight, 30);
                        const isSelected = selectedEventKey === event.key;
                        return (
                          <Popover
                            key={event.key}
                            open={openWeekPopoverKey === event.key}
                            onOpenChange={(open) => {
                              if (!open && openWeekPopoverKey === event.key) {
                                setOpenWeekPopoverKey(null);
                                if (selectedEventKey === event.key) {
                                  setSelectedEventKey(null);
                                }
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button variant="ghost"
                              className="absolute left-1 right-1 p-0 h-auto"
                              data-testid={`week-event-${event.key}`}
                              data-selected={isSelected ? "true" : "false"}
                              type="button"
                              onClick={() => {
                                setSelectedEventKey(event.key);
                                setOpenWeekPopoverKey(event.key);
                              }}
                              style={{ top, height }}>
                                <Card size="small" className={cn(
                                  "h-full w-full overflow-hidden transition-all border-border shadow-none",
                                  isSelected ? "bg-[#111111] text-white border-transparent" : "bg-[#f8fafc] text-[#0f172a] hover:bg-[#eef2f7]"
                                )}>
                                  <CardContent className="relative h-full w-full">
                                    {event.isCompleted ? (
                                      <span
                                        className={`absolute right-1 top-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                                          isSelected ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700"
                                        }`}
                                        data-testid="week-event-complete-icon"
                                      >
                                        <Check className="h-2 w-2" />
                                      </span>
                                    ) : null}
                                    <div className="flex flex-col h-full justify-between">
                                      <div>
                                        <p className={`truncate text-[9px] font-medium uppercase tracking-wider ${isSelected ? "text-[#d1d5db]" : "text-[#475569]"}`}>
                                          {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                                        </p>
                                        <p className={cn(
                                          "truncate text-[11px] font-medium leading-tight mt-0.5",
                                          isSelected ? "text-white" : "text-[#0f172a]"
                                        )}>
                                          {event.title}
                                        </p>
                                      </div>
                                      <p className={`truncate text-[9px] font-medium uppercase tracking-wider ${isSelected ? "text-[#e5e7eb]" : "text-[#334155]"}`}>
                                        {getEventMetaLine(event).split(' · ')[0]}
                                      </p>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80 rounded-xl px-4 py-3">
                              <PopoverHeader className="space-y-1.5">
                                <PopoverTitle className="text-[14px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#111827] whitespace-normal break-words">
                                  {event.title}
                                </PopoverTitle>
                                <PopoverDescription className="text-[11px] font-medium text-[#6b7280]">
                                  {getEventMetaLine(event)}
                                </PopoverDescription>
                              </PopoverHeader>
                              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-4">
                                <div className="space-y-2.5 text-[12px] leading-5 text-[#374151]">
                                  <div className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                                    <p className="whitespace-normal break-words">{event.location || "No location"}</p>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                                    <p className="whitespace-normal break-words">{event.kind}</p>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                                    <p className="whitespace-normal break-words">
                                      {getEventDurationLabel(event)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-end justify-end">
                                  {renderToggleButton(event)}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>);

                      })}
                    </div>
                  </div>);

              })}
              </div>
              {isTodayVisibleInWeek ? (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-40"
                  data-testid="current-time-line"
                  style={{ top: 40 + Math.max(currentTimeTop, 0) }}
                >
                  <div className="relative flex items-center">
                    <div
                      className="flex w-[56px] items-center justify-end"
                      data-testid="current-time-label-slot"
                    >
                      <span className="inline-flex h-5 shrink-0 items-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-semibold text-white">
                        {currentTimeLabel}
                      </span>
                    </div>
                    <div
                      className="h-px flex-1 bg-[#ef4444]"
                      data-testid="current-time-line-segment"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>

    </div>);

}
