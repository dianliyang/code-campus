"use client";

import { useMemo, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";import { Card } from "@/components/ui/card";

interface PlanData {
  id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  location: string;
  timezone?: string | null;
}

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plan: PlanData) => void;
  course: {
    id: number;
    title: string;
    courseCode?: string;
    university?: string;
  };
  existingPlan?: PlanData | null;
}

export default function AddPlanModal({
  isOpen,
  onClose,
  onSuccess,
  course,
  existingPlan
}: AddPlanModalProps) {
  const router = useRouter();
  const currentTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);
  const timeZoneOptions = useMemo(() => {
    try {
      const intlWithSupported = Intl as unknown as Intl.DateTimeFormatConstructor & {
        supportedValuesOf?: (key: string) => string[];
      };
      const zones = intlWithSupported.supportedValuesOf?.("timeZone");
      if (zones && zones.length > 0) return zones;
      return [currentTimeZone, "UTC"];
    } catch {
      return [currentTimeZone, "UTC"];
    }
  }, [currentTimeZone]);
  const [loading, setLoading] = useState(false);
  const [isTimeZoneMenuOpen, setIsTimeZoneMenuOpen] = useState(false);
  const timezoneBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [formData, setFormData] = useState({
    startDate:
    existingPlan?.start_date || new Date().toISOString().split("T")[0],
    endDate:
    existingPlan?.end_date ||
    new Date(new Date().setMonth(new Date().getMonth() + 3)).
    toISOString().
    split("T")[0],
    days: existingPlan?.days_of_week || [] as number[],
    startTime: existingPlan?.start_time?.slice(0, 5) || "09:00",
    endTime: existingPlan?.end_time?.slice(0, 5) || "11:00",
    location: existingPlan?.location || "Library",
    timezone: existingPlan?.timezone || currentTimeZone
  });
  const filteredTimeZoneOptions = useMemo(() => {
    const query = formData.timezone.trim().toLowerCase();
    if (!query) return timeZoneOptions;
    return timeZoneOptions.filter((zone) => zone.toLowerCase().includes(query));
  }, [timeZoneOptions, formData.timezone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.days.length === 0) {
      toast.error("Please select at least one day", {
        position: "bottom-right"
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: existingPlan ? "update_plan" : "add_plan",
          planId: existingPlan?.id,
          courseId: course.id,
          startDate: formData.startDate,
          endDate: formData.endDate,
          daysOfWeek: formData.days,
          startTime: `${formData.startTime}:00`,
          endTime: `${formData.endTime}:00`,
          location: formData.location,
          timezone: formData.timezone || currentTimeZone
        })
      });

      if (res.ok) {
        const saved: PlanData = await res.json();
        onClose();
        onSuccess?.(saved);
        // Background refresh without blocking UI
        startTransition(() => router.refresh());
      } else {
        toast.error("Failed to save schedule", { position: "bottom-right" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving schedule", { position: "bottom-right" });
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      days: prev.days.includes(day) ?
      prev.days.filter((d) => d !== day) :
      [...prev.days, day].sort()
    }));
  };

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const inputClass =
  "h-8 w-full border border-[#d8d8d8] bg-white px-2.5 text-[13px] text-[#333] outline-none transition-colors focus:border-[#bcbcbc]";

  return (
    <div
      data-no-card-nav="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#1f1f1f]">
            {existingPlan ? "Edit Schedule" : "Add Schedule"}
          </h3>
          <Button variant="outline" size="icon" onClick={onClose}>
            <X />
          </Button>
        </div>

        <Card>
          <p className="text-[10px] font-semibold text-[#777] uppercase tracking-wide">
            Course
          </p>
          <p className="text-[13px] font-medium text-[#1f1f1f] mt-0.5 line-clamp-1">
            {course.title}
          </p>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#444]">
                Start Date
              </label>
              <Input
                type="date"
                required

                value={formData.startDate}
                onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
                } />
              
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#444]">
                End Date
              </label>
              <Input
                type="date"
                required

                value={formData.endDate}
                onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
                } />
              
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#666]">
              Days of Week
            </label>
            <div className="flex gap-1">
              {weekdays.map((day, idx) =>
              <Button
                variant="outline"
                key={day}
                type="button"
                onClick={() => toggleDay(idx)}>





                
                  {day}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#444]">
                Start Time
              </label>
              <Input
                type="time"
                required

                value={formData.startTime}
                onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
                } />
              
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#444]">
                End Time
              </label>
              <Input
                type="time"
                required

                value={formData.endTime}
                onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
                } />
              
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#666]">Location</label>
            <Input
              type="text"

              placeholder="e.g. Library, Home, Cafe"
              value={formData.location}
              onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
              } />
            
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#666]">Timezone</label>
            <div className="relative">
              <Input
                type="text"

                value={formData.timezone}
                onChange={(e) => {
                  setFormData({ ...formData, timezone: e.target.value });
                  setIsTimeZoneMenuOpen(true);
                }}
                onFocus={() => setIsTimeZoneMenuOpen(true)}
                onBlur={() => {
                  timezoneBlurTimeoutRef.current = setTimeout(
                    () => setIsTimeZoneMenuOpen(false),
                    120
                  );
                }}
                placeholder="Search timezone (e.g. Europe/Berlin)" />
              
              {isTimeZoneMenuOpen && filteredTimeZoneOptions.length > 0 &&
              <Card>
                  {filteredTimeZoneOptions.slice(0, 120).map((zone) =>
                <Button
                  variant="outline"
                  key={`tz-option-${zone}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (timezoneBlurTimeoutRef.current) {
                      clearTimeout(timezoneBlurTimeoutRef.current);
                      timezoneBlurTimeoutRef.current = null;
                    }
                    setFormData({ ...formData, timezone: zone });
                    setIsTimeZoneMenuOpen(false);
                  }}>

                  
                      {zone}
                    </Button>
                )}
                </Card>
              }
            </div>
          </div>

          <div className="pt-1 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="outline" type="submit" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {existingPlan ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </Card>
    </div>);

}