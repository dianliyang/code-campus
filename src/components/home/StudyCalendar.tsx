"use client";

import { useState, useMemo } from "react";
import { Course } from "@/types";
import { Dictionary } from "@/lib/dictionary";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, Clock, Moon, Flower2, Check, MapPin, CalendarDays, CalendarCheck, WandSparkles, X } from "lucide-react";
import { bulkPreviewStudyPlans, confirmGeneratedStudyPlans, type BulkCoursePreview } from "@/actions/courses";

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

type OptimisticEntry = {
  status: "pending" | "failed";
};

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
  initialDate?: Date;
  onToggleComplete?: (planId: number, date: string) => Promise<void>;
  coursesWithoutPlans?: Array<{ id: number; courseCode: string; title: string }>;
}

export default function StudyCalendar({ courses, plans, logs, dict, initialDate, onToggleComplete, coursesWithoutPlans = [] }: StudyCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => initialDate ?? new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => (initialDate ?? new Date()).getDate());
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimisticByKey, setOptimisticByKey] = useState<Record<string, OptimisticEntry>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isConfirmingBulk, setIsConfirmingBulk] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkCoursePreview[] | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Record<number, string[]>>({});

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

        // Check if day of week matches (supports mixed legacy values)
        const normalizedDays = (plan.days_of_week || [])
          .map((d) => (typeof d === "number" ? d : Number(d)))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
        if (!normalizedDays.includes(dayOfWeek)) return;

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

  const eventKey = (planId: number, date: string) => `${planId}:${date}`;

  const toggleComplete = async (planId: number, date: string) => {
    const key = eventKey(planId, date);

    setGlobalError(null);
    setOptimisticByKey(prev => ({
      ...prev,
      [key]: { status: "pending" },
    }));

    try {
      if (onToggleComplete) {
        await onToggleComplete(planId, date);
      } else {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'toggle_complete',
            planId,
            date
          })
        });
        if (!res.ok) {
          throw new Error("Request failed");
        }
      }
      setOptimisticByKey(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      router.refresh();
    } catch (e) {
      setOptimisticByKey(prev => ({
        ...prev,
        [key]: { status: "failed" },
      }));
      setGlobalError("Update failed. Please try again.");
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

  const handleBulkGenerate = async () => {
    setIsBulkGenerating(true);
    try {
      const previews = await bulkPreviewStudyPlans(coursesWithoutPlans.map(c => c.id));
      if (previews.length === 0) {
        alert("No parseable schedules found for the remaining courses.");
        return;
      }
      setBulkPreview(previews);
      const initialSelected: Record<number, string[]> = {};
      previews.forEach(p => {
        initialSelected[p.courseId] = p.generatedPlans
          .map((_, i) => String(i))
          .filter(i => !p.generatedPlans[Number(i)].alreadyExists);
      });
      setBulkSelectedIds(initialSelected);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to generate study plans");
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (!bulkPreview) return;
    setIsConfirmingBulk(true);
    try {
      let totalCreated = 0;
      for (const cp of bulkPreview) {
        const selected = (bulkSelectedIds[cp.courseId] || [])
          .map(i => cp.generatedPlans[Number(i)])
          .filter(p => p && !p.alreadyExists)
          .map(p => ({
            daysOfWeek: p.daysOfWeek,
            startTime: p.startTime,
            endTime: p.endTime,
            location: p.location,
            type: p.type,
            startDate: p.startDate,
            endDate: p.endDate,
          }));
        if (selected.length > 0) {
          const result = await confirmGeneratedStudyPlans(cp.courseId, selected);
          totalCreated += result.created;
        }
      }
      alert(`Created ${totalCreated} study plan(s).`);
      setBulkPreview(null);
      setBulkSelectedIds({});
      router.refresh();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to save study plans");
    } finally {
      setIsConfirmingBulk(false);
    }
  };

  const handleBulkDiscard = () => {
    setBulkPreview(null);
    setBulkSelectedIds({});
  };

  return (
    <div className="rounded-md border border-[#e5e5e5] bg-white p-3 sm:p-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        {/* Left: Calendar */}
        <div className="flex-shrink-0 w-full md:w-80 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1f1f1f]">
              {monthNames[month]} <span className="text-[#8a8a8a]">{year}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="h-8 w-8 rounded-md border border-[#d3d3d3] bg-white flex items-center justify-center text-[#777] hover:bg-[#f8f8f8] transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentDate(now);
                  setSelectedDay(now.getDate());
                }}
                className="h-8 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                {dict.calendar_today}
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="h-8 w-8 rounded-md border border-[#d3d3d3] bg-white flex items-center justify-center text-[#777] hover:bg-[#f8f8f8] transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
              {coursesWithoutPlans.length > 0 && (
                <button
                  onClick={handleBulkGenerate}
                  disabled={isBulkGenerating}
                  className="h-8 w-8 rounded-md border border-[#d3d3d3] bg-white flex items-center justify-center text-[#555] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
                  title={`Generate study plans for ${coursesWithoutPlans.length} course(s)`}
                >
                  {isBulkGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <WandSparkles className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          {/* Generate Button */}
          {needsScheduleGeneration && (
            <button
              onClick={generateSchedule}
              disabled={isGenerating}
              className="w-full mb-3 h-8 px-3 text-[13px] font-medium text-[#333] bg-white border border-[#d3d3d3] rounded-md hover:bg-[#f8f8f8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
          <div className="flex items-center gap-3 mb-2 text-xs text-[#8a8a8a]">
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
                className={`text-center text-[11px] font-medium py-1 ${
                  i === 0 || i === 6 ? 'text-[#ababab]' : 'text-[#8a8a8a]'
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
                  className={`flex-1 aspect-square rounded-md flex flex-col items-center justify-center relative transition-all ${
                    isSelected
                      ? 'bg-[#1f1f1f] text-white'
                    : isToday
                        ? 'bg-[#efefef] text-[#1f1f1f] ring-1 ring-[#d0d0d0]'
                        : hasSchedule
                          ? 'bg-[#f8f8f8] text-[#3f3f3f] hover:bg-[#f1f1f1]'
                          : 'text-[#9a9a9a] hover:bg-[#f8f8f8]'
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
        <div className="flex-1 border-t md:border-t-0 md:border-l border-[#e8e8e8] pt-4 md:pt-0 md:pl-4 min-w-0 flex flex-col">
          {selectedDay ? (
            <div className="animate-in fade-in duration-200 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-[#777]">
                  {monthNames[month]} {selectedDay}
                </span>
                {hasEvents && (
                  <span className="text-[11px] font-medium text-[#555] bg-[#f2f2f2] px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 mr-1 inline" />
                    {dict.calendar_study_day}
                  </span>
                )}
                {isRestDay && (
                  <span className="text-[11px] font-medium text-[#777] bg-[#f7f7f7] px-2 py-0.5 rounded-full">
                    <Moon className="w-3 h-3 mr-1 inline" />
                    {dict.calendar_rest_day}
                  </span>
                )}
              </div>

              {globalError && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
                  {globalError}
                </div>
              )}

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
                      const key = eventKey(event.planId, event.date);
                      const optimistic = optimisticByKey[key];
                      const isPending = optimistic?.status === "pending";
                      const isFailed = optimistic?.status === "failed";
                      const effectiveCompleted = event.isCompleted;
                      const shouldShake = isPending;
                      const bgColor = effectiveCompleted ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' : 'bg-white border-gray-200 hover:bg-gray-50';

                      return (
                        <div
                          key={`${event.planId}-${idx}`}
                          className={`rounded-lg border cursor-pointer transition-all flex flex-col px-3 py-1.5 group/item ${bgColor}`}
                          style={shouldShake ? { animation: "studyScheduleShake 280ms ease-in-out 1" } : undefined}
                          aria-disabled={isPending}
                          onClick={() => {
                            if (isPending) return;
                            toggleComplete(event.planId, event.date);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <span className={`text-xs font-semibold truncate ${effectiveCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {event.title}
                            </span>
                            <div className="flex items-center gap-1">
                              {isFailed && (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                  Failed
                                </span>
                              )}
                              {isPending && <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />}
                              {effectiveCompleted && <Check className="w-3 h-3 text-gray-400" />}
                            </div>
                          </div>

                          <div className="flex items-end justify-between gap-2">
                            <div className="flex items-center gap-1 min-w-0">
                              <MapPin className="w-2.5 h-2.5 opacity-50" />
                              <span className="text-[8px] font-bold text-gray-600 truncate">{event.location || 'Campus'}</span>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                              <span className={`text-[8px] font-bold uppercase tracking-wider ${
                                effectiveCompleted
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
            <div className="flex-grow min-h-0">
              <div className="h-full flex flex-col items-center justify-center text-center py-4">
                <CalendarCheck className="w-8 h-8 text-gray-200 mb-4" />
                <p className="text-xs text-[#8a8a8a]">
                  {dict.calendar_events}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Preview Modal */}
      {bulkPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={handleBulkDiscard}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-gray-900">AI Study Plan Preview</h3>
              <button onClick={handleBulkDiscard} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {bulkPreview.map(cp => (
              <div key={cp.courseId} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 px-2 py-0.5 rounded">{cp.courseCode}</span>
                  <span className="text-xs font-bold text-gray-900 truncate">{cp.courseTitle}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Original Schedule</p>
                    <ul className="space-y-0.5 text-xs text-gray-600">
                      {cp.originalSchedule.map((item, idx) => (
                        <li key={idx}><span className="font-semibold">{item.type}:</span> {item.line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Generated Plans</p>
                    <ul className="space-y-1.5">
                      {cp.generatedPlans.map((plan, idx) => {
                        const id = String(idx);
                        const disabled = plan.alreadyExists;
                        const checked = (bulkSelectedIds[cp.courseId] || []).includes(id);
                        return (
                          <li key={id} className="flex items-start gap-2 text-xs text-gray-700">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled || isConfirmingBulk}
                              onChange={e => {
                                setBulkSelectedIds(prev => ({
                                  ...prev,
                                  [cp.courseId]: e.target.checked
                                    ? [...(prev[cp.courseId] || []), id]
                                    : (prev[cp.courseId] || []).filter(v => v !== id),
                                }));
                              }}
                              className="mt-0.5 accent-violet-600"
                            />
                            <div>
                              <div>
                                {plan.daysOfWeek.join(",")} • {plan.startTime.slice(0, 5)}-{plan.endTime.slice(0, 5)}
                                {plan.startDate && plan.endDate && (
                                  <span className="text-[10px] text-gray-400 ml-1">
                                    ({new Date(plan.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}-{new Date(plan.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {plan.type} @ {plan.location}{disabled ? " (already exists)" : ""}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <button
                onClick={handleBulkConfirm}
                disabled={isConfirmingBulk || Object.values(bulkSelectedIds).every(ids => ids.length === 0)}
                className="px-5 py-2.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-lg hover:bg-black transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isConfirmingBulk ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Confirm
              </button>
              <button
                onClick={handleBulkDiscard}
                disabled={isConfirmingBulk}
                className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes studyScheduleShake {
          0% { transform: translateX(0); }
          20% { transform: translateX(-2px); }
          40% { transform: translateX(2px); }
          60% { transform: translateX(-1px); }
          80% { transform: translateX(1px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
