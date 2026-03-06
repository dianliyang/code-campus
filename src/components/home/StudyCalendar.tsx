"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  plan_id: number;
  log_date: string;
  is_completed: boolean | null;
  notes: string | null;
}

interface CalendarEvent {
  key: string;
  planId: number;
  courseId: number;
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
}

interface StudyCalendarProps {
  courses: EnrolledCourse[];
  plans: StudyPlan[];
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

export default function StudyCalendar({ courses, plans, logs, dict, initialDate }: StudyCalendarProps) {
  const router = useRouter();
  const anchorToday = initialDate ?? new Date();
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const [monthCursor, setMonthCursor] = useState(new Date(anchorToday.getFullYear(), anchorToday.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(startOfWeek(anchorToday));
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [openTodayPopoverKey, setOpenTodayPopoverKey] = useState<string | null>(null);
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
          kind: plan.kind || "session"
        });
      }
    }

    return items.sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  }, [courseMap, localLogs, plans, monthCursor]);

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
  const todayEvents = eventsByDate.get(todayKey) || [];

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

  const setOptimisticCompletion = (planId: number, date: string, isCompleted: boolean) => {
    setLocalLogs((current) => {
      const next = [...current];
      const existingIndex = next.findIndex((entry) => entry.plan_id === planId && toDateOnly(entry.log_date) === date);
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
        log_date: date,
        is_completed: isCompleted,
        notes: null,
      });
      return next;
    });
  };

  const handleToggleComplete = async (event: CalendarEvent) => {
    const previous = event.isCompleted;
    setPendingEventKeys((current) => ({ ...current, [event.key]: true }));
    setOptimisticCompletion(event.planId, event.date, !previous);

    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "toggle_complete",
          planId: event.planId,
          date: event.date,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle event completion");
      }

      router.refresh();
    } catch {
      setOptimisticCompletion(event.planId, event.date, previous);
    } finally {
      setPendingEventKeys((current) => {
        const next = { ...current };
        delete next[event.key];
        return next;
      });
    }
  };

  const getEventStatusLabel = (event: CalendarEvent) => event.isCompleted ? "Completed" : "Not completed";
  const getEventStatusTone = (event: CalendarEvent) =>
    event.isCompleted ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-100 text-stone-600";

  const renderStatusBadge = (event: CalendarEvent) =>
    event.isCompleted ? (
      <Badge variant="outline" className={`h-5 rounded-full px-1.5 text-[9px] font-semibold uppercase tracking-wide ${getEventStatusTone(event)}`}>
        {getEventStatusLabel(event)}
      </Badge>
    ) : null;

  const renderToggleButton = (event: CalendarEvent) => (
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


  return (
    <div className="h-full overflow-hidden">
      <div className="h-full lg:grid lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-0">
        <div
          className="flex h-full min-h-0 flex-col border-r border-[#f5f5f5] pr-2"
          data-testid="calendar-left-column"
        >
          <section className="flex min-h-0 flex-1 flex-col rounded-lg py-0 pr-0">
            <div className="mb-2 flex h-12 items-center rounded-lg px-2" data-testid="today-heading">
              <h3
                className="text-xl font-semibold leading-none text-[#1f2937]"
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
                    aria-label={`Toggle completion for ${event.title}`}
                    onClick={() => {
                      setWeekStart(startOfWeek(new Date(event.date)));
                      setSelectedEventKey(event.key);
                      setOpenTodayPopoverKey(null);
                      setOpenWeekPopoverKey(null);
                      void handleToggleComplete(event);
                    }}
                  >
                    <div className={`flex w-full items-start gap-2 rounded-md border px-2 py-2 ${getTodayRowClassName(event)}`}>
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                          event.isCompleted ? "border-stone-400 bg-stone-400 text-white" : "border-stone-300 bg-white"
                        }`}
                      >
                        {event.isCompleted ? "✓" : ""}
                      </span>
                      <Item size="sm" className="w-full px-0 py-0">
                        <ItemContent className="gap-0.5">
                          <p className={`text-xs leading-5 ${event.isCompleted ? "text-stone-400" : "text-[#475569]"}`}>
                            {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                          </p>
                          <ItemTitle className={`w-full whitespace-normal break-words text-sm leading-5 font-semibold ${event.isCompleted ? "text-stone-500 line-through" : "text-[#0f172a]"}`}>
                            {event.title}
                          </ItemTitle>
                          <p className={`w-full whitespace-normal break-words text-xs leading-5 ${event.isCompleted ? "text-stone-400" : "text-[#334155]"}`}>
                            {event.courseCode}
                            {event.location ? ` · ${event.location}` : ""}
                          </p>
                        </ItemContent>
                      </Item>
                    </div>
                  </Button>
                    </div>
                )}
                </div> :

              <p className="py-4 text-center text-xs text-[#64748b]">{dict.calendar_no_events}</p>
              }
            </div>
          </section>

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
          <div className="mb-2 grid h-12 grid-cols-[1fr_auto] items-center rounded-lg px-2" data-testid="week-header">
            <div className="min-w-0">
              <p
                className="truncate text-xl font-semibold leading-none text-[#0f172a]"
                data-testid="week-header-title"
              >{`Week ${weekNumber} ${weekLabel}`}</p>
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
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
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
                              <Button variant="outline"
                              className={`absolute left-1 right-1 overflow-hidden rounded-md px-1.5 py-1 text-left ${
                              isSelected ?
                              "bg-[#111111] text-white hover:bg-[#111111] hover:text-white" :
                              "bg-[#f8fafc] text-[#0f172a] hover:bg-[#eef2f7]"}`
                              }
                              type="button"
                              onClick={() => {
                                setSelectedEventKey(event.key);
                                setOpenWeekPopoverKey(event.key);
                                setOpenTodayPopoverKey(null);
                              }}
                              style={{ top, height }}>
                                <div className="h-full w-full overflow-hidden">
                                  <p className={`truncate text-[10px] font-medium ${isSelected ? "text-[#d1d5db]" : "text-[#475569]"}`}>
                                    {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                                  </p>
                                  <p className={`mt-0.5 truncate text-[10px] font-semibold leading-tight ${isSelected ? "text-white" : ""}`}>
                                    {event.title}
                                  </p>
                                  <p className={`mt-0.5 truncate text-[10px] ${isSelected ? "text-[#e5e7eb]" : "text-[#334155]"}`}>
                                    {event.courseCode}
                                  </p>
                                  <div className="mt-1">{renderStatusBadge(event)}</div>
                                </div>
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
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6b7280]" />
                                    <p className="whitespace-normal break-words">
                                      {event.isCompleted ? "Completed" : "Mark complete"}
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
