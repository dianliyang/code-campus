"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Course } from "@/types";
import CourseDetailTopSection, {
  EditableStudyPlan,
} from "@/components/courses/CourseDetailTopSection";
import WeeklyScheduleCard from "@/components/courses/WeeklyScheduleCard";
import CourseDetailHeader from "@/components/courses/CourseDetailHeader";
import AddPlanModal from "@/components/home/AddPlanModal";
import {
  confirmGeneratedStudyPlans,
  previewStudyPlansFromCourseSchedule,
  toggleCourseEnrollmentAction,
  updateCourseResources,
  type SchedulePlanPreview,
} from "@/actions/courses";
import {
  CalendarPlus,
  ChevronDownIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Globe,
  Info,
  Loader2,
  LocateFixed,
  MapPin,
  Minus,
  PenSquare,
  Plus,
  Tag,
  Trash2,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { getUniversityUnitInfo } from "@/lib/university-units";
import { getCourseCodeBreakdown } from "@/lib/course-code-breakdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
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
  ComboboxSeparator,
} from "@/components/ui/combobox";
import { format, parseISO } from "date-fns";
import { type DateRange } from "react-day-picker";
import { buildCourseDetailCalendar, type CourseDetailCalendarEvent } from "@/lib/course-detail-calendar";

interface CourseDetailContentProps {
  course: Course;
  isEnrolled: boolean;
  descriptionEmptyText: string;
  availableTopics: string[];
  availableSemesters: string[];
  studyPlans: EditableStudyPlan[];
  projectSeminarRef?: { id: number; category: string } | null;
  syllabus?: {
    source_url: string | null;
    content: Record<string, unknown>;
    schedule: unknown[];
    retrieved_at: string;
  } | null;
  assignments?: Array<{
    id: number;
    kind: string;
    label: string;
    due_on: string | null;
    url: string | null;
    description: string | null;
  }>;
  scheduleItems?: Array<{
    id: number;
    date: string;
    title: string | null;
    kind: string | null;
    focus: string | null;
    durationMinutes: number | null;
  }>;
  studyLogs?: Array<{
    planId?: number;
    scheduleId?: number;
    assignmentId?: number;
    logDate: string;
    isCompleted: boolean;
  }>;
}

type LinkPreviewData = {

  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDateUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateAsLocal(value: string): Date | null {

  if (!value) return null;
  const isoOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = value.match(isoOnly);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateForUser(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const parsed = parseDateAsLocal(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString(undefined, options);
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
  lng: number,
): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const language = resolvePreferredLanguage();
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&accept-language=${encodeURIComponent(language)}`,
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
    const area =
      address.suburb || address.neighbourhood || address.city_district;
    const country = address.country;
    const compact = [microArea, area, locality, country]
      .filter(Boolean)
      .join(", ");
    if (compact) return compact;
    if (data.name) return data.name;
    if (data.display_name)
      return data.display_name.split(",").slice(0, 3).join(",").trim();
    return fallback;
  } catch {
    return fallback;
  }
}

function calculateInclusiveDays(
  startDate: string,
  endDate: string,
): number | null {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  if (!start || !end) return null;
  const diff = Math.floor(
    (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diff >= 0 ? diff + 1 : null;
}

function getPreviewableUrl(url: string): string | null {
  const trimmed = String(url || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  return null;
}

function getPreviewHost(url: string): string {
  const previewable = getPreviewableUrl(url);
  if (!previewable) return "Unsupported URL";
  try {
    return new URL(previewable).hostname;
  } catch {
    return "Unknown host";
  }
}

function getThirdPartyPreviewImageUrl(url: string): string | null {
  const previewable = getPreviewableUrl(url);
  if (!previewable) return null;
  return `https://image.thum.io/get/width/900/crop/560/noanimate/${encodeURIComponent(previewable)}`;
}

export function ResourcePreviewHoverCard({
  url,
  previewData,
  previewLoading,
  previewBlocked,
  copied,
  onOpenChange,
  onPreviewBlocked,
  onCopy,
}: {
  url: string;
  previewData: LinkPreviewData | null | undefined;
  previewLoading: boolean;
  previewBlocked: boolean;
  copied: boolean;
  onOpenChange?: (open: boolean) => void;
  onPreviewBlocked: () => void;
  onCopy: () => void;
}) {
  return (
    <HoverCard openDelay={120} closeDelay={80} onOpenChange={onOpenChange}>
      <HoverCardTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-[#335b9a] hover:underline flex items-center gap-2 break-all flex-1 min-w-0"
        >
          <Globe className="w-4 h-4 shrink-0 text-[#778fb8]" />
          {url}
        </a>
      </HoverCardTrigger>
      <HoverCardContent className="w-[420px] p-0">
        <div className="flex items-start justify-between gap-3 px-3 py-2 border-b">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">
              Website Preview
            </p>
            <p className="text-xs font-medium truncate">
              {url}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            className="shrink-0"
            onClick={onCopy}
            title="Copy resource URL"
            aria-label="Copy resource URL"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        {previewLoading ? (
          <div className="px-3 py-3 text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading preview…
          </div>
        ) : previewData?.title || previewData?.description || previewData?.image ? (
          <div className="p-3 space-y-2">
            {previewData?.image ? (
              <Image
                src={previewData.image}
                alt={`Preview ${url}`}
                className="h-40 w-full rounded-md object-cover border"
                width={900}
                height={560}
                unoptimized
              />
            ) : null}
            <div className="space-y-1">
              <p className="text-xs font-semibold leading-snug line-clamp-2">
                {previewData?.title || getPreviewHost(url)}
              </p>
              {previewData?.description ? (
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                  {previewData.description}
                </p>
              ) : null}
              <p className="text-[11px] text-muted-foreground truncate">
                {(previewData?.siteName || getPreviewHost(url)).replace(/^www\./, "")}
              </p>
            </div>
          </div>
        ) : getPreviewableUrl(url) && !previewBlocked ? (
          <>
            <Image
              src={getThirdPartyPreviewImageUrl(url) || ""}
              alt={`Preview ${url}`}
              className="h-56 w-full object-cover"
              width={900}
              height={560}
              unoptimized
              onError={onPreviewBlocked}
            />
            <div className="px-3 py-2 border-t text-[11px] text-muted-foreground">
              Host:{" "}
              <span className="font-medium text-foreground">
                {getPreviewHost(url)}
              </span>
            </div>
          </>
        ) : (
          <div className="px-3 py-2 text-xs space-y-1.5">
            <p className="text-muted-foreground">
              Host:{" "}
              <span className="font-medium text-foreground">
                {getPreviewHost(url)}
              </span>
            </p>
            <p className="text-muted-foreground">
              This site blocks embedded previews (X-Frame-Options/CSP). Open the link in a new tab.
            </p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

export default function CourseDetailContent({
  course,
  isEnrolled,
  descriptionEmptyText,
  availableTopics,
  availableSemesters,
  studyPlans,
  projectSeminarRef = null,
  assignments = [],
  scheduleItems = [],
  studyLogs = [],
}: CourseDetailContentProps) {
  const [enrolled, setEnrolled] = useState(isEnrolled);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPlans, setIsGeneratingPlans] = useState(false);
  const [isConfirmingPlans, setIsConfirmingPlans] = useState(false);
  const [editablePlans, setEditablePlans] =
    useState<EditableStudyPlan[]>(studyPlans);
  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null);
  const [editingPlanBackup, setEditingPlanBackup] =
    useState<EditableStudyPlan | null>(null);
  const [savingPlanIndex, setSavingPlanIndex] = useState<number | null>(null);
  const [deletingPlanIndex, setDeletingPlanIndex] = useState<number | null>(
    null,
  );
  const [locatingPlanIndex, setLocatingPlanIndex] = useState<number | null>(
    null,
  );
  const [planPreview, setPlanPreview] = useState<{
    originalSchedule: Array<{ type: string; line: string }>;
    generatedPlans: SchedulePlanPreview[];
  } | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [localResources, setLocalResources] = useState<string[]>(
    course.resources || [],
  );
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [removingUrlIndex, setRemovingUrlIndex] = useState<number | null>(null);
  const [resourcePreviewState, setResourcePreviewState] = useState<
    Record<string, "blocked">
  >({});
  const [resourceLinkPreviews, setResourceLinkPreviews] = useState<
    Record<string, LinkPreviewData | null>
  >({});
  const [resourceLinkPreviewLoading, setResourceLinkPreviewLoading] = useState<
    Record<string, boolean>
  >({});
  const [copiedResourceUrl, setCopiedResourceUrl] = useState<string | null>(null);
  const [showAllResources, setShowAllResources] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<
    string | null
  >(null);
  const [visibleCalendarMonthKey, setVisibleCalendarMonthKey] = useState<
    string | null
  >(null);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const router = useRouter();
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hasStudyPlans = editablePlans.length > 0;
  const normalizeTime = (value: string) =>
    value.length === 5 ? `${value}:00` : value || "09:00:00";
  const unitInfo = useMemo(
    () => getUniversityUnitInfo(course.university, course.units),
    [course.university, course.units],
  );
  const currentTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);
  const timeZoneOptions = useMemo(() => {
    try {
      const intlWithSupported =
        Intl as unknown as Intl.DateTimeFormatConstructor & {
          supportedValuesOf?: (key: string) => string[];
        };
      const zones = intlWithSupported.supportedValuesOf?.("timeZone");
      if (zones && zones.length > 0) {
        return zones;
      }
      return [currentTimeZone, "UTC"];
    } catch {
      return [currentTimeZone, "UTC"];
    }
  }, [currentTimeZone]);
  const getTimeZoneGroups = (selected?: string) => {
    const zones = [...timeZoneOptions];
    const normalizedSelected = selected?.trim();
    if (normalizedSelected && !zones.includes(normalizedSelected)) {
      zones.unshift(normalizedSelected);
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
      )
        group = "Asia/Pacific";
      else if (zone.startsWith("Africa/")) group = "Africa";
      const bucket = groups.get(group) || [];
      bucket.push(zone);
      groups.set(group, bucket);
    });
    const order = ["Americas", "Europe", "Asia/Pacific", "Africa", "Other"];
    return order
      .filter((key) => groups.has(key))
      .map((key) => ({ value: key, items: groups.get(key) || [] }));
  };
  const estimatedWorkload = unitInfo.estimate?.details || "-";
  const codeBreakdown = useMemo(
    () => getCourseCodeBreakdown(course.university, course.courseCode),
    [course.university, course.courseCode],
  );
  const categoryRaw =
    typeof course.details?.category === "string" ? course.details.category : "";
  const categoryLabel =
    categoryRaw === "Compulsory elective modules in Computer Science"
      ? "Compulsory elective"
      : categoryRaw === "Theoretical Computer Science"
        ? "Theoretical"
        : categoryRaw === "Advanced Project"
          ? "Project"
          : categoryRaw === "Seminar"
            ? "Seminar"
            : categoryRaw;
  const variantCodeLinks = useMemo(() => {
    const details =
      (course.details as Record<string, unknown> | undefined) || {};
    const raw =
      details.variant_code_links ||
      details.cmu_code_links ||
      details.mit_code_links ||
      details.ucb_code_links ||
      details.stanford_code_links;
    if (!Array.isArray(raw)) return [] as Array<{ id: string; link: string }>;
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id =
          typeof (item as Record<string, unknown>).id === "string"
            ? (item as Record<string, unknown>).id
            : "";
        const link =
          typeof (item as Record<string, unknown>).link === "string"
            ? (item as Record<string, unknown>).link
            : "";
        if (!id) return null;
        return { id, link };
      })
      .filter((item): item is { id: string; link: string } => item !== null);
  }, [course.details]);
  const variantLabel =
    course.university?.toLowerCase() === "mit"
      ? "MIT Course Variants"
      : course.university?.toLowerCase() === "ucb"
        ? "UCB Course Variants"
        : course.university?.toLowerCase() === "stanford"
          ? "Stanford Course Variants"
          : "CMU Course Variants";
  const visibleResources = showAllResources
    ? localResources
    : localResources.slice(0, 5);
  const hasMoreResources = localResources.length > 5;
  const completionByDate = useMemo(() => {
    const next = new Map<string, boolean>();
    for (const log of studyLogs || []) {
      if (!log.isCompleted || log.scheduleId || log.assignmentId) continue;
      const dateIso = String(log.logDate || "").includes("T")
        ? String(log.logDate).split("T")[0]
        : String(log.logDate || "");
      if (!dateIso) continue;
      next.set(dateIso, true);
    }
    return next;
  }, [studyLogs]);

  const scheduleCompletion = useMemo(() => {
    const next = new Map<number, boolean>();
    for (const log of studyLogs || []) {
      if (log.isCompleted && log.scheduleId) {
        next.set(log.scheduleId, true);
      }
    }
    return next;
  }, [studyLogs]);

  const assignmentCompletion = useMemo(() => {
    const next = new Map<number, boolean>();
    for (const log of studyLogs || []) {
      if (log.isCompleted && log.assignmentId) {
        next.set(log.assignmentId, true);
      }
    }
    return next;
  }, [studyLogs]);

  useEffect(() => {
    setLocalResources(course.resources || []);
    setShowAllResources(false);
  }, [course.resources]);

  const studyPlanCalendar = useMemo(() => {
    return buildCourseDetailCalendar({
      courseTitle: course.title,
      assignments,
      scheduleItems,
      studyPlans: editablePlans,
      completionByDate,
      scheduleCompletion,
      assignmentCompletion,
    });
  }, [
    assignments,
    completionByDate,
    course.title,
    editablePlans,
    scheduleItems,
    scheduleCompletion,
    assignmentCompletion,
  ]);

  useEffect(() => {
    if (!studyPlanCalendar.range) {
      setSelectedCalendarDate(null);
      return;
    }
    const current = selectedCalendarDate;
    if (
      current &&
      current >= studyPlanCalendar.range.startIso &&
      current <= studyPlanCalendar.range.endIso
    ) {
      return;
    }
    const firstEventDate =
      Array.from(studyPlanCalendar.eventsByDate.keys()).sort()[0] || null;
    setSelectedCalendarDate(firstEventDate || studyPlanCalendar.range.startIso);
  }, [studyPlanCalendar, selectedCalendarDate]);

  useEffect(() => {
    const months = studyPlanCalendar.months;
    if (months.length === 0) {
      setVisibleCalendarMonthKey(null);
      return;
    }
    if (
      visibleCalendarMonthKey &&
      months.some((month) => month.key === visibleCalendarMonthKey)
    ) {
      return;
    }
    const selectedMonthKey = selectedCalendarDate
      ? selectedCalendarDate.slice(0, 7)
      : null;
    if (
      selectedMonthKey &&
      months.some((month) => month.key === selectedMonthKey)
    ) {
      setVisibleCalendarMonthKey(selectedMonthKey);
      return;
    }
    setVisibleCalendarMonthKey(months[0].key);
  }, [studyPlanCalendar.months, selectedCalendarDate, visibleCalendarMonthKey]);

  const visibleCalendarMonthIndex = studyPlanCalendar.months.findIndex(
    (month) => month.key === visibleCalendarMonthKey,
  );
  const resolvedCalendarMonthIndex =
    visibleCalendarMonthIndex >= 0 ? visibleCalendarMonthIndex : 0;
  const visibleCalendarMonth =
    studyPlanCalendar.months[resolvedCalendarMonthIndex] || null;
  const todayIso = toIsoDateUtc(new Date());
  const getEventKindBadgeClass = (kind: string) => {
    switch (kind) {
      case "lecture":
        return "bg-blue-100 text-blue-800";
      case "reading":
        return "bg-indigo-100 text-indigo-800";
      case "assignment":
        return "bg-amber-100 text-amber-800";
      case "project":
        return "bg-emerald-100 text-emerald-800";
      case "lab":
        return "bg-cyan-100 text-cyan-800";
      case "quiz":
      case "exam":
      case "deadline":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };
  const getEventKindBarClass = (kind: string, isSelected: boolean) => {
    if (isSelected) {
      switch (kind) {
        case "lecture":
          return "bg-blue-200";
        case "reading":
          return "bg-indigo-200";
        case "assignment":
          return "bg-amber-200";
        case "project":
          return "bg-emerald-200";
        case "lab":
          return "bg-cyan-200";
        case "quiz":
        case "exam":
        case "deadline":
          return "bg-rose-200";
        default:
          return "bg-white/80";
      }
    }

    switch (kind) {
      case "lecture":
        return "bg-blue-500";
      case "reading":
        return "bg-indigo-500";
      case "assignment":
        return "bg-amber-500";
      case "project":
        return "bg-emerald-500";
      case "lab":
        return "bg-cyan-500";
      case "quiz":
      case "exam":
      case "deadline":
        return "bg-rose-500";
      default:
        return "bg-slate-500";
    }
  };

  const handleGeneratePlans = async () => {
    setIsGeneratingPlans(true);
    try {
      const preview = await previewStudyPlansFromCourseSchedule(course.id);
      const selectableIds = preview.generatedPlans.map((_, idx) => String(idx));
      setPlanPreview(preview);
      setSelectedPlanIds(selectableIds);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate study plans from schedule",
        { position: "bottom-right" },
      );
    } finally {
      setIsGeneratingPlans(false);
    }
  };

  const handleConfirmPlans = async () => {
    if (!planPreview) return;
    setIsConfirmingPlans(true);
    try {
      const selected = planPreview.generatedPlans
        .map((plan, idx) => ({ plan, idx: String(idx) }))
        .filter(({ idx }) => selectedPlanIds.includes(idx))
        .map(({ plan }) => ({
          daysOfWeek: plan.daysOfWeek,
          startTime: plan.startTime,
          endTime: plan.endTime,
          location: plan.location,
          kind: plan.kind,
          startDate: plan.startDate,
          endDate: plan.endDate,
        }));
      const result = await confirmGeneratedStudyPlans(course.id, selected, {
        replaceExisting: true,
      });
      toast.success(`Updated Weekly Schedule with ${result.created} plan(s).`, {
        position: "bottom-right",
      });
      setPlanPreview(null);
      setSelectedPlanIds([]);
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save generated study plans",
        { position: "bottom-right" },
      );
    } finally {
      setIsConfirmingPlans(false);
    }
  };

  const handleDiscardPlans = () => {
    setPlanPreview(null);
    setSelectedPlanIds([]);
  };

  const handleEnrollToggle = async () => {
    setIsEnrolling(true);
    try {
      await toggleCourseEnrollmentAction(course.id, enrolled);
      setEnrolled(!enrolled);
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleAddUrl = async () => {
    const urls = newUrl
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);
    if (!urls.length) return;
    const updated = [...localResources, ...urls];
    setLocalResources(updated);
    setNewUrl("");
    setShowAddUrl(false);
    setIsAddingUrl(true);
    try {
      await updateCourseResources(course.id, updated);
    } catch (error) {
      console.error(error);
      setLocalResources(localResources);
      setNewUrl(urls.join("\n"));
      setShowAddUrl(true);
    } finally {
      setIsAddingUrl(false);
    }
  };

  const ensureLinkPreview = async (url: string) => {
    if (!getPreviewableUrl(url)) return;
    if (resourceLinkPreviews[url] !== undefined || resourceLinkPreviewLoading[url]) return;

    setResourceLinkPreviewLoading((prev) => ({ ...prev, [url]: true }));
    try {
      const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("Preview request failed");
      const data = (await res.json()) as LinkPreviewData;
      setResourceLinkPreviews((prev) => ({ ...prev, [url]: data }));
    } catch {
      setResourceLinkPreviews((prev) => ({ ...prev, [url]: null }));
    } finally {
      setResourceLinkPreviewLoading((prev) => ({ ...prev, [url]: false }));
    }
  };

  const handleRemoveUrl = async (index: number) => {
    if (index < 0 || index >= localResources.length) return;
    const previous = localResources;
    const updated = previous.filter((_, i) => i !== index);
    setLocalResources(updated);
    setRemovingUrlIndex(index);
    try {
      await updateCourseResources(course.id, updated);
    } catch (error) {
      console.error(error);
      setLocalResources(previous);
    } finally {
      setRemovingUrlIndex(null);
    }
  };

  const handleCopyResourceUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedResourceUrl(url);
      toast.success("Resource URL copied", { position: "bottom-right" });
      window.setTimeout(() => {
        setCopiedResourceUrl((current) => (current === url ? null : current));
      }, 1200);
    } catch (error) {
      console.error(error);
      toast.error("Failed to copy resource URL", { position: "bottom-right" });
    }
  };

  const handleDeleteSinglePlan = async (index: number) => {
    const plan = editablePlans[index];
    if (!plan) return;
    if (!plan.id) return;
    setDeletingPlanIndex(index);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_plan", planId: plan.id }),
      });
      if (!res.ok) throw new Error("Failed to delete study plan");
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete study plan",
        { position: "bottom-right" },
      );
    } finally {
      setDeletingPlanIndex(null);
    }
  };

  const handleSaveSinglePlan = async (index: number) => {
    const plan = editablePlans[index];
    if (!plan) return;
    setSavingPlanIndex(index);
    try {
      if (plan.id) {
        const res = await fetch("/api/study-plans/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: plan.id,
            courseId: course.id,
            startDate: plan.startDate,
            endDate: plan.endDate,
            daysOfWeek: plan.daysOfWeek,
            startTime: normalizeTime(plan.startTime),
            endTime: normalizeTime(plan.endTime),
            location: plan.location,
            kind: plan.kind,
            timezone: plan.timezone || "UTC",
          }),
        });
        if (!res.ok) throw new Error("Failed to update study plan");
      }
      setEditingPlanIndex(null);
      setEditingPlanBackup(null);
      startTransition(() => router.refresh());
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save study plan",
        { position: "bottom-right" },
      );
    } finally {
      setSavingPlanIndex(null);
    }
  };

  const handleStartEditPlan = (index: number) => {
    const target = editablePlans[index];
    const normalizedTarget = target
      ? {
          ...target,
          daysOfWeek: [...(target.daysOfWeek || [])],
          timezone: target.timezone?.trim() || currentTimeZone,
        }
      : null;
    if (normalizedTarget) {
      setEditablePlans((prev) =>
        prev.map((plan, i) => (i === index ? normalizedTarget : plan)),
      );
    }
    setEditingPlanIndex(index);
    setEditingPlanBackup(normalizedTarget);
  };

  const handleCancelEditPlan = () => {
    if (editingPlanIndex !== null && editingPlanBackup) {
      const index = editingPlanIndex;
      setEditablePlans((prev) =>
        prev.map((plan, i) => (i === index ? editingPlanBackup : plan)),
      );
    }
    setEditingPlanIndex(null);
    setEditingPlanBackup(null);
  };

  const handleUseCurrentLocationForPlan = (index: number) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    setLocatingPlanIndex(index);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        const locationName = await reverseGeocodeLocationName(
          Number(lat),
          Number(lng),
        );
        setEditablePlans((prev) =>
          prev.map((plan, i) =>
            i === index ? { ...plan, location: locationName } : plan,
          ),
        );
        setLocatingPlanIndex(null);
      },
      () => {
        setLocatingPlanIndex(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const updateEditablePlan = (
    index: number,
    updater: (plan: EditableStudyPlan) => EditableStudyPlan,
  ) => {
    setEditablePlans((prev) =>
      prev.map((plan, i) => (i === index ? updater(plan) : plan)),
    );
  };

  const toggleEditDay = (index: number, dayIdx: number) => {
    updateEditablePlan(index, (plan) => {
      const currentDays = plan.daysOfWeek || [];
      const nextDays = currentDays.includes(dayIdx)
        ? currentDays.filter((d) => d !== dayIdx)
        : [...currentDays, dayIdx].sort((a, b) => a - b);
      return { ...plan, daysOfWeek: nextDays };
    });
  };
  const handleAddPlanSuccess = (plan: {
    id: number;
    start_date: string;
    end_date: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    location: string;
    timezone?: string | null;
  }) => {
    setEditablePlans((prev) => {
      const nextPlan: EditableStudyPlan = {
        id: plan.id,
        startDate: plan.start_date,
        endDate: plan.end_date,
        daysOfWeek: plan.days_of_week || [],
        startTime: plan.start_time || "09:00:00",
        endTime: plan.end_time || "10:00:00",
        location: plan.location || "",
        kind: "Self-Study",
        timezone: plan.timezone || "UTC",
      };
      const existingIndex = prev.findIndex((item) => item.id === plan.id);
      const merged =
        existingIndex >= 0
          ? prev.map((item, idx) => (idx === existingIndex ? nextPlan : item))
          : [...prev, nextPlan];
      return merged.sort((a, b) => a.startDate.localeCompare(b.startDate));
    });
  };

  return (
    <div className="h-full min-h-0 overflow-hidden px-4">
      <div className="grid h-full min-h-0 overflow-hidden grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-0 lg:divide-x lg:divide-[#F5F5F5]">
        <div className="no-scrollbar min-h-0 space-y-5 overflow-x-hidden overflow-y-auto lg:pr-5">
          <CourseDetailHeader
            course={course}
            isEditing={isEditing}
            onToggleEdit={() => setIsEditing(!isEditing)}
            projectSeminarRef={projectSeminarRef}
            enrolled={enrolled}
            isEnrolling={isEnrolling}
            onToggleEnroll={handleEnrollToggle}
            codeBreakdown={codeBreakdown}
          />

          {!isEditing ? (
            <section className="py-2">
              <h2 className="mb-2 text-lg font-semibold text-[#1f1f1f]">
                Description
              </h2>
              {course.description ? (
                <div className="prose prose-sm prose-gray max-w-none prose-p:text-[#555] prose-p:leading-7">
                  <p>{course.description}</p>
                </div>
              ) : (
                <p className="text-gray-500 italic">{descriptionEmptyText}</p>
              )}
            </section>
          ) : (
            <CourseDetailTopSection
              course={course}
              descriptionEmptyText={descriptionEmptyText}
              availableTopics={availableTopics}
              availableSemesters={availableSemesters}
              studyPlans={studyPlans}
              isEditing={isEditing}
              onEditingChange={setIsEditing}
              projectSeminarRef={projectSeminarRef}
              showHeader={false}
            />
          )}

          <section className="py-2">
            <div>
              <h2 className="text-lg font-semibold text-[#1f1f1f] mb-3">
                Logistics
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-sm font-medium text-[#333] flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#777]" />
                    Weekly Schedule
                  </h3>
                  <div className="inline-flex items-center gap-1">
                    <Popover
                      open={showAddPlanModal}
                      onOpenChange={setShowAddPlanModal}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          type="button"
                          title="Add schedule"
                          aria-label="Add schedule"
                        >
                          <CalendarPlus />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto border-0 bg-transparent p-0 shadow-none"
                        align="end"
                      >
                        <AddPlanModal
                          mode="inline"
                          isOpen={showAddPlanModal}
                          onClose={() => setShowAddPlanModal(false)}
                          onSuccess={handleAddPlanSuccess}
                          course={{
                            id: course.id,
                            title: course.title,
                            courseCode: course.courseCode,
                            university: course.university,
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      type="button"
                      onClick={handleGeneratePlans}
                      disabled={isGeneratingPlans}
                      title="Generate study plan preview"
                    >
                      {isGeneratingPlans ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <WandSparkles />
                      )}
                    </Button>
                  </div>
                </div>
                <div
                  className={
                    hasStudyPlans
                      ? "grid grid-cols-1 gap-3 md:grid-cols-2"
                      : "space-y-4"
                  }
                >
                  {hasStudyPlans ? (
                    editablePlans.map((plan, idx) => (
                      <WeeklyScheduleCard
                        key={plan.id ?? idx}
                        size="small"
                        title={
                          editingPlanIndex !== idx ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm font-semibold text-[#111111] leading-snug">
                                <span>
                                  {plan.startTime.slice(0, 5)} -{" "}
                                  {plan.endTime.slice(0, 5)}
                                </span>
                                <span className="rounded-sm bg-[#f3f3f3] px-1.5 py-0.5 text-[10px] font-medium text-[#666]">
                                  {plan.timezone || "UTC"}
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1 py-1"
                                aria-label="Study days"
                              >
                                {Array.from({ length: 7 }).map((_, dayIdx) => (
                                  <span
                                    key={`study-day-dot-${plan.id ?? idx}-${dayIdx}`}
                                    className={`h-2 w-2 rounded-full ${
                                      (plan.daysOfWeek || []).includes(dayIdx)
                                        ? "bg-black"
                                        : "bg-muted"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <Badge className="items-center gap-1 border-[#e3e3e3] bg-[#f8f8f8] px-2 py-0.5 text-[#666]">
                                <span className="font-semibold text-[#111111]">
                                  {(plan.daysOfWeek || []).length}
                                </span>
                                days/week
                              </Badge>
                              <Badge className="items-center gap-1 border-[#e3e3e3] bg-[#f8f8f8] px-2 py-0.5 text-[#666]">
                                <span className="font-semibold text-[#111111]">
                                  {calculateInclusiveDays(
                                    plan.startDate,
                                    plan.endDate,
                                  ) ?? 0}
                                </span>
                                days
                              </Badge>
                            </div>
                          )
                        }
                        headerRight={
                          <>
                            {editingPlanIndex === idx ? null : (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  type="button"
                                  onClick={() => handleStartEditPlan(idx)}
                                  title="Edit plan"
                                >
                                  <PenSquare />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon-sm"
                                  type="button"
                                  onClick={() => handleDeleteSinglePlan(idx)}
                                  disabled={deletingPlanIndex === idx}
                                  title="Delete plan"
                                >
                                  {deletingPlanIndex === idx ? (
                                    <Loader2 className="animate-spin" />
                                  ) : (
                                    <Trash2 />
                                  )}
                                </Button>
                              </>
                            )}
                          </>
                        }
                        footer={
                          editingPlanIndex === idx ? null : (
                            <div className="space-y-0.5">
                              <p>
                                {formatDateForUser(plan.startDate, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {" - "}
                                {formatDateForUser(plan.endDate, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                              {calculateInclusiveDays(
                                plan.startDate,
                                plan.endDate,
                              ) !== null && (
                                <p className="text-[#666]">
                                  <span className="font-semibold text-[#111]">
                                    {calculateInclusiveDays(
                                      plan.startDate,
                                      plan.endDate,
                                    )}
                                  </span>{" "}
                                  days
                                </p>
                              )}
                            </div>
                          )
                        }
                      >
                        {editingPlanIndex === idx ? (
                          <div className="mt-2">
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <Field className="md:col-span-2">
                                  <FieldLabel>Date Range</FieldLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        type="button"
                                        className="w-full justify-between font-normal"
                                      >
                                        {plan.startDate && plan.endDate
                                          ? `${format(parseISO(plan.startDate), "LLL dd, y")} - ${format(parseISO(plan.endDate), "LLL dd, y")}`
                                          : "Pick a date range"}
                                        <ChevronDownIcon />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="range"
                                        numberOfMonths={2}
                                        selected={
                                          {
                                            from: plan.startDate
                                              ? parseISO(plan.startDate)
                                              : undefined,
                                            to: plan.endDate
                                              ? parseISO(plan.endDate)
                                              : undefined,
                                          } as DateRange
                                        }
                                        onSelect={(range) => {
                                          const from = range?.from;
                                          const to = range?.to || range?.from;
                                          if (!from) return;
                                          updateEditablePlan(idx, (p) => ({
                                            ...p,
                                            startDate: format(
                                              from,
                                              "yyyy-MM-dd",
                                            ),
                                            endDate: format(to!, "yyyy-MM-dd"),
                                          }));
                                        }}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </Field>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <Field>
                                  <FieldLabel>Start Time</FieldLabel>
                                  <Input
                                    type="time"
                                    step="1"
                                    value={plan.startTime.slice(0, 5)}
                                    onChange={(e) =>
                                      updateEditablePlan(idx, (p) => ({
                                        ...p,
                                        startTime: normalizeTime(
                                          e.target.value,
                                        ),
                                      }))
                                    }
                                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel>End Time</FieldLabel>
                                  <Input
                                    type="time"
                                    step="1"
                                    value={plan.endTime.slice(0, 5)}
                                    onChange={(e) =>
                                      updateEditablePlan(idx, (p) => ({
                                        ...p,
                                        endTime: normalizeTime(e.target.value),
                                      }))
                                    }
                                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                  />
                                </Field>
                              </div>

                              <Field>
                                <FieldLabel>Days of Week</FieldLabel>
                                <div className="grid grid-cols-7 gap-1">
                                  {dayLabels.map((day, dayIdx) => {
                                    const selected = (
                                      plan.daysOfWeek || []
                                    ).includes(dayIdx);
                                    return (
                                      <Toggle
                                        key={`edit-day-${idx}-${day}`}
                                        pressed={selected}
                                        onPressedChange={() =>
                                          toggleEditDay(idx, dayIdx)
                                        }
                                        variant="outline"
                                        size="sm"
                                        className="text-[11px] font-semibold data-[state=on]:border-black data-[state=on]:bg-black data-[state=on]:text-white"
                                      >
                                        {day}
                                      </Toggle>
                                    );
                                  })}
                                </div>
                              </Field>

                              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                <Field>
                                  <FieldLabel>Kind</FieldLabel>
                                  <Input
                                    value={plan.kind || ""}
                                    onChange={(e) =>
                                      updateEditablePlan(idx, (p) => ({
                                        ...p,
                                        kind: e.target.value,
                                      }))
                                    }
                                    placeholder="Type"
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel>Location</FieldLabel>
                                  <InputGroup>
                                    <InputGroupInput
                                      value={plan.location}
                                      onChange={(e) =>
                                        updateEditablePlan(idx, (p) => ({
                                          ...p,
                                          location: e.target.value,
                                        }))
                                      }
                                      placeholder="Location"
                                    />
                                    <InputGroupAddon align="inline-end">
                                      <InputGroupButton
                                        size="icon-xs"
                                        type="button"
                                        onClick={() =>
                                          handleUseCurrentLocationForPlan(idx)
                                        }
                                        title="Use current location"
                                        aria-label="Use current location"
                                      >
                                        {locatingPlanIndex === idx ? (
                                          <Loader2 className="animate-spin" />
                                        ) : (
                                          <LocateFixed />
                                        )}
                                      </InputGroupButton>
                                    </InputGroupAddon>
                                  </InputGroup>
                                </Field>
                                <Field>
                                  <FieldLabel>Timezone</FieldLabel>
                                  {(() => {
                                    const timeZoneGroups = getTimeZoneGroups(
                                      plan.timezone || currentTimeZone,
                                    );
                                    return (
                                      <Combobox
                                        items={timeZoneGroups}
                                        value={plan.timezone || currentTimeZone}
                                        onValueChange={(next) => {
                                          updateEditablePlan(idx, (p) => ({
                                            ...p,
                                            timezone: String(
                                              next || currentTimeZone,
                                            ),
                                          }));
                                        }}
                                      >
                                        <ComboboxInput placeholder="Select timezone" />
                                        <ComboboxContent>
                                          <ComboboxEmpty>
                                            No timezones found.
                                          </ComboboxEmpty>
                                          <ComboboxList>
                                            {(group, groupIndex) => (
                                              <ComboboxGroup
                                                key={`${idx}-${group.value}`}
                                                items={group.items}
                                              >
                                                <ComboboxLabel>
                                                  {group.value}
                                                </ComboboxLabel>
                                                <ComboboxCollection>
                                                  {(item) => (
                                                    <ComboboxItem
                                                      key={`${idx}-${item}`}
                                                      value={item}
                                                    >
                                                      {item}
                                                    </ComboboxItem>
                                                  )}
                                                </ComboboxCollection>
                                                {groupIndex <
                                                timeZoneGroups.length - 1 ? (
                                                  <ComboboxSeparator />
                                                ) : null}
                                              </ComboboxGroup>
                                            )}
                                          </ComboboxList>
                                        </ComboboxContent>
                                      </Combobox>
                                    );
                                  })()}
                                </Field>
                              </div>
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                onClick={() => handleSaveSinglePlan(idx)}
                                disabled={savingPlanIndex === idx}
                                title="Confirm"
                              >
                                {savingPlanIndex === idx ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <Check />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                onClick={handleCancelEditPlan}
                                title="Cancel"
                              >
                                <X />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm text-[#444] space-y-1">
                              <span className="flex items-start gap-1.5 min-w-0 leading-tight">
                                <Tag className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2 break-words">
                                  {plan.kind || "Session"}
                                </span>
                              </span>
                              <span className="flex items-start gap-1.5 min-w-0 leading-tight">
                                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2 break-words">
                                  {plan.location || "TBD"}
                                </span>
                              </span>

                            </div>
                          </div>
                        )}
                      </WeeklyScheduleCard>
                    ))
                  ) : course.details?.schedule &&
                    Object.keys(course.details.schedule).length > 0 ? (
                    Object.entries(course.details?.schedule || {}).map(
                      ([type, times]) => (
                        <div key={type}>
                          <div className="text-xs font-medium text-[#777] mb-1">
                            {type}
                          </div>
                          <ul className="space-y-2">
                            {(times as string[]).map((time, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-[#444] leading-snug break-all"
                              >
                                {time}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-[#9a9a9a]">
                      No schedule available yet.
                    </p>
                  )}
                </div>

                {course.instructors && course.instructors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[#333] mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#777]" />
                      Teaching Staff
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {course.instructors.map((inst, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-3 bg-white px-2.5 py-2"
                        >
                          <div className="w-8 h-8 rounded-full bg-[#efefef] flex items-center justify-center text-[#666] text-xs font-medium">
                            {inst.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-[#222]">
                            {inst}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {planPreview && (
                <div className="bg-[#fcfcfc]">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-[#1f1f1f]">
                      Study Plan Preview
                    </h3>
                    <p className="text-xs text-[#777]">
                      Select plans to save into your roadmap
                    </p>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-sm bg-white p-4">
                      <p className="text-xs font-medium text-[#666] mb-2">
                        Original Schedule
                      </p>
                      <ul className="space-y-1.5 text-sm text-[#444]">
                        {planPreview.originalSchedule.map((item, idx) => (
                          <li key={`${item.type}-${idx}`}>
                            <span className="font-medium">{item.type}:</span>{" "}
                            {item.line}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-sm bg-white p-4">
                      <p className="text-xs font-medium text-[#666] mb-2">
                        AI Generated Plans
                      </p>
                      <ul className="space-y-2">
                        {planPreview.generatedPlans.map((plan, idx) => {
                          const id = String(idx);
                          const disabled = false;
                          const daysText = plan.daysOfWeek
                            .map((d) => dayLabels[d] || String(d))
                            .join(", ");
                          return (
                            <li key={id} className=" bg-white px-2.5 py-2">
                              <label className="flex items-start gap-2 text-sm text-[#444]">
                                <Input
                                  type="checkbox"
                                  checked={selectedPlanIds.includes(id)}
                                  disabled={disabled || isConfirmingPlans}
                                  onChange={(e) => {
                                    setSelectedPlanIds((prev) =>
                                      e.target.checked
                                        ? [...prev, id]
                                        : prev.filter((v) => v !== id),
                                    );
                                  }}
                                  className="mt-0.5"
                                />

                                <span className="min-w-0">
                                  <span className="block font-medium">
                                    {daysText} • {plan.startTime.slice(0, 5)}-
                                    {plan.endTime.slice(0, 5)}
                                  </span>
                                  <span className="block text-xs text-[#666]">
                                    <Badge className="mr-1.5 inline-block max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap bg-[#f3f3f3] px-2 py-0.5 text-[11px] font-medium text-[#444] align-bottom">
                                      {plan.kind || "Session"}
                                    </Badge>
                                    @ {plan.location}
                                    {plan.alreadyExists
                                      ? " (will replace existing)"
                                      : ""}
                                  </span>
                                  {plan.startDate && plan.endDate && (
                                    <span className="block text-xs text-[#888]">
                                      {formatDateForUser(plan.startDate, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                      {" - "}
                                      {formatDateForUser(plan.endDate, {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleConfirmPlans}
                      disabled={
                        isConfirmingPlans || selectedPlanIds.length === 0
                      }
                      size="sm"
                    >
                      {isConfirmingPlans ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Check />
                      )}
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDiscardPlans}
                      disabled={isConfirmingPlans}
                      size="sm"
                    >
                      <X />
                      Discard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {(course.prerequisites || course.corequisites) && (
            <div className="bg-[#fcfcfc]">
              <h2 className="text-base font-semibold text-[#1f1f1f] mb-3">
                Prerequisites
              </h2>
              <div className="space-y-8">
                {course.prerequisites && (
                  <div>
                    <span className="text-xs font-medium text-[#777] block mb-2">
                      Required Knowledge
                    </span>
                    <p className="text-sm text-[#444] leading-relaxed">
                      {course.prerequisites}
                    </p>
                  </div>
                )}
                {course.corequisites && (
                  <div>
                    <span className="text-xs font-medium text-[#777] block mb-2">
                      Corequisites
                    </span>
                    <p className="text-sm text-[#444] leading-relaxed">
                      {course.corequisites}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {studyPlanCalendar.range ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#1f1f1f]">
                  Schedule Calendar
                </h2>
                <span className="text-[11px] text-[#777]">
                  {studyPlanCalendar.range.startIso} -{" "}
                  {studyPlanCalendar.range.endIso}
                </span>
              </div>
              <Card>
                <CardContent className="p-0">
                  <div className="bg-background">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="p-3 xl:border-r">
                        {visibleCalendarMonth ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Button
                                variant="outline"
                                size="icon-sm"
                                type="button"
                                onClick={() => {
                                  if (resolvedCalendarMonthIndex <= 0) return;
                                  const previousMonth =
                                    studyPlanCalendar.months[
                                      resolvedCalendarMonthIndex - 1
                                    ];

                                  if (previousMonth)
                                    setVisibleCalendarMonthKey(
                                      previousMonth.key,
                                    );
                                }}
                                disabled={resolvedCalendarMonthIndex <= 0}
                                title="Previous month"
                              >
                                <ChevronLeft />
                              </Button>
                              <p className="text-sm font-semibold text-[#2a2a2a]">
                                {visibleCalendarMonth.label}
                              </p>
                              <Button
                                variant="outline"
                                size="icon-sm"
                                type="button"
                                onClick={() => {
                                  if (
                                    resolvedCalendarMonthIndex >=
                                    studyPlanCalendar.months.length - 1
                                  )
                                    return;
                                  const nextMonth =
                                    studyPlanCalendar.months[
                                      resolvedCalendarMonthIndex + 1
                                    ];

                                  if (nextMonth)
                                    setVisibleCalendarMonthKey(nextMonth.key);
                                }}
                                disabled={
                                  resolvedCalendarMonthIndex >=
                                  studyPlanCalendar.months.length - 1
                                }
                                title="Next month"
                              >
                                <ChevronRight />
                              </Button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-1">
                              {dayLabels.map((day) => (
                                <div
                                  key={`${visibleCalendarMonth.key}-${day}`}
                                  className="text-[10px] text-[#8a8a8a] font-medium text-center py-1"
                                >
                                  {day}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                              {visibleCalendarMonth.cells.map((cell) => {
                                const events =
                                  studyPlanCalendar.eventsByDate.get(
                                    cell.dateIso,
                                  ) || [];
                                const isSelected =
                                  selectedCalendarDate === cell.dateIso;
                                const isToday = cell.dateIso === todayIso;
                                const canSelect = cell.inRange;
                                const hasEvents = events.length > 0;
                                const previewEvents = events.slice(0, 3);
                                const remainingEventsCount = Math.max(
                                  events.length - previewEvents.length,
                                  0,
                                );
                                return (
                                  <Button
                                    variant="outline"
                                    type="button"
                                    key={`${visibleCalendarMonth.key}-${cell.dateIso}`}
                                    onClick={() => {
                                      if (!canSelect) return;
                                      setSelectedCalendarDate(cell.dateIso);
                                      const targetMonthKey = cell.dateIso.slice(
                                        0,
                                        7,
                                      );
                                      if (
                                        targetMonthKey !==
                                        visibleCalendarMonth.key
                                      ) {
                                        setVisibleCalendarMonthKey(
                                          targetMonthKey,
                                        );
                                      }
                                    }}
                                    disabled={!canSelect}
                                    className={`h-auto min-h-[76px] w-full flex-col items-start justify-start gap-1 overflow-hidden p-1.5 text-left transition-colors ${
                                      isSelected
                                        ? "border-black bg-black !text-white hover:bg-black hover:!text-white"
                                        : isToday
                                          ? "border-black/70 bg-black/[0.04] hover:bg-black/[0.08]"
                                          : hasEvents
                                            ? "border-black/25 bg-black/[0.02] hover:bg-black/[0.06]"
                                            : "hover:bg-black/[0.04]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`font-semibold ${isSelected ? "text-white" : isToday ? "text-[#111]" : "text-[#666]"}`}
                                      >
                                        {cell.day}
                                      </span>
                                    </div>
                                    <div className="mt-1 space-y-1 overflow-hidden">
                                      {previewEvents.map((event, idx) => (
                                        <div
                                          key={`${cell.dateIso}-bar-${idx}`}
                                          data-kind={event.kind}
                                          data-testid={`calendar-bar-${cell.dateIso}-${idx}`}
                                          className={`h-1 w-full rounded-full ${getEventKindBarClass(event.kind, isSelected)}`}
                                        />
                                      ))}
                                      {remainingEventsCount > 0 ? (
                                        <p
                                          className={`text-[10px] leading-none ${
                                            isSelected ? "text-white/80" : "text-[#7a7a7a]"
                                          }`}
                                        >
                                          +{remainingEventsCount} more
                                        </p>
                                      ) : null}
                                    </div>
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="p-3">
                        <h3 className="text-base font-semibold text-[#1f1f1f]">
                          Day Details
                        </h3>
                        <p className="text-xs text-[#777] mt-1">
                          {selectedCalendarDate || "Select a day"}
                        </p>
                        {selectedCalendarDate ? (
                          (
                            studyPlanCalendar.eventsByDate.get(
                              selectedCalendarDate,
                            ) || []
                          ).length > 0 ? (
                            <ul className="mt-3 space-y-2">
                              {(
                                studyPlanCalendar.eventsByDate.get(
                                  selectedCalendarDate,
                                ) || []
                              ).map((event, idx) => (
                                <li
                                  key={`${selectedCalendarDate}-${event.label}-${idx}`}
                                >
                                  <Card size="small" className="bg-transparent shadow-none border-border/50">
                                    <CardContent className="space-y-2 p-2.5">
                                      <p className="text-[13px] font-medium text-[#2f2f2f]">
                                        {event.label}
                                      </p>
                                      {event.timeLabel ? (
                                        <div className="flex items-center gap-1 text-[11px] text-[#666]">
                                          <Clock className="h-3 w-3" />
                                          <span>{event.timeLabel}</span>
                                        </div>
                                      ) : null}
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-medium text-[#666]">
                                          {event.isCompleted ? "Completed" : "Not completed"}
                                        </span>
                                        <Badge
                                          variant="secondary"
                                          className={`h-5 px-1.5 text-[9px] uppercase ${getEventKindBadgeClass(event.kind)}`}
                                        >
                                          {event.badgeLabel || "task"}
                                        </Badge>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-[#8a8a8a] mt-3">
                              No scheduled events on this day.
                            </p>
                          )
                        ) : (
                          <p className="text-xs text-[#8a8a8a] mt-3">
                            Pick a date to view events.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>

        <aside className="no-scrollbar min-h-0 space-y-5 overflow-x-hidden overflow-y-auto lg:pl-5">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#1f1f1f]">
                  Resources
                </h3>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  type="button"
                  onClick={() => setShowAddUrl((v) => !v)}
                  disabled={isAddingUrl}
                  title="Add resource URL"
                >
                  <Plus />
                </Button>
              </div>
              <div className="space-y-4">
                {localResources.length > 0 && (
                  <ul className="space-y-3">
                    {visibleResources.map((url: string, i: number) => (
                      <li
                        key={`${url}-${i}`}
                        className="flex items-center gap-2"
                      >
                        <ResourcePreviewHoverCard
                          url={url}
                          previewData={resourceLinkPreviews[url]}
                          previewLoading={Boolean(resourceLinkPreviewLoading[url])}
                          previewBlocked={resourcePreviewState[url] === "blocked"}
                          copied={copiedResourceUrl === url}
                          onOpenChange={(open) => {
                            if (open) void ensureLinkPreview(url);
                          }}
                          onPreviewBlocked={() =>
                            setResourcePreviewState((prev) => ({
                              ...prev,
                              [url]: "blocked",
                            }))
                          }
                          onCopy={() => {
                            void handleCopyResourceUrl(url);
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          type="button"
                          onClick={() => handleRemoveUrl(i)}
                          disabled={removingUrlIndex === i || isAddingUrl}
                          title="Remove resource URL"
                          aria-label="Remove resource URL"
                        >
                          {removingUrlIndex === i ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Minus />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                {hasMoreResources && (
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowAllResources((v) => !v)}
                  >
                    {showAllResources ? "Less" : "More"}
                  </Button>
                )}
                {course.crossListedCourses && (
                  <div>
                    <span className="text-xs font-medium text-[#777] block mb-2">
                      Cross-Listed
                    </span>
                    <p className="text-sm text-[#555] leading-relaxed">
                      {course.crossListedCourses}
                    </p>
                  </div>
                )}
                {variantCodeLinks.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-[#777] block mb-2">
                      {variantLabel}
                    </span>
                    <ul className="space-y-2">
                      {variantCodeLinks.map((item) => (
                        <li key={item.id} className="text-sm text-[#555]">
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#335b9a] hover:underline"
                            >
                              {item.id}
                            </a>
                          ) : (
                            <span>{item.id}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {localResources.length === 0 &&
                  !course.crossListedCourses &&
                  variantCodeLinks.length === 0 &&
                  !showAddUrl && (
                    <p className="text-sm text-[#9a9a9a]">No resources yet.</p>
                  )}
                {showAddUrl && (
                  <div className="space-y-2">
                    <Textarea
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowAddUrl(false);
                          setNewUrl("");
                        }
                      }}
                      placeholder={"https://...\nhttps://... (one per line)"}
                      rows={4}
                      autoFocus
                    />

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => {
                          setShowAddUrl(false);
                          setNewUrl("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleAddUrl}
                        disabled={!newUrl.trim() || isAddingUrl}
                      >
                        {isAddingUrl && <Loader2 className="animate-spin" />}
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#1f1f1f] mb-4">
                Course Facts
              </h3>
              <dl className="space-y-4 text-sm">
                {course.details?.internalId && (
                  <div className="flex justify-between py-1">
                    <dt className="text-[#666]">ID</dt>
                    <dd className="font-mono text-[#999]">
                      {course.details.internalId}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <dt className="text-[#666]">Credits</dt>
                  <dd className="font-medium text-[#222]">
                    {course.credit ? `${course.credit} ECTS` : "-"}
                  </dd>
                </div>
                <div className="flex justify-between py-1 overflow-visible relative">
                  <dt className="text-[#666] shrink-0">
                    <HoverCard openDelay={100} closeDelay={80}>
                      <HoverCardTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 cursor-help"
                          aria-label={`${unitInfo.label} help`}
                        >
                          <span>{unitInfo.label}</span>
                          <Info className="w-3.5 h-3.5 text-[#999]" />
                        </button>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64 text-[11px] leading-relaxed text-[#555]">
                        {unitInfo.help}
                      </HoverCardContent>
                    </HoverCard>
                  </dt>
                  <dd className="font-medium text-[#222] text-right pl-4 break-words">
                    {course.units || "-"}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-[#666] shrink-0">Workload</dt>
                  <dd className="font-medium text-[#222] text-right pl-4 break-words">
                    {estimatedWorkload}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-[#666] shrink-0">Level</dt>
                  <dd className="font-medium text-[#222] capitalize text-right pl-4 break-words">
                    {course.level || "-"}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-[#666] shrink-0">Department</dt>
                  <dd className="font-medium text-[#222] text-right pl-4 break-words">
                    {course.department || "-"}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-[#666] shrink-0">Subdomain</dt>
                  <dd className="font-medium text-[#222] text-right pl-4 break-words">
                    {course.subdomain || "-"}
                  </dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-[#666] shrink-0">Category</dt>
                  <dd className="font-medium text-[#222] text-right pl-4 break-words">
                    {categoryLabel || "-"}
                  </dd>
                </div>
                {(course.prerequisites || course.details?.prerequisites) && (
                  <div className="flex flex-col py-1 gap-1">
                    <dt className="text-[#666] shrink-0">Prerequisites</dt>
                    <dd className="text-[13px] text-[#444] leading-relaxed">
                      {course.prerequisites || course.details?.prerequisites}
                    </dd>
                  </div>
                )}
                <div className="flex flex-col py-1 gap-2">
                  <dt className="text-[#666]">Available Terms</dt>
                  <dd className="font-medium text-[#222] flex flex-wrap gap-1.5 justify-end">
                    {course.semesters.length > 0 ? (
                      course.semesters.map((s, idx) => (
                        <Badge
                          key={idx}
                          className="whitespace-nowrap bg-white px-2 py-0.5 text-[11px]"
                        >
                          {s}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-[#999] font-normal italic">
                        Historical
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
