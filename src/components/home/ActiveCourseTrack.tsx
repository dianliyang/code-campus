"use client";

import { useEffect, useMemo, useState } from "react";
import { Course } from "@/types";
import { useRouter } from "next/navigation";
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
import {
  Item,
  ItemActions,
  ItemContent
} from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  CalendarCheck,
  CalendarPlus,
  Clock,
  Check,
  Loader2,
  Sparkles,
  ChevronDown } from
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
  const router = useRouter();
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [localPlan, setLocalPlan] = useState(plan);
  const [isAiUpdating, setIsAiUpdating] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [aiSourceMode, setAiSourceMode] = useState<AiSyncSourceMode>("auto");
  const { showToast } = useAppToast();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(AI_SYNC_MODE_STORAGE_KEY);
      if (saved === "fresh" || saved === "existing" || saved === "auto") {
        setAiSourceMode(saved);
      }
    } catch {



      // Ignore localStorage errors.
    }}, []);const detailHref = `/courses/${course.id}`;
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

  const handleCardNavigation = () => {
    router.push(detailHref);
  };

  const handleAiSync = async () => {
    setIsAiUpdating(true);
    setAiStatus("idle");
    try {
      const res = await fetch("/api/ai/course-intel/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, sourceMode: aiSourceMode })
      });
      if (res.ok || res.status === 202) {
        setAiStatus("success");
        showToast({
          type: "success",
          message: `AI sync started in background (${aiSourceMode}).`
        });
        window.dispatchEvent(new Event("course-intel-job-started"));
      } else {
        setAiStatus("error");
        let message = "AI sync failed.";
        try {
          const payload = await res.json();
          const candidate =
          typeof payload?.error === "string" ? payload.error.trim() : "";
          if (candidate) message = candidate;
        } catch {



          // Ignore parse error and use default message.
        }showToast({ type: "error", message });}} catch {
      setAiStatus("error");
      showToast({
        type: "error",
        message: "Network error while running AI sync."
      });
    } finally {
      setIsAiUpdating(false);
      setTimeout(() => setAiStatus("idle"), 3000);
    }
  };

  const weekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const focusSegments = 20;
  const activeFocusSegments = Math.round(progress / 100 * focusSegments);
  const scheduleSummary = useMemo(() => {
    if (!localPlan) return null;
    const dayIndexes = [...(localPlan.days_of_week || [])].sort((a, b) => a - b);
    const dayText = dayIndexes.map((idx) => weekdaysShort[idx]).join(", ");
    const start = new Date(`${localPlan.start_date}T00:00:00`);
    const end = new Date(`${localPlan.end_date}T00:00:00`);
    const diffMs = end.getTime() - start.getTime();
    const totalDays = Number.isNaN(diffMs) ? null : Math.max(1, Math.floor(diffMs / 86400000) + 1);
    const daysPerWeek = dayIndexes.length;
    return {
      dayText,
      daysPerWeek,
      totalDays
    };
  }, [localPlan, weekdaysShort]);

  return (
    <Item variant="outline" className="gap-0 overflow-hidden p-0">
      <ItemContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto]">
          <div
          role="link"
          tabIndex={0}
          onClick={handleCardNavigation}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCardNavigation();
            }
          }}
          className="cursor-pointer space-y-2 p-3"
        >
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <UniversityIcon
                name={course.university}
                size={32}
                className="shrink-0 bg-gray-50 border border-gray-100" />

              <div className="min-w-0">
                <span className="block truncate text-[11px] text-muted-foreground">{course.university} · {course.courseCode}</span>
                <h3 className="truncate text-base font-semibold tracking-tight">
                  <Link href={detailHref}>{course.title}</Link>
                </h3>
              </div>
            </div>
            <div className="ml-auto flex max-w-[60%] shrink-0 flex-wrap items-center justify-end gap-1.5">
              {course.aiPlanSummary?.days ?
              <Badge variant="secondary">
                  {course.aiPlanSummary.nextDate ?
                `AI Plan ${course.aiPlanSummary.nextDate}` :
                "AI Plan Ready"}
                  {course.aiPlanSummary.nextFocus ?
                ` · ${course.aiPlanSummary.nextFocus}` :
                ""}
                </Badge> :
              null}
              {localPlan ?
              <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-end gap-1">
                        <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground leading-none">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {localPlan.start_time.slice(0, 5)} - {localPlan.end_time.slice(0, 5)}
                          </span>
                          <span>
                            {new Date(localPlan.start_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric"
                          })}
                            {" "}to{" "}
                            {new Date(localPlan.end_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric"
                          })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" aria-label="Study days">
                          {Array.from({ length: 7 }).map((_, idx) =>
                          <span
                            key={`study-day-dot-${idx}`}
                            className={`h-2 w-2 rounded-full ${
                            localPlan.days_of_week.includes(idx) ? "bg-black" : "bg-muted"}`
                            } />
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    {scheduleSummary ?
                    <TooltipContent side="top" align="end">
                        <p className="text-xs">
                          {scheduleSummary.dayText || "No days"} · {scheduleSummary.daysPerWeek} day{scheduleSummary.daysPerWeek === 1 ? "" : "s"}/week
                          {scheduleSummary.totalDays ? ` · ${scheduleSummary.totalDays} days total` : ""}
                        </p>
                      </TooltipContent> :
                    null}
                  </Tooltip>
                </> :
              <p className="text-[11px] italic text-muted-foreground leading-none">No schedule defined</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1">
              {Array.from({ length: focusSegments }).map((_, index) =>
              <span
                key={index}
                className={`h-1 flex-1 transition-colors ${
                index < activeFocusSegments ?
                "bg-black" :
                "bg-muted"}`
                } />

              )}
            </div>
            <p className="w-9 text-right text-sm font-semibold tracking-tight">{progress}%</p>
          </div>
          </div>
          <ItemActions
            data-no-card-nav="true"
            className="self-start items-start p-2">
            <ButtonGroup className="ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" type="button">
                    {isAiUpdating ?
                    <Loader2 className="animate-spin" /> :

                    <Sparkles />
                    }
                    <span className="uppercase">{aiSourceMode}</span>
                    <ChevronDown />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>AI Sync Mode</DropdownMenuLabel>
                    {(["auto", "existing", "fresh"] as AiSyncSourceMode[]).map((mode) =>
                    <DropdownMenuItem
                      key={mode}
                      onClick={() => {
                        setAiSourceMode(mode);
                        try {
                          window.localStorage.setItem(
                            AI_SYNC_MODE_STORAGE_KEY,
                            mode
                          );
                        } catch {
                          // Ignore localStorage errors.
                        }
                      }}>
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      {aiSourceMode === mode ?
                      <DropdownMenuShortcut>
                          <Check className="size-4 text-foreground" />
                        </DropdownMenuShortcut> :
                      null}
                    </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleAiSync} disabled={isAiUpdating}>
                      
                      {isAiUpdating ?
                      <Loader2 className="w-3 h-3 animate-spin" /> :

                      <Sparkles className="w-3 h-3" />
                      }
                      Run AI Sync
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="sm" asChild>
                <Link
                  href={detailHref}
                  title="Open course"
                  aria-label="Open course">
                  
                  <ExternalLink />
                </Link>
              </Button>

              <Popover open={showAddPlanModal} onOpenChange={setShowAddPlanModal}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button">
                    {localPlan ? <CalendarCheck /> : <CalendarPlus />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
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
            </ButtonGroup>
          </ItemActions>
        </div>
      </ItemContent>
    </Item>);

}
