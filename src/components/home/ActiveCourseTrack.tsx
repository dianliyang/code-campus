"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Course } from "@/types";
import Link from "next/link";
import UniversityIcon from "@/components/common/UniversityIcon";
import { Dictionary } from "@/lib/dictionary";
import AddPlanModal from "./AddPlanModal";
import { useAppToast } from "@/components/common/AppToastProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from "@/components/ui/hover-card";
import {
  ExternalLink,
  CalendarCheck,
  CalendarPlus,
  Check,
  Loader2,
  Sparkles } from
"lucide-react";

type AiSyncSourceMode = "auto" | "existing" | "fresh";
const AI_SYNC_MODE_STORAGE_KEY = "cc:ai-sync-source-mode";

interface ActiveCourseTrackProps {
  course: Course;
  initialProgress: number;
  plan?: {
    id: number;
    start_date: string;
    end_date: string;
    days_of_week: number[];
    start_time: string;
    end_time: string;
    location: string;
  } | null;
  onUpdate?: () => void;
  dict: Dictionary["dashboard"]["roadmap"];
}

export default function ActiveCourseTrack({
  course,
  initialProgress,
  plan
}: Omit<ActiveCourseTrackProps, "dict">) {
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [isAiUpdating, setIsAiUpdating] = useState(false);
  const [aiSourceMode, setAiSourceMode] = useState<AiSyncSourceMode>("auto");
  const { showToast } = useAppToast();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AI_SYNC_MODE_STORAGE_KEY);
      if (saved === "fresh" || saved === "existing" || saved === "auto") {
        setAiSourceMode(saved);
      }
    } catch {
      // Ignore
    }
  }, []);

  const detailHref = `/courses/${course.id}`;
  const progress = useMemo(() => {
    if (!localPlan?.start_date || !localPlan?.end_date)
      return Math.max(0, Math.min(100, Math.round(initialProgress || 0)));
    const start = new Date(`${localPlan.start_date}T00:00:00`);
    const end = new Date(`${localPlan.end_date}T23:59:59`);
    const now = new Date();
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    if (now <= start) return 0;
    if (now >= end) return 100;
    const total = Math.max(1, end.getTime() - start.getTime());
    const done = Math.max(0, now.getTime() - start.getTime());
    return Math.max(0, Math.min(100, Math.round(done / total * 100)));
  }, [initialProgress, localPlan]);

  const handleAiSync = async () => {
    setIsAiUpdating(true);
    try {
      const res = await fetch("/api/ai/course-intel/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, sourceMode: aiSourceMode })
      });
      if (res.ok || res.status === 202) {
        showToast({
          type: "success",
          message: `AI sync started in background (${aiSourceMode}).`
        });
        window.dispatchEvent(new Event("course-intel-job-started"));
      } else {
        let message = "AI sync failed.";
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch { /* ignore */ }
        showToast({ type: "error", message });
      }
    } catch {
      showToast({ type: "error", message: "Network error while running AI sync." });
    } finally {
      setIsAiUpdating(false);
    }
  };

  const weekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formatTimeLabel = (time?: string) => {
    if (!time) return "Not set";
    const [hoursText = "0", minutesText = "00"] = time.split(":");
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
    const suffix = hours >= 12 ? "PM" : "AM";
    const twelveHour = hours % 12 || 12;
    return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${suffix}`;
  };
  const scheduleSummary = useMemo(() => {
    if (!localPlan) return null;
    const dayIndexes = [...(localPlan.days_of_week || [])].sort((a, b) => a - b);
    const dayText = dayIndexes.map((idx) => weekdaysShort[idx]).join(", ");
    return {
      dayText,
      startTimeLabel: formatTimeLabel(localPlan.start_time),
      endTimeLabel: formatTimeLabel(localPlan.end_time)
    };
  }, [localPlan]);
  const planMeta = useMemo(() => {
    if (!localPlan?.start_date || !localPlan?.end_date) return null;

    try {
      const startDate = parseISO(localPlan.start_date);
      const endDate = parseISO(localPlan.end_date);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

      const inclusiveDays = Math.max(1, differenceInCalendarDays(endDate, startDate) + 1);
      return {
        startLabel: format(startDate, "MMM d, yyyy"),
        endLabel: format(endDate, "MMM d, yyyy"),
        totalLabel: String(inclusiveDays),
        totalSuffix: inclusiveDays === 1 ? "day" : "days"
      };
    } catch {
      return null;
    }
  }, [localPlan]);

  const roadmapSubdomain = course.subdomain || course.fields?.[0] || "";
  const primarySemester = course.semesters?.[0] || "";
  const creditValue =
    typeof course.credit === "number" && Number.isFinite(course.credit)
      ? String(course.credit)
      : typeof course.units === "number" && Number.isFinite(course.units)
        ? String(course.units)
        : null;
  const creditLabel = creditValue ? `${creditValue} credits` : "No credit";
  const progressSegments = 10;
  const filledSegments = Math.max(0, Math.min(progressSegments, Math.round(progress / (100 / progressSegments))));

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-white text-[#1f1f1f] shadow-sm">
      <CardHeader className="p-3 pb-1.5">
        <div className="space-y-2">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
            <UniversityIcon
              name={course.university}
              size={38}
              className="shrink-0"
            />
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="font-semibold">{course.university}</span>
                <span className="font-semibold text-stone-400">•</span>
                <span className="font-semibold">{course.courseCode}</span>
                {course.aiPlanSummary?.days ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="AI Ready" />
                ) : null}
                {roadmapSubdomain ? (
                  <Badge variant="secondary" className="h-4 text-[9px] uppercase px-1.5 font-bold shrink-0">
                    {roadmapSubdomain}
                  </Badge>
                ) : null}
              </div>
              {primarySemester ? (
                <div className="mt-1 text-[11px] font-medium text-stone-500">
                  {primarySemester}
                </div>
              ) : null}
            </div>
            <ButtonGroup className="shrink-0 justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon-sm" className="h-7 w-7 shadow-none" type="button">
                    {isAiUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Sync Mode</DropdownMenuLabel>
                    {(["auto", "existing", "fresh"] as AiSyncSourceMode[]).map((mode) => (
                      <DropdownMenuItem
                        key={mode}
                        onClick={() => {
                          setAiSourceMode(mode);
                          try { window.localStorage.setItem(AI_SYNC_MODE_STORAGE_KEY, mode); } catch { /* ignore */ }
                        }}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        {aiSourceMode === mode ? (
                          <DropdownMenuShortcut><Check className="h-3 w-3" /></DropdownMenuShortcut>
                        ) : null}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleAiSync} disabled={isAiUpdating}>
                    {isAiUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                    Run Intelligence
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover open={showAddPlanModal} onOpenChange={setShowAddPlanModal}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon-sm" className="h-7 w-7 shadow-none" type="button">
                    {localPlan ? <CalendarCheck className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0 border-none shadow-xl">
                  <AddPlanModal
                    mode="inline"
                    isOpen={showAddPlanModal}
                    onClose={() => setShowAddPlanModal(false)}
                    onSuccess={(saved) => setLocalPlan(saved)}
                    course={{ id: course.id, title: course.title }}
                    existingPlan={localPlan}
                  />
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="icon-sm" className="h-7 w-7 shadow-none" asChild>
                <Link href={detailHref} title="Open course">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </ButtonGroup>
          </div>
          <CardTitle className="text-lg font-semibold tracking-tight leading-snug line-clamp-2">
            <Link href={detailHref} className="hover:text-black transition-colors">{course.title}</Link>
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-end px-3 py-1 gap-1.5">
        <div className="space-y-1">
          <div className="flex items-end justify-between">
            <span className="text-muted-foreground text-[9px] uppercase font-bold tracking-widest">Progress</span>
            <span className="text-[#1f1f1f] text-xs font-extrabold">{progress}%</span>
          </div>
          <div className="grid grid-cols-10 gap-1" aria-label={`Progress ${progress}%`}>
            {Array.from({ length: progressSegments }).map((_, idx) => (
              <span
                key={`progress-segment-${idx}`}
                className={`h-1.5 rounded-[2px] transition-colors ${
                  idx < filledSegments ? "bg-[#1f1f1f]" : "bg-stone-200"
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-stone-50 bg-gray-50/20 px-3 py-1.5">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 text-[10px]">
          {localPlan && planMeta ? (
            <>
              <div className="min-w-0 space-y-1.5 text-stone-700" data-testid="roadmap-plan-leading">
                <div className="min-w-0">{`${scheduleSummary?.startTimeLabel || "Not set"} - ${scheduleSummary?.endTimeLabel || "Not set"}`}</div>
                <div className="min-w-0">{`${planMeta.startLabel} - ${planMeta.endLabel}`}</div>
              </div>
              <div className="space-y-2 text-right text-stone-700" data-testid="roadmap-plan-trailing">
                <div className="flex justify-end">
                  <span className="shrink-0 flex items-center gap-1.25" aria-label="Study days">
                    <HoverCard openDelay={60} closeDelay={80}>
                      <HoverCardTrigger asChild>
                        <span className="flex items-center gap-1.25">
                          {Array.from({ length: 7 }).map((_, idx) => (
                            <span
                              key={`study-day-dot-${idx}`}
                              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                localPlan.days_of_week.includes(idx) ? "bg-[#1f1f1f]" : "bg-stone-200"
                              }`}
                            />
                          ))}
                        </span>
                      </HoverCardTrigger>
                      {scheduleSummary ? (
                        <HoverCardContent className="w-auto p-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            {scheduleSummary.dayText || "No days selected"}
                          </p>
                        </HoverCardContent>
                      ) : null}
                    </HoverCard>
                  </span>
                </div>
                <div className="block shrink-0 leading-none" data-testid="roadmap-plan-credits">
                  {creditValue ? (
                    <>
                      <strong>{creditValue}</strong> credits
                    </>
                  ) : (
                    "No credit"
                  )}
                </div>
                <div className="block shrink-0 leading-none" data-testid="roadmap-plan-days">
                  <strong>{planMeta.totalLabel}</strong> {planMeta.totalSuffix}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 space-y-1.5 text-stone-400" data-testid="roadmap-plan-leading">
                <div className="min-w-0">Not set - Not set</div>
                <div className="min-w-0">Not set - Not set</div>
              </div>
              <div className="space-y-2 text-right text-stone-400" data-testid="roadmap-plan-trailing">
                <div className="flex justify-end">
                  <span className="shrink-0 flex items-center gap-1.25" aria-label="Study days">
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <span key={idx} className="h-1.5 w-1.5 rounded-full bg-stone-200" />
                    ))}
                  </span>
                </div>
                <div className="shrink-0 leading-none" data-testid="roadmap-plan-credits">
                  {creditValue ? (
                    <>
                      <strong>{creditValue}</strong> credits
                    </>
                  ) : (
                    "No credit"
                  )}
                </div>
                <div className="shrink-0 leading-none" data-testid="roadmap-plan-days">
                  <strong>0</strong> days
                </div>
              </div>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
