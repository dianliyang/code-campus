"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: { id: number; title: string };
  existingPlan?: {
    id: number;
    start_date: string;
    end_date: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    location: string;
  } | null;
}

export default function AddPlanModal({ isOpen, onClose, course, existingPlan }: AddPlanModalProps) {
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
        router.refresh();
        onClose();
      } else {
        alert("Failed to save plan");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving plan");
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

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">{existingPlan ? 'Edit Study Plan' : 'Add Study Plan'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Course</p>
          <p className="text-base font-medium text-gray-900">{course.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
              <input
                type="date"
                required
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
              <input
                type="date"
                required
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Days of Week</label>
            <div className="flex justify-between gap-1">
              {weekdays.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    formData.days.includes(idx)
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {day[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Time</label>
              <input
                type="time"
                required
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                value={formData.startTime}
                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Time</label>
              <input
                type="time"
                required
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                value={formData.endTime}
                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              placeholder="e.g. Library, Home, Cafe"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-violet-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:bg-violet-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (existingPlan ? 'Update Plan' : 'Create Plan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
