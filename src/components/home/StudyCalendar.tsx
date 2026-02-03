"use client";

import { useState, useMemo } from "react";
import { Course } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Clock, Moon, Flower2, Check, MapPin, CalendarDays, CalendarCheck } from "lucide-react";

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
  type: string;
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

interface GeneratedEvent {
  planId: number;
  courseId: number;
  date: string;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
  title: string;
  courseCode: string;
  university: string;
  location: string | null;
  type: string;
}

interface StudyCalendarProps {
  courses: EnrolledCourse[];
  plans: StudyPlan[];
  logs: StudyLog[];
  dict: Dictionary['dashboard']['roadmap'];
}

export default function StudyCalendar({ courses, plans, logs, dict }: StudyCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const [isGenerating, setIsGenerating] = useState(false);

  // Get weekdays and months from dictionary
  const weekdays = (dict.calendar_weekdays as string[] | undefined) || ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthNames = (dict.calendar_months as string[] | undefined) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Get calendar info
  const calendarInfo = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDayOfWeek = new Date(y, m, 1).getDay();

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m;
    const today = isCurrentMonth ? now.getDate() : null;

    return { year: y, month: m, daysInMonth, firstDayOfWeek, today };
  }, [currentDate]);

  const { year, month, daysInMonth, firstDayOfWeek, today } = calendarInfo;

  // Generate events for the month
  const eventsByDay = useMemo(() => {
    const map = new Map<number, GeneratedEvent[]>();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = date.getDay();

      plans.forEach(plan => {
        if (!plan.courses) return;

        // Check if date is in range
        if (dateStr < plan.start_date || dateStr > plan.end_date) return;

        // Check if day of week matches
        if (!plan.days_of_week.includes(dayOfWeek)) return;

        // Find completion log
        const log = logs.find(l => l.plan_id === plan.id && l.log_date === dateStr);

        const event: GeneratedEvent = {
          planId: plan.id,
          courseId: plan.course_id,
          date: dateStr,
          startTime: plan.start_time,
          endTime: plan.end_time,
          isCompleted: log ? (log.is_completed ?? false) : false,
          title: plan.courses.title,
          courseCode: plan.courses.course_code,
          university: plan.courses.university,
          location: plan.location,
          type: plan.type || 'lecture'
        };

        if (!map.has(day)) {
          map.set(day, []);
        }
        map.get(day)!.push(event);
      });
    }

    return map;
  }, [plans, logs, year, month, daysInMonth]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
    setSelectedDay(null);
  };

  const generateSchedule = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error('Failed to generate schedule:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleComplete = async (planId: number, date: string) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_complete',
          planId,
          date
        })
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error('Failed to toggle completion:', e);
    }
  };

  // Get selected day data
  const selectedDayEvents = selectedDay ? (eventsByDay.get(selectedDay) || []).sort((a, b) => a.startTime.localeCompare(b.startTime)) : [];
  const hasEvents = selectedDay && selectedDayEvents.length > 0;
  const isFutureDay = selectedDay && today ? selectedDay >= today : false;
  const isRestDay = isFutureDay && !hasEvents;

  const inProgressCourses = courses.filter(c => c.status === 'in_progress');
  const hasPlans = plans.length > 0;
  const needsScheduleGeneration = inProgressCourses.length > 0 && !hasPlans;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition-all hover:shadow-lg h-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Left: Calendar */}
        <div className="flex-shrink-0 w-full md:w-80 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              {monthNames[month]} <span className="text-gray-400">{year}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDay(now.getDate());
                }}
                className="px-2 py-1 text-[8px] font-black uppercase tracking-widest text-gray-700 bg-gray-100 rounded-md hover:bg-gray-800 hover:text-white transition-all"
              >
                {dict.calendar_today}
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Generate Button */}
          {needsScheduleGeneration && (
            <button
              onClick={generateSchedule}
              disabled={isGenerating}
              className="w-full mb-3 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-white bg-violet-500 rounded-lg hover:bg-violet-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {dict.calendar_generating}
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  {dict.calendar_generate_plan}
                </>
              )}
            </button>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 mb-2 text-[8px] font-bold text-gray-400 uppercase tracking-wider">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-violet-500"></div>
              <span>{dict.calendar_study}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-gray-200"></div>
              <span>{dict.calendar_rest}</span>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekdays.map((day, i) => (
              <div
                key={i}
                className={`text-center text-[8px] font-black uppercase tracking-widest py-1 ${
                  i === 0 || i === 6 ? 'text-gray-300' : 'text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square"></div>;
              }

              const isToday = day === today;
              const isSelected = day === selectedDay;
              const dayEvents = eventsByDay.get(day) || [];
              const hasSchedule = dayEvents.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`flex-1 aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all ${
                    isSelected
                      ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20'
                      : isToday
                        ? 'bg-gray-100 text-gray-900 ring-2 ring-gray-400'
                        : hasSchedule
                          ? 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          : 'text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${isToday && !isSelected ? 'text-violet-700' : ''}`}>
                    {day}
                  </span>

                  {hasSchedule && !isSelected && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      {dayEvents.map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-violet-400"></div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Details */}
        <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-0 flex flex-col">
          {selectedDay ? (
            <div className="animate-in fade-in duration-200 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {monthNames[month]} {selectedDay}
                </span>
                {hasEvents && (
                  <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {dict.calendar_study_day}
                  </span>
                )}
                {isRestDay && (
                  <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                    <Moon className="w-3 h-3 mr-1 inline" />
                    {dict.calendar_rest_day}
                  </span>
                )}
              </div>

              {isRestDay ? (
                <div className="text-center py-6 flex-grow flex flex-col items-center justify-center">
                  <Flower2 className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    {dict.calendar_rest_message}
                  </p>
                </div>
              ) : hasEvents ? (
                <div className="flex-grow overflow-y-auto pr-2">
                  <div className="space-y-2">
                    {selectedDayEvents.map((event, idx) => {
                      const bgColor = event.isCompleted ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' : 'bg-white border-gray-200 hover:bg-gray-50';

                      return (
                        <div
                          key={`${event.planId}-${idx}`}
                          className={`rounded-lg border cursor-pointer transition-all flex flex-col px-3 py-1.5 group/item ${bgColor}`}
                          onClick={() => toggleComplete(event.planId, event.date)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <span className={`text-xs font-semibold truncate ${event.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {event.title}
                            </span>
                            {event.isCompleted && <Check className="w-3 h-3 text-gray-400" />}
                          </div>

                          <div className="flex items-end justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <MapPin className="w-2.5 h-2.5 opacity-50" />
                              <span className="text-[8px] font-bold text-gray-600 truncate">{event.location || 'Campus'}</span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              <span className={`text-[8px] font-bold uppercase tracking-wider ${
                                event.isCompleted
                                  ? 'text-gray-400'
                                  : event.type.toLowerCase().includes('lecture')
                                    ? 'text-violet-600'
                                    : event.type.toLowerCase().includes('exercise') || event.type.toLowerCase().includes('lab')
                                      ? 'text-emerald-600'
                                      : event.type.toLowerCase().includes('exam')
                                        ? 'text-rose-600'
                                        : 'text-brand-blue'
                              }`}>
                                {event.type}
                              </span>
                              <span className="text-[8px] font-bold text-gray-600 whitespace-nowrap">
                                {event.startTime.slice(0, 5)}-{event.endTime.slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <CalendarDays className="w-10 h-10 text-gray-100 mb-4" />
                  <p className="text-xs text-gray-400 font-mono italic">
                    {dict.calendar_no_events}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center py-4">
              <CalendarCheck className="w-8 h-8 text-gray-200 mb-4" />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {dict.calendar_events}
              </p>
              {plans.length > 0 && (
                <p className="text-[9px] text-gray-500 mt-2 font-black">
                  {plans.length} {dict.calendar_courses_scheduled || "plans active"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
