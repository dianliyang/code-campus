"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

interface PlanData {
  id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  location: string;
}

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plan: PlanData) => void;
  course: { id: number; title: string; courseCode?: string; university?: string };
  existingPlan?: PlanData | null;
}

export default function AddPlanModal({ isOpen, onClose, onSuccess, course, existingPlan }: AddPlanModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: existingPlan?.start_date || new Date().toISOString().split('T')[0],
    endDate: existingPlan?.end_date || new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
    days: existingPlan?.days_of_week || [] as number[],
    startTime: existingPlan?.start_time?.slice(0, 5) || "09:00",
    endTime: existingPlan?.end_time?.slice(0, 5) || "11:00",
    location: existingPlan?.location || "Library"
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.days.length === 0) {
      alert("Please select at least one day");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: existingPlan ? 'update_plan' : 'add_plan',
          planId: existingPlan?.id,
          courseId: course.id,
          startDate: formData.startDate,
          endDate: formData.endDate,
          daysOfWeek: formData.days,
          startTime: `${formData.startTime}:00`,
          endTime: `${formData.endTime}:00`,
          location: formData.location
        })
      });

      if (res.ok) {
        const saved: PlanData = await res.json();
        onClose();
        onSuccess?.(saved);
        // Background refresh without blocking UI
        startTransition(() => router.refresh());
      } else {
        alert("Failed to save schedule");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving schedule");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  };

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const inputClass = "h-8 w-full rounded-md border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-lg p-5 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1f1f1f]">
            {existingPlan ? 'Edit Schedule' : 'Add Schedule'}
          </h3>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-[#999] hover:text-[#444] hover:bg-[#f5f5f5] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mb-4 rounded-md bg-[#fafafa] border border-[#f0f0f0] px-3 py-2">
          <p className="text-[10px] font-medium text-[#999] uppercase tracking-wide">Course</p>
          <p className="text-[13px] font-medium text-[#1f1f1f] mt-0.5 line-clamp-1">{course.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#666]">Start Date</label>
              <input
                type="date"
                required
                className={inputClass}
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#666]">End Date</label>
              <input
                type="date"
                required
                className={inputClass}
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#666]">Days of Week</label>
            <div className="flex gap-1">
              {weekdays.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`flex-1 h-8 rounded-md text-[11px] font-medium transition-colors border ${
                    formData.days.includes(idx)
                      ? 'bg-[#1f1f1f] text-white border-[#1f1f1f]'
                      : 'bg-white text-[#777] border-[#d8d8d8] hover:bg-[#f6f6f6]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#666]">Start Time</label>
              <input
                type="time"
                required
                className={inputClass}
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#666]">End Time</label>
              <input
                type="time"
                required
                className={inputClass}
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#666]">Location</label>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Library, Home, Cafe"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="pt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-md border border-[#d3d3d3] bg-white px-3 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-8 rounded-md bg-[#1f1f1f] text-white px-3 text-[13px] font-medium hover:bg-[#333] disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              {existingPlan ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
