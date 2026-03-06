"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DatabaseScheduleRow } from "@/lib/overview-routine";

interface EnrolledCourse {
  id: number;
  course_code: string;
  university: string;
  title: string;
  credit?: number;
}

interface StudyCalendarProps {
  courses: EnrolledCourse[];
  scheduleRows: DatabaseScheduleRow[];
  dict: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  initialDate?: Date;
}

interface CalendarEvent {
  key: string;
  planId: number | null;
  scheduleId: number | null;
  assignmentId: number | null;
  workoutId: number | null;
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
  sourceType: "study_plan" | "workout" | "assignment";
}

const HOUR_START = 0;
const HOUR_END = 24;
const PIXELS_PER_HOUR = 44;

function parseMinutes(time: string | null) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
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

export default function StudyCalendar({ courses, scheduleRows, dict, initialDate }: StudyCalendarProps) {
  const router = useRouter();
  const anchorToday = initialDate ?? new Date();
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const [monthCursor, setMonthCursor] = useState(new Date(anchorToday.getFullYear(), anchorToday.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(startOfWeek(anchorToday));
  const [openWeekPopoverKey, setOpenWeekPopoverKey] = useState<string | null>(null);
  const [selectedSmallDateKey, setSelectedSmallDateKey] = useState<string>(() => formatDateKey(anchorToday));
  const [pendingEventKeys, setPendingEventKeys] = useState<Record<string, boolean>>({});

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
    return scheduleRows.map((row) => {
      const startMinutes = parseMinutes(row.start_time);
      const endMinutes = parseMinutes(row.end_time);
      
      let uiSourceType: "study_plan" | "workout" | "assignment" = "study_plan";
      if (row.source_type === 'workout') uiSourceType = 'workout';
      else if (row.source_type === 'assignment' || (row.assignment_id != null && row.source_type === 'study_plan')) uiSourceType = 'assignment';

      return {
        key: `${row.source_type}:${row.plan_id || row.schedule_id || row.assignment_id || row.workout_id}:${row.event_date}`,
        planId: row.plan_id,
        scheduleId: row.schedule_id,
        assignmentId: row.assignment_id,
        workoutId: row.workout_id,
        courseId: row.course_id,
        date: row.event_date,
        dayOfWeek: new Date(row.event_date).getDay(),
        startTime: row.start_time || "00:00:00",
        endTime: row.end_time || "00:00:00",
        startMinutes,
        endMinutes,
        isCompleted: row.is_completed,
        title: row.title,
        courseCode: row.course_code,
        university: row.university,
        credit: row.course_id ? courseMap.get(row.course_id)?.credit : undefined,
        location: row.location,
        kind: row.kind,
        sourceType: uiSourceType,
      } as CalendarEvent;
    });
  }, [scheduleRows, courseMap]);

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
    const list = eventsByDate.get(activeDateKey) || [];
    return [...list].sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      return a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes;
    });
  }, [eventsByDate, activeDateKey]);

  const timelineEventsByDate = useMemo(() => {
    const filteredMap = new Map<string, CalendarEvent[]>();
    for (const [date, list] of eventsByDate.entries()) {
      const filtered = list.filter(event => !(event.sourceType === "study_plan" && event.planId && !event.scheduleId && !event.assignmentId));
      filteredMap.set(date, filtered);
    }
    return filteredMap;
  }, [eventsByDate]);

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
  }, [isTodayVisibleInWeek, currentTimeTop]);

  const nextMonth = () => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1));
  const prevMonth = () => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1));
  const nextWeek = () => setWeekStart(addDays(weekStart, 7));
  const prevWeek = () => setWeekStart(addDays(weekStart, -7));
  const resetToToday = () => {
    const now = new Date();
    const nowKey = formatDateKey(now);
    setWeekStart(startOfWeek(now));
    setSelectedSmallDateKey(nowKey);
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  };
  const getEventMetaLine = (event: CalendarEvent) => {
    const parts: string[] = [];
    if (typeof event.credit === "number") parts.push(`${event.credit}`);
    parts.push(event.courseCode);
    if (event.kind && event.kind !== "task" && event.kind !== "study") {
      parts.push(event.kind);
    }
    return parts.join(" · ");
  };
  const getEventDurationLabel = (event: CalendarEvent) => {
    const durationMinutes = Math.max(0, event.endMinutes - event.startMinutes);
    if (!durationMinutes) return "0m";
    return `${durationMinutes}m`;
  };

  const getEventStyle = (event: CalendarEvent) => {
    const top = ((event.startMinutes - HOUR_START * 60) / 60) * PIXELS_PER_HOUR;
    const height = Math.max(20, ((event.endMinutes - event.startMinutes) / 60) * PIXELS_PER_HOUR);
    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const toggleEventCompletion = async (event: CalendarEvent) => {
    setPendingEventKeys((prev) => ({ ...prev, [event.key]: true }));
    try {
      const isWorkout = event.sourceType === "workout";
      const endpoint = isWorkout ? "/api/workouts/attendance" : "/api/schedule";
      
      const payload = isWorkout 
        ? { workoutId: event.workoutId, date: event.date }
        : {
            action: "toggle_complete",
            planId: event.planId,
            scheduleId: event.scheduleId,
            assignmentId: event.assignmentId,
            date: event.date,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to toggle completion:", err);
    } finally {
      setPendingEventKeys((prev) => ({ ...prev, [event.key]: false }));
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-6 lg:w-[280px]">
        <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{smallCalendarLabel}</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" onClick={prevMonth} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={nextMonth} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground/60 mb-2">
            {weekdays.map((d) => <div key={d}>{d[0]}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
              const key = formatDateKey(date);
              const isSelected = selectedSmallDateKey === key;
              const isToday = key === todayKey;
              const hasEvents = eventsByDate.has(key);

              return (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedSmallDateKey(key);
                    setWeekStart(startOfWeek(date));
                  }}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all",
                    isSelected ? "bg-primary font-bold text-primary-foreground shadow-md" : "hover:bg-muted",
                    isToday && !isSelected && "bg-muted/50 font-bold text-primary ring-1 ring-inset ring-primary/30"
                  )}
                >
                  {day}
                  {hasEvents && !isSelected && (
                    <div className="absolute bottom-1 h-1 w-1 rounded-full bg-primary/40" />
                  )}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            className="mt-4 w-full text-xs font-semibold"
            size="sm"
            type="button"
            onClick={resetToToday}
            aria-label="Mini calendar today"
          >
            Today
          </Button>
        </div>

        <div className="flex flex-col rounded-2xl border border-border bg-background p-4 shadow-sm lg:h-[calc(100%-340px)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Today&apos;s Routine</h2>
            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
              {todayEvents.length} items
            </Badge>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            {todayEvents.length > 0 ? (
              <div className="space-y-2 pb-2">
                {todayEvents.map((event) => (
                  <Card
                    key={event.key}
                    className={cn(
                      "group relative transition-all hover:shadow-md border-border/50",
                      event.isCompleted && "opacity-60 grayscale-[0.5]"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="line-clamp-1 text-[13px] font-bold text-foreground leading-tight">{event.title}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/80 font-medium">
                            <span className="shrink-0">{event.courseCode}</span>
                            <span className="shrink-0 text-muted-foreground/30">•</span>
                            <span className="shrink-0">{getEventDurationLabel(event)}</span>
                            {event.kind && (
                              <>
                                <span className="shrink-0 text-muted-foreground/30">•</span>
                                <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold uppercase leading-none tracking-tight">
                                  {event.kind}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleEventCompletion(event)}
                          disabled={pendingEventKeys[event.key]}
                          className={cn(
                            "mt-0.5 h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center shrink-0",
                            event.isCompleted
                              ? "bg-primary border-primary text-primary-foreground shadow-sm"
                              : "border-muted-foreground/20 hover:border-primary/50 bg-background"
                          )}
                        >
                          {pendingEventKeys[event.key] ? (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                          ) : event.isCompleted ? (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-2 rounded-full bg-muted p-3">
                  <Clock className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-wider">No events scheduled</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-muted/5 p-4 lg:px-6">
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{weekLabel}</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Week {weekNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" onClick={prevWeek} aria-label="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={nextWeek} aria-label="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          <div className="w-12 shrink-0 border-r border-border bg-muted/5 flex flex-col pt-[44px]">
            {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
              <div key={i} className="h-11 border-b border-border/30 px-2 py-1 text-right">
                <span className="text-[10px] font-bold text-muted-foreground/40">{(HOUR_START + i).toString().padStart(2, "0")}</span>
              </div>
            ))}
          </div>

          <div ref={timelineScrollRef} className="flex-1 overflow-auto relative custom-scrollbar">
            <div className="flex min-w-[800px] h-full" style={{ height: `${timelineHeight}px` }}>
              {weekDates.map((date) => {
                const key = formatDateKey(date);
                const dayEvents = timelineEventsByDate.get(key) || [];
                const isToday = key === todayKey;

                return (
                  <div key={key} className={cn("flex-1 relative border-r border-border/50", isToday && "bg-primary/[0.02]")}>
                    <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur h-11 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{weekdays[date.getDay()][0]}</span>
                      <span className={cn("text-xs font-bold", isToday && "text-primary")}>{date.getDate()}</span>
                    </div>

                    <div className="relative h-full">
                      {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
                        <div key={i} className="h-11 border-b border-border/30" />
                      ))}

                      {dayEvents.map((event) => (
                        <Popover
                          key={event.key}
                          open={openWeekPopoverKey === event.key}
                          onOpenChange={(open) => setOpenWeekPopoverKey(open ? event.key : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              style={getEventStyle(event)}
                              className={cn(
                                "absolute left-1 right-1 rounded-md border-l-4 px-2 py-1 text-left transition-all hover:z-20 hover:scale-[1.02] hover:shadow-lg",
                                event.sourceType === "workout"
                                  ? "border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                                  : "border-blue-500 bg-blue-500/10 hover:bg-blue-500/20",
                                event.isCompleted && "opacity-60 grayscale-[0.3]"
                              )}
                            >
                              <p className="truncate text-[11px] font-bold leading-tight text-foreground">{event.title}</p>
                              <div className="mt-0.5 flex items-center gap-1.5 opacity-70">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="text-[9px] font-bold uppercase leading-none">{event.startTime.slice(0, 5)}</span>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-0 shadow-2xl" side="right" align="start" sideOffset={8}>
                            <div className={cn("h-1.5 w-full rounded-t-lg", event.sourceType === "workout" ? "bg-emerald-500" : "bg-blue-500")} />
                            <div className="p-4 space-y-4">
                              <div className="space-y-1.5">
                                <h3 className="text-sm font-bold text-foreground leading-tight">{event.title}</h3>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight">
                                    {event.courseCode}
                                  </Badge>
                                  {event.kind && (
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tight">
                                      {event.kind}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2 border-t border-border pt-3">
                                <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50">
                                    <Clock className="h-3.5 w-3.5" />
                                  </div>
                                  <span>{event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50">
                                      <MapPin className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="line-clamp-1">{event.location}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant={event.isCompleted ? "outline" : "default"}
                                  className="flex-1 text-xs font-bold uppercase tracking-wide h-9"
                                  onClick={() => toggleEventCompletion(event)}
                                  disabled={pendingEventKeys[event.key]}
                                >
                                  {pendingEventKeys[event.key] ? (
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  ) : null}
                                  {event.isCompleted ? "Undo" : event.sourceType === "workout" ? "Mark attended" : "Mark complete"}
                                </Button>
                                {event.courseId && (
                                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" asChild>
                                    <a href={`/courses/${event.courseId}`} title="Go to course">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ))}
                    </div>
                  </div>
                );
              })}

              {isTodayVisibleInWeek && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-30 flex items-center gap-2 border-t-2 border-primary"
                  style={{ top: `${currentTimeTop + 44}px` }}
                >
                  <Badge variant="default" className="ml-[-1px] rounded-l-none text-[9px] font-bold uppercase h-4 px-1.5 shadow-md">
                    {currentTimeLabel}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
