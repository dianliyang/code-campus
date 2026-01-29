"use client";

import { useState, useMemo } from "react";
import { Course } from "@/types";
import Link from "next/link";
import { Dictionary } from "@/lib/dictionary";
import { useRouter } from "next/navigation";

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
  is_completed: boolean;
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
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get weekdays and months from dictionary (with fallbacks)
  const weekdays = (dict.calendar_weekdays as string[] | undefined) || ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthNames = (dict.calendar_months as string[] | undefined) || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const { year, month, daysInMonth, firstDayOfWeek, today } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === y && now.getMonth() === m;
    
    return {
      year: y,
      month: m,
      daysInMonth: days,
      firstDayOfWeek: firstDay,
      today: isCurrentMonth ? now.getDate() : null,
    };
  }, [currentDate]);

  // Generate events based on plans for the current month
  const eventsByDate = useMemo(() => {
    const map = new Map<number, GeneratedEvent[]>();
    
    // Helper to check if a date is within range [start, end]
    const isWithin = (dateStr: string, start: string, end: string) => {
      return dateStr >= start && dateStr <= end;
    };

    // Iterate through all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      // Use local date string construction to avoid timezone issues
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = date.getDay(); // 0-6

      plans.forEach(plan => {
        if (
          plan.courses &&
          isWithin(dateStr, plan.start_date, plan.end_date) &&
          plan.days_of_week.includes(dayOfWeek)
        ) {
          // Check for log override
          const log = logs.find(l => l.plan_id === plan.id && l.log_date === dateStr);
          
          const event: GeneratedEvent = {
            planId: plan.id,
            courseId: plan.course_id,
            date: dateStr,
            startTime: plan.start_time,
            endTime: plan.end_time,
            isCompleted: log ? log.is_completed : false,
            title: plan.courses.title,
            courseCode: plan.courses.course_code,
            university: plan.courses.university
          };

          const existing = map.get(day) || [];
          existing.push(event);
          map.set(day, existing);
        }
      });
    }
    
    return map;
  }, [plans, logs, year, month, daysInMonth]);

  // Group past activity by date (from enrolled courses updated_at) - optional context
  const activityByDate = useMemo(() => {
    const map = new Map<number, EnrolledCourse[]>();
    
    courses.forEach(course => {
      const date = new Date(course.updated_at);
      if (date.getFullYear() === year && date.getMonth() === month) {
        const day = date.getDate();
        if (today && day < today) {
          const existing = map.get(day) || [];
          existing.push(course);
          map.set(day, existing);
        }
      }
    });
    
    return map;
  }, [courses, year, month, today]);

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

  // Get data for selected day
  const selectedDayEvents = selectedDay ? eventsByDate.get(selectedDay) || [] : [];
  const selectedDayActivity = selectedDay ? activityByDate.get(selectedDay) || [] : [];
  const isSelectedDayScheduled = selectedDay && selectedDayEvents.length > 0;
  const isSelectedDayFuture = selectedDay && today ? selectedDay >= today : false;
  const isSelectedDayRest = isSelectedDayFuture && selectedDayEvents.length === 0;

  // Check if there are in-progress courses but no plans
  const inProgressCourses = courses.filter(c => c.status === 'in_progress');
  const hasPlans = plans.length > 0;
  const needsScheduleGeneration = inProgressCourses.length > 0 && !hasPlans;

  // Generate calendar grid
  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-violet-500/30 transition-all hover:shadow-xl hover:shadow-violet-500/5">
      <div className="flex gap-4">
        {/* Left: Calendar */}
        <div className="flex-shrink-0 w-64">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-gray-900 tracking-tight">
              {monthNames[month]} <span className="text-violet-500">{year}</span>
            </h3>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => navigateMonth(-1)}
                className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-all"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
              </button>
              <button 
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDay(now.getDate());
                }}
                className="px-2 py-1 text-[8px] font-black uppercase tracking-widest text-violet-500 bg-violet-50 rounded-md hover:bg-violet-500 hover:text-white transition-all"
              >
                {dict.calendar_today}
              </button>
              <button 
                onClick={() => navigateMonth(1)}
                className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center text-gray-400 hover:text-violet-500 hover:bg-violet-50 transition-all"
              >
                <i className="fa-solid fa-chevron-right text-[10px]"></i>
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
                  <i className="fa-solid fa-spinner animate-spin"></i>
                  {dict.calendar_generating}
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
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
                key={`${day}-${i}`} 
                className={`text-center text-[8px] font-black uppercase tracking-widest py-1 ${
                  i === 0 || i === 6 ? 'text-gray-300' : 'text-gray-400'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="w-8 h-8"></div>;
              }
              
              const isToday = day === today;
              const isSelected = day === selectedDay;
              const isWeekend = (index % 7 === 0) || (index % 7 === 6);
              const isFuture = today ? day >= today : false;
              
              const dayEvents = eventsByDate.get(day) || [];
              const isScheduledStudyDay = dayEvents.length > 0;
              const isRestDay = isFuture && !isScheduledStudyDay && day !== today;
              const pastCourses = activityByDate.get(day) || [];
              const hasPastActivity = pastCourses.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center relative transition-all ${
                    isSelected 
                      ? 'bg-violet-500 text-white shadow-md shadow-violet-500/30' 
                      : isToday 
                        ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500'
                        : isScheduledStudyDay
                          ? 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                          : isRestDay
                            ? 'bg-gray-50 text-gray-300'
                            : hasPastActivity
                              ? 'bg-gray-50 hover:bg-violet-50 text-gray-900'
                              : isWeekend
                                ? 'text-gray-300 hover:bg-gray-50'
                                : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${isToday && !isSelected ? 'text-violet-700' : ''}`}>
                    {day}
                  </span>
                  
                  {/* Scheduled study day indicator */}
                  {isScheduledStudyDay && !isSelected && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {dayEvents.slice(0, 2).map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-violet-400"></div>
                      ))}
                    </div>
                  )}
                  
                  {/* Past activity indicator */}
                  {hasPastActivity && !isFuture && !isSelected && (
                    <div className="absolute bottom-0.5 flex gap-0.5">
                      {pastCourses.slice(0, 2).map((course, i) => (
                        <div 
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            course.status === 'completed' ? 'bg-brand-green' : 'bg-brand-blue'
                          }`}
                        ></div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Day Details */}
        <div className="flex-grow border-l border-gray-100 pl-4 min-w-0 flex flex-col">
          {selectedDay ? (
            <div className="animate-in fade-in duration-200 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {monthNames[month]} {selectedDay}
                </span>
                {isSelectedDayScheduled && (
                  <span className="text-[9px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                    <i className="fa-solid fa-clock mr-1"></i>
                    {dict.calendar_study_day}
                  </span>
                )}
                {isSelectedDayRest && (
                  <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    <i className="fa-solid fa-moon mr-1"></i>
                    {dict.calendar_rest_day}
                  </span>
                )}
              </div>
              
              {isSelectedDayRest ? (
                <div className="text-center py-6">
                  <i className="fa-solid fa-spa text-gray-200 text-3xl mb-2"></i>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    {dict.calendar_rest_message}
                  </p>
                </div>
              ) : isSelectedDayScheduled ? (
                <div className="flex-grow flex flex-col min-h-0">
                  {/* Timeline Header */}
                  <div className="flex border-b border-gray-100 pb-2 mb-2 select-none relative h-6">
                    {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => ( // 7:00 to 22:00
                      <div 
                        key={h} 
                        className="absolute text-[8px] text-gray-300 font-mono transform -translate-x-1/2"
                        style={{ left: `${((h - 7) / 15) * 100}%` }}
                      >
                        {h}:00
                      </div>
                    ))}
                  </div>

                  {/* Timeline Rows */}
                  <div className="overflow-y-auto pr-2 space-y-3 flex-grow">
                    {selectedDayEvents.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((event, idx) => {
                      // Calculate position and width
                      const getMinutes = (t: string) => {
                        const [h, m] = t.split(':').map(Number);
                        return h * 60 + m;
                      };
                      const startMin = getMinutes(event.startTime);
                      const endMin = getMinutes(event.endTime);
                      const dayStartMin = 7 * 60; // 7:00
                      const dayEndMin = 22 * 60; // 22:00
                      const totalMin = dayEndMin - dayStartMin;
                      
                      const leftPercent = Math.max(0, ((startMin - dayStartMin) / totalMin) * 100);
                      const widthPercent = Math.min(100 - leftPercent, ((endMin - startMin) / totalMin) * 100);

                      return (
                        <div key={`${event.planId}-${idx}`} className="group/item">
                          {/* Event Bar Container */}
                          <div className="relative h-14 w-full bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden hover:border-violet-200 transition-colors">
                            {/* Grid Lines for reference */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {Array.from({ length: 15 }, (_, i) => (
                                <div key={i} className="flex-1 border-r border-gray-100/50 last:border-0"></div>
                              ))}
                            </div>

                            {/* The Event Bar */}
                            <div 
                              className={`absolute top-1 bottom-1 rounded-md shadow-sm cursor-pointer transition-all flex items-center px-2 overflow-hidden ${
                                event.isCompleted 
                                  ? 'bg-brand-green/20 border border-brand-green/30 hover:bg-brand-green/30' 
                                  : 'bg-violet-500 text-white hover:bg-violet-600 shadow-violet-500/20'
                              }`}
                              style={{ 
                                left: `${leftPercent}%`, 
                                width: `${widthPercent}%` 
                              }}
                              onClick={() => toggleComplete(event.planId, event.date)}
                              title={`${event.title} (${event.startTime.slice(0, 5)} - ${event.endTime.slice(0, 5)})`}
                            >
                              <div className="flex flex-col min-w-0 w-full">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`text-[10px] font-bold truncate ${event.isCompleted ? 'text-brand-green line-through' : 'text-white'}`}>
                                    {event.title}
                                  </span>
                                  {event.isCompleted && <i className="fa-solid fa-check text-[8px] text-brand-green"></i>}
                                </div>
                                <span className={`text-[8px] truncate ${event.isCompleted ? 'text-brand-green/70' : 'text-white/80'}`}>
                                  {event.location || event.startTime.slice(0, 5)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : selectedDayActivity.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedDayActivity.map(course => (
                    <Link
                      key={course.id}
                      href={`/courses/${course.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-violet-50 transition-all group/item"
                    >
                      <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${
                        course.status === 'completed' ? 'bg-brand-green' : 'bg-brand-blue'
                      }`}></div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-xs font-bold text-gray-900 truncate group-hover/item:text-violet-600 transition-colors">
                          {course.title}
                        </p>
                        <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">
                          {course.university} • {course.courseCode}
                        </p>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded flex-shrink-0 ${
                        course.status === 'completed' 
                          ? 'bg-brand-green/10 text-brand-green' 
                          : 'bg-brand-blue/10 text-brand-blue'
                      }`}>
                        {course.progress}%
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <p className="text-xs text-gray-400 font-mono italic">
                    {dict.calendar_no_events}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-4">
              <i className="fa-regular fa-calendar-check text-gray-200 text-2xl mb-2"></i>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                {dict.calendar_events}
              </p>
              {plans.length > 0 && (
                <p className="text-[9px] text-violet-400 mt-1">
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