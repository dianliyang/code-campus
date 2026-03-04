"use client";

import { useMemo, useState } from "react";
import { Course } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemSeparator,
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

export default function StudyCalendar({ courses, plans, logs, dict, initialDate }: StudyCalendarProps) {
  const anchorToday = initialDate ?? new Date();
  const [monthCursor, setMonthCursor] = useState(new Date(anchorToday.getFullYear(), anchorToday.getMonth(), 1));
  const [weekStart, setWeekStart] = useState(startOfWeek(anchorToday));
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [selectedSmallDateKey, setSelectedSmallDateKey] = useState<string>(() => formatDateKey(anchorToday));

  const weekdays =
  (dict.calendar_weekdays as string[] | undefined)?.length === 7 &&
  (dict.calendar_weekdays as string[]).every((d) => d.length >= 3) ?
  dict.calendar_weekdays as string[] :
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames =
  dict.calendar_months as string[] | undefined ||
  ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
        const log = logs.find((entry) => entry.plan_id === plan.id && toDateOnly(entry.log_date) === date);
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
          location: plan.location,
          kind: plan.kind || "session"
        });
      }
    }

    return items.sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  }, [plans, logs, monthCursor]);

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


  return (
    <div className="h-full overflow-hidden">
      <div className="h-full lg:grid lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-0">
        <div className="flex h-full flex-col border-r border-[#f5f5f5] pr-2">
          <section className="min-h-0 rounded-lg p-2">
            <div className="flex h-12 items-center">
              <h3 className="text-base font-semibold text-[#1f2937]">Today</h3>
            </div>
            <div className="max-h-56 overflow-auto pr-1" data-testid="today-events-list">
              {todayEvents.length > 0 ?
              <ItemGroup>
                  {todayEvents.map((event, idx) =>
                <div key={event.key}>
                      <Popover
                    open={selectedEventKey === event.key}
                    onOpenChange={(open) => {
                      if (!open && selectedEventKey === event.key) setSelectedEventKey(null);
                    }}>
                        <PopoverTrigger asChild>
                          <Item
                        asChild
                        size="sm"
                        className="cursor-pointer px-0 py-2"
                        onClick={() => {
                          setWeekStart(startOfWeek(new Date(event.date)));
                          setSelectedEventKey((prev) => prev === event.key ? null : event.key);
                        }}>
                            <button type="button" className="w-full text-left">
                              <ItemContent className="gap-0.5">
                                <p className="text-[10px] text-[#64748b]">
                                  {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                                </p>
                                <ItemTitle className="truncate text-[12px] font-semibold">
                                  {event.title}
                                </ItemTitle>
                                <p className="truncate text-[10px] text-[#475569]">
                                  {event.courseCode} · {event.kind}
                                </p>
                              </ItemContent>
                            </button>
                          </Item>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-80">
                          <PopoverHeader>
                            <PopoverTitle>{event.title}</PopoverTitle>
                            <PopoverDescription>{event.courseCode} · {event.kind}</PopoverDescription>
                          </PopoverHeader>
                          <div className="space-y-2 text-sm text-[#334155]">
                            <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}</p>
                            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location || "No location"}</p>
                            <p className="text-xs text-[#64748b]">{event.university}</p>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {idx < todayEvents.length - 1 ? <ItemSeparator /> : null}
                    </div>
                )}
                </ItemGroup> :

              <p className="py-4 text-center text-xs text-[#64748b]">{dict.calendar_no_events}</p>
              }
            </div>
          </section>

          <div className="mt-auto rounded-lg p-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[#1f2937]">{smallCalendarLabel}</h3>
              <div className="flex gap-1">
                <Button variant="outline"
                size="icon"
                className="h-7 w-7"
                type="button"
                onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}

                aria-label="Previous month">
                  
                  <ChevronLeft className="mx-auto" />
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
                const isToday = dateKey === todayKey;
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
                      dateKey === selectedSmallDateKey ?
                      " bg-[#111111] text-white" :
                      isToday ?
                      " border border-[#111111] text-[#111111]" :
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

        <section className="mt-4 lg:mt-0 bg-transparent overflow-hidden h-full min-h-0 relative flex flex-col">
          <div className="mb-2 flex h-12 items-center justify-between rounded-lg px-2">
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">{`Week ${weekNumber}`}</h2>
              <p className="text-xs text-[#64748b]">{weekLabel}</p>
            </div>
            <div className="flex items-center gap-1">
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
              onClick={() => {
                const now = initialDate ?? new Date();
                const nowKey = formatDateKey(now);
                setWeekStart(startOfWeek(now));
                setSelectedSmallDateKey(nowKey);
                setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              }}

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

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
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
                const isSelectedColumn = dayKey === selectedSmallDateKey;
                const isTodayColumn = dayKey === todayKey;
                return (
                  <div
                    key={dayKey}
                    className={`relative border-r border-[#f5f5f5] last:border-r-0 ${
                    isSelectedColumn ? "bg-[#fafafa]" : isTodayColumn ? "bg-[#fcfcfc]" : ""}`
                    }>
                    
                    <div className="sticky top-0 z-20 flex h-10 items-center justify-between bg-[#f5f5f5] px-2">
                      <span
                        className={`text-xs ${
                        isSelectedColumn || isTodayColumn ? "text-[#111111] font-semibold" : "text-[#334155]"}`
                        }>
                        
                        {weekdays[i]}
                      </span>
                      <span
                        className={`text-xs font-semibold ${
                        isSelectedColumn || isTodayColumn ?
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
                            open={selectedEventKey === event.key}
                            onOpenChange={(open) => {
                              if (!open && selectedEventKey === event.key) setSelectedEventKey(null);
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
                              onClick={() => setSelectedEventKey((prev) => prev === event.key ? null : event.key)}
                              style={{ top, height }}>
                                <div className="h-full w-full overflow-hidden">
                                  <p className={`truncate text-[10px] font-medium ${isSelected ? "text-[#d1d5db]" : "text-[#475569]"}`}>
                                    {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}
                                  </p>
                                  <p className={`mt-0.5 truncate text-[11px] font-semibold leading-tight ${isSelected ? "text-white" : ""}`}>
                                    {event.title}
                                  </p>
                                  <p className={`mt-0.5 truncate text-[10px] ${isSelected ? "text-[#e5e7eb]" : "text-[#334155]"}`}>
                                    {event.courseCode}
                                  </p>
                                  <p className={`truncate text-[10px] ${isSelected ? "text-[#d1d5db]" : "text-[#64748b]"}`}>
                                    {event.location || event.kind}
                                  </p>
                                </div>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80">
                              <PopoverHeader>
                                <PopoverTitle>{event.title}</PopoverTitle>
                                <PopoverDescription>{event.courseCode} · {event.kind}</PopoverDescription>
                              </PopoverHeader>
                              <div className="space-y-2 text-sm text-[#334155]">
                                <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> {event.startTime.slice(0, 5)} - {event.endTime.slice(0, 5)}</p>
                                <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.location || "No location"}</p>
                                <p className="text-xs text-[#64748b]">{event.university}</p>
                              </div>
                            </PopoverContent>
                          </Popover>);

                      })}
                    </div>
                  </div>);

              })}
            </div>
          </div>
        </section>
      </div>

    </div>);

}
