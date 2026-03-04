"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator
} from "@/components/ui/combobox";
import { format, parseISO } from "date-fns";
import { type DateRange } from "react-day-picker";

interface PlanData {
  id: number;
  start_date: string;
  end_date: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  location: string;
  kind?: string | null;
  timezone?: string | null;
}

interface AddPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (plan: PlanData) => void;
  mode?: "modal" | "inline";
  course: {
    id: number;
    title: string;
    courseCode?: string;
    university?: string;
  };
  existingPlan?: PlanData | null;
}

function resolvePreferredLanguage(): string {
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang?.trim();
    if (htmlLang) return htmlLang;
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  return "en";
}

async function reverseGeocodeLocationName(
  lat: number,
  lng: number
): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const language = resolvePreferredLanguage();
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=${encodeURIComponent(language)}`
    );
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      name?: string;
      display_name?: string;
      address?: Record<string, string | undefined>;
    };
    const address = data.address || {};
    const locality =
      address.city ||
      address.town ||
      address.village ||
      address.hamlet ||
      address.county ||
      address.state;
    const microArea =
      address.road ||
      address.pedestrian ||
      address.footway ||
      address.amenity ||
      address.building;
    const area = address.suburb || address.neighbourhood || address.city_district;
    const country = address.country;
    const compact = [microArea, area, locality, country].filter(Boolean).join(", ");
    if (compact) return compact;
    if (data.name) return data.name;
    if (data.display_name) return data.display_name.split(",").slice(0, 3).join(",").trim();
    return fallback;
  } catch {
    return fallback;
  }
}

export default function AddPlanModal({
  isOpen,
  onClose,
  onSuccess,
  mode = "modal",
  course,
  existingPlan
}: AddPlanModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

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

  const getInitialFormData = () => ({
    startDate: existingPlan?.start_date || new Date().toISOString().split("T")[0],
    endDate:
      existingPlan?.end_date ||
      new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0],
    days: existingPlan?.days_of_week || ([] as number[]),
    startTime: existingPlan?.start_time?.slice(0, 5) || "09:00",
    endTime: existingPlan?.end_time?.slice(0, 5) || "11:00",
    kind: existingPlan?.kind?.trim() || "Study",
    location: existingPlan?.location || "Library",
    timezone: existingPlan?.timezone?.trim() || currentTimeZone
  });

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    if (!isOpen) return;
    const next = getInitialFormData();
    setFormData(next);
  }, [isOpen, existingPlan, currentTimeZone]);

  const timeZoneGroups = useMemo(() => {
    const zones = [...timeZoneOptions];
    const selected = formData.timezone?.trim();
    if (selected && !zones.includes(selected)) {
      zones.unshift(selected);
    }
    const groups = new Map<string, string[]>();
    zones.forEach((zone) => {
      let group = "Other";
      if (zone.startsWith("America/")) group = "Americas";
      else if (zone.startsWith("Europe/")) group = "Europe";
      else if (
        zone.startsWith("Asia/") ||
        zone.startsWith("Pacific/") ||
        zone.startsWith("Australia/")
      ) group = "Asia/Pacific";
      else if (zone.startsWith("Africa/")) group = "Africa";
      const bucket = groups.get(group) || [];
      bucket.push(zone);
      groups.set(group, bucket);
    });
    const order = ["Americas", "Europe", "Asia/Pacific", "Africa", "Other"];
    return order.
    filter((key) => groups.has(key)).
    map((key) => ({ value: key, items: groups.get(key) || [] }));
  }, [timeZoneOptions, formData.timezone]);

  if (!isOpen) return null;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const toggleDay = (dayIdx: number) => {
    setFormData((prev) => {
      const nextDays = prev.days.includes(dayIdx)
        ? prev.days.filter((d) => d !== dayIdx)
        : [...prev.days, dayIdx].sort((a, b) => a - b);
      return { ...prev, days: nextDays };
    });
  };

  const handleUseCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationName = await reverseGeocodeLocationName(
          position.coords.latitude,
          position.coords.longitude
        );
        setFormData((prev) => ({ ...prev, location: locationName }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.days.length === 0) {
      toast.error("Please select at least one day", { position: "bottom-right" });
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
          kind: formData.kind || "Study",
          location: formData.location,
          timezone: formData.timezone || currentTimeZone
        })
      });

      if (!res.ok) {
        toast.error("Failed to save schedule", { position: "bottom-right" });
        return;
      }

      const saved: PlanData = await res.json();
      onClose();
      onSuccess?.(saved);
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      toast.error("Error saving schedule", { position: "bottom-right" });
    } finally {
      setLoading(false);
    }
  };

  const card = (
    <Card className="w-full max-w-xl gap-3 py-3">
        <form onSubmit={handleSubmit}>
          <CardHeader className="px-3 pb-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle>{existingPlan ? "Edit Schedule" : "Add Schedule"}</CardTitle>
                <CardDescription className="truncate">{course.title}</CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="outline" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  {existingPlan ? "Update" : "Save"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="px-3">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" type="button" className="w-full justify-between font-normal">
                      {formData.startDate && formData.endDate ?
                      `${format(parseISO(formData.startDate), "LLL dd, y")} - ${format(parseISO(formData.endDate), "LLL dd, y")}` :
                      "Pick a date range"}
                      <ChevronDownIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      selected={{
                        from: formData.startDate ? parseISO(formData.startDate) : undefined,
                        to: formData.endDate ? parseISO(formData.endDate) : undefined
                      } as DateRange}
                      onSelect={(range) => {
                        const from = range?.from;
                        const to = range?.to || range?.from;
                        if (!from) return;
                        setFormData((prev) => ({
                          ...prev,
                          startDate: format(from, "yyyy-MM-dd"),
                          endDate: format(to!, "yyyy-MM-dd")
                        }));
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-2">
                  <label className="text-sm">Start Time</label>
                  <Input
                    type="time"
                    step="1"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">End Time</label>
                  <Input
                    type="time"
                    step="1"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm">Days of Week</label>
                <div className="grid grid-cols-7 gap-1">
                  {dayLabels.map((day, dayIdx) => (
                    <Toggle
                      key={day}
                      pressed={formData.days.includes(dayIdx)}
                      onPressedChange={() => toggleDay(dayIdx)}
                      variant="outline"
                      size="sm"
                      className="text-[11px] font-semibold data-[state=on]:border-black data-[state=on]:bg-black data-[state=on]:text-white"
                    >
                      {day}
                    </Toggle>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                <div className="space-y-2">
                  <label className="text-sm">Kind</label>
                  <Input
                    value={formData.kind}
                    onChange={(e) => setFormData((prev) => ({ ...prev, kind: e.target.value }))}
                    placeholder="Study"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm">Location</label>
                  <InputGroup>
                    <InputGroupInput
                      value={formData.location}
                      onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                      placeholder="Location"
                    />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton
                        size="icon-xs"
                        type="button"
                        onClick={handleUseCurrentLocation}
                        title="Use current location"
                        aria-label="Use current location"
                      >
                        {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <div className="space-y-2">
                  <label className="text-sm">Timezone</label>
                  <Combobox
                    items={timeZoneGroups}
                    value={formData.timezone}
                    onValueChange={(next) =>
                    setFormData((prev) => ({
                      ...prev,
                      timezone: String(next || currentTimeZone)
                    }))
                    }
                  >
                    <ComboboxInput placeholder="Select timezone" />
                    <ComboboxContent>
                      <ComboboxEmpty>No timezones found.</ComboboxEmpty>
                      <ComboboxList>
                        {(group, index) => (
                          <ComboboxGroup key={group.value} items={group.items}>
                            <ComboboxLabel>{group.value}</ComboboxLabel>
                            <ComboboxCollection>
                              {(item) => (
                                <ComboboxItem key={item} value={item}>
                                  {item}
                                </ComboboxItem>
                              )}
                            </ComboboxCollection>
                            {index < timeZoneGroups.length - 1 ? <ComboboxSeparator /> : null}
                          </ComboboxGroup>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
            </div>
          </CardContent>
        </form>
      </Card>
  );

  if (mode === "inline") {
    return <div data-no-card-nav="true" className="w-[min(92vw,36rem)]">{card}</div>;
  }

  return (
    <div
      data-no-card-nav="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
    >
      {card}
    </div>
  );
}
