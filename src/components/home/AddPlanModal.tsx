"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, LocateFixed, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
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
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
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

  const getInitialFormData = useCallback(() => ({
    startDate: existingPlan?.start_date || new Date().toISOString().split("T")[0],
    endDate:
      existingPlan?.end_date ||
      new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0],
    days: existingPlan?.days_of_week || ([] as number[]),
    startTime: existingPlan?.start_time?.slice(0, 5) || "09:00",
    endTime: existingPlan?.end_time?.slice(0, 5) || "11:00",
    kind: existingPlan?.kind?.trim() || "Self-Study",
    location: existingPlan?.location || "Library",
    timezone: existingPlan?.timezone?.trim() || currentTimeZone
  }), [existingPlan, currentTimeZone]);

  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    if (!isOpen) return;
    const next = getInitialFormData();
    setFormData(next);
  }, [isOpen, getInitialFormData]);

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
      else if (zone.startsWith("Asia/")) group = "Asia";
      else if (zone.startsWith("Africa/")) group = "Africa";
      else if (zone.startsWith("Australia/") || zone.startsWith("Pacific/"))
        group = "Australia & Pacific";
      else if (zone === "UTC") group = "Standard";

      const list = groups.get(group) || [];
      list.push(zone);
      groups.set(group, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [timeZoneOptions, formData.timezone]);

  const handleSave = () => {
    startTransition(async () => {
      setLoading(true);
      try {
        const payload = {
          action: existingPlan ? "update_plan" : "add_plan",
          planId: existingPlan?.id,
          courseId: course.id,
          startDate: formData.startDate,
          endDate: formData.endDate,
          daysOfWeek: formData.days,
          startTime: formData.startTime + ":00",
          endTime: formData.endTime + ":00",
          kind: formData.kind,
          location: formData.location,
          timezone: formData.timezone
        };

        const res = await fetch("/api/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save study plan");
        }

        const savedPlan = await res.json();
        toast.success(
          existingPlan ? "Study plan updated" : "Study plan added successfully"
        );
        if (onSuccess) onSuccess(savedPlan);
        onClose();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save plan");
      } finally {
        setLoading(false);
      }
    });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const name = await reverseGeocodeLocationName(
            position.coords.latitude,
            position.coords.longitude
          );
          setFormData((p) => ({ ...p, location: name }));
          toast.success("Location updated");
        } catch {
          toast.error("Failed to resolve location name");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast.error("Failed to get your location");
      },
      { timeout: 10000 }
    );
  };

  const dateRange: DateRange | undefined = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return undefined;
    try {
      return {
        from: parseISO(formData.startDate),
        to: parseISO(formData.endDate)
      };
    } catch {
      return undefined;
    }
  }, [formData.startDate, formData.endDate]);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      setFormData((p) => ({ ...p, startDate: format(range.from!, "yyyy-MM-dd") }));
    }
    if (range?.to) {
      setFormData((p) => ({ ...p, endDate: format(range.to!, "yyyy-MM-dd") }));
    }
  };

  const content = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <Field className="md:col-span-2">
          <FieldLabel>Date Range</FieldLabel>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-between font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                  <Clock className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
        </Field>

        <Field>
          <FieldLabel>Start Time</FieldLabel>
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) =>
              setFormData((p) => ({ ...p, startTime: e.target.value }))
            }
            className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </Field>
        <Field>
          <FieldLabel>End Time</FieldLabel>
          <Input
            type="time"
            value={formData.endTime}
            onChange={(e) =>
              setFormData((p) => ({ ...p, endTime: e.target.value }))
            }
            className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </Field>

        <Field className="md:col-span-2">
          <FieldLabel>Days of Week</FieldLabel>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                <Toggle
                  key={i}
                  size="sm"
                  pressed={formData.days.includes(i)}
                  onPressedChange={(pressed) => {
                    setFormData((p) => ({
                      ...p,
                      days: pressed
                        ? [...p.days, i].sort()
                        : p.days.filter((d) => d !== i)
                    }));
                  }}
                  variant="outline"
                  className="text-[11px] font-semibold data-[state=on]:border-black data-[state=on]:bg-black data-[state=on]:text-white"
                >
                  {day}
                </Toggle>
              ))}
            </div>
        </Field>

        <Field>
          <FieldLabel>Kind</FieldLabel>
          <Combobox
            value={formData.kind}
            onValueChange={(val) => setFormData((p) => ({ ...p, kind: val || "" }))}
          >
            <ComboboxInput placeholder="Select type..." />
            <ComboboxContent>
              <ComboboxEmpty>No type found.</ComboboxEmpty>
              <ComboboxGroup>
                {[
                  "Self-Study",
                  "Lecture",
                  "Lab",
                  "Recitation",
                  "Project",
                  "Exam Prep"
                ].map((type) => (
                  <ComboboxItem key={type} value={type}>
                    {type}
                  </ComboboxItem>
                ))}
              </ComboboxGroup>
            </ComboboxContent>
          </Combobox>
        </Field>

        <Field>
          <FieldLabel>Location</FieldLabel>
            <InputGroup>
              <InputGroupInput
                placeholder="Location"
                value={formData.location}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, location: e.target.value }))
                }
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  disabled={locating}
                  onClick={handleLocateMe}
                  title="Use current location"
                  aria-label="Use current location"
                >
                  {locating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
        </Field>

        <Field className="md:col-span-2">
          <FieldLabel>Timezone</FieldLabel>
          <Combobox
            value={formData.timezone || ""}
            onValueChange={(val) => setFormData((p) => ({ ...p, timezone: val || "" }))}
          >
            <ComboboxInput
              placeholder="Search timezone..."
              className="font-mono text-[11px]"
            />
            <ComboboxContent className="max-h-[300px] overflow-auto">
              <ComboboxEmpty>No timezone found.</ComboboxEmpty>
              {timeZoneGroups.map(([group, zones]) => (
                <div key={group}>
                  <ComboboxLabel className="py-2 px-3 text-[10px] font-medium text-muted-foreground">
                    {group}
                  </ComboboxLabel>
                  <ComboboxGroup>
                    {zones.map((zone) => (
                      <ComboboxItem
                        key={zone}
                        value={zone}
                        className="font-mono text-[11px] py-2"
                      >
                        {zone.replace(/_/g, " ")}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                  <ComboboxSeparator className="bg-border/30" />
                </div>
              ))}
            </ComboboxContent>
          </Combobox>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="h-9"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || formData.days.length === 0}
          className="h-9"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingPlan ? "Update Plan" : "Create Plan"}
        </Button>
      </div>
    </div>
  );

  if (mode === "inline") {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {existingPlan ? "Edit Study Plan" : "Add Study Plan"}
          </CardTitle>
          <CardDescription className="text-xs">
            {course.courseCode ? `${course.courseCode} · ` : ""}
            {course.title}
          </CardDescription>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <PopoverContent
        className="w-[95vw] max-w-2xl p-5 shadow-xl border-border/60 sm:rounded-xl"
        align="center"
        sideOffset={8}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              {existingPlan ? "Adjust Study Plan" : "New Study Plan"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {course.courseCode ? (
                <span className="font-medium">{course.courseCode}</span>
              ) : null}
              {course.courseCode ? " · " : ""}
              {course.title}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {content}
      </PopoverContent>
    </Popover>
  );
}
