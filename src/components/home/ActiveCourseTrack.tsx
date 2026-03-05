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
    }}, []);

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
        }
        showToast({ type: "error", message });
      }
    } catch {
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
  const roadmapSubdomain = course.subdomain || course.fields?.[0] || "";

  return (
    <Card className="h-full flex flex-col overflow-hidden border-[#efefef] hover:border-[#dfdfdf] transition-all duration-200 shadow-sm hover:shadow-md">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-3">
          <UniversityIcon
            name={course.university}
            size={40}
            className="shrink-0 bg-gray-50 border border-gray-100 p-2 rounded-lg"
          />
          <div className="flex flex-col items-end gap-1.5">
            {roadmapSubdomain ? (
              <Badge variant="secondary" className="max-w-[120px] truncate text-[10px] uppercase font-bold tracking-wider px-2 py-0">
                {roadmapSubdomain}
              </Badge>
            ) : null}
            {course.aiPlanSummary?.days ? (
              <Badge variant="outline" className="text-[9px] border-emerald-100 bg-emerald-50/50 text-emerald-700 px-2 py-0">
                AI Ready
              </Badge>
            ) : null}
          </div>
        </div>

        <div 
          role="link"
          tabIndex={0}
          onClick={handleCardNavigation}
          className="cursor-pointer space-y-1 group"
        >
          <span className="block text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            {course.courseCode} · {course.university}
          </span>
          <CardTitle className="text-lg font-bold tracking-tight text-[#1f1f1f] leading-tight line-clamp-2 group-hover:text-black transition-colors">
            <Link href={detailHref}>{course.title}</Link>
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-4 pt-2 gap-6">
        {/* Schedule/Description Part */}
        <div className="space-y-3">
          {localPlan ? (
            <div className="flex items-center gap-2 text-[12px] text-stone-600 bg-stone-50 p-2 rounded-md border border-stone-100/50">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              <span className="font-medium">{localPlan.start_time.slice(0, 5)} - {localPlan.end_time.slice(0, 5)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[12px] text-stone-400 italic bg-stone-50/30 p-2 rounded-md border border-dashed border-stone-200">
              <Clock className="h-3.5 w-3.5 opacity-50" />
              <span>No schedule defined</span>
            </div>
          )}
          
          {course.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        {/* Progress Part */}
        <div className="mt-auto space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-muted-foreground text-[10px]">Completion</span>
            <span className="text-[#1f1f1f]">{progress}%</span>
          </div>
          <div className="flex items-center gap-1 h-2 w-full">
            {Array.from({ length: 15 }).map((_, index) => (
              <span
                key={index}
                className={`h-full flex-1 rounded-sm transition-all duration-300 ${
                  index < Math.round((progress / 100) * 15)
                    ? "bg-black"
                    : "bg-gray-100"
                }`}
              />
            ))}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-4 border-t border-[#f5f5f5] bg-gray-50/30">
        <div className="flex items-center justify-between gap-2 w-full">
          {localPlan ? (
            <HoverCard openDelay={60} closeDelay={80}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1.5" aria-label="Study days">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <span
                      key={`study-day-dot-${idx}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        localPlan.days_of_week.includes(idx) ? "bg-black" : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </HoverCardTrigger>
              {scheduleSummary ? (
                <HoverCardContent className="w-auto p-2">
                  <p className="text-[10px] font-medium">
                    {scheduleSummary.dayText || "No days selected"}
                  </p>
                </HoverCardContent>
              ) : null}
            </HoverCard>
          ) : (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 7 }).map((_, idx) => (
                <span key={idx} className="h-2 w-2 rounded-full bg-gray-100" />
              ))}
            </div>
          )}

          <ButtonGroup>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" className="h-8 w-8 rounded-md" type="button">
                  {isAiUpdating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1.5">
                    Sync Mode: {aiSourceMode}
                  </DropdownMenuLabel>
                  {(["auto", "existing", "fresh"] as AiSyncSourceMode[]).map((mode) => (
                    <DropdownMenuItem
                      key={mode}
                      className="text-xs"
                      onClick={() => {
                        setAiSourceMode(mode);
                        try {
                          window.localStorage.setItem(AI_SYNC_MODE_STORAGE_KEY, mode);
                        } catch {}
                      }}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      {aiSourceMode === mode ? (
                        <DropdownMenuShortcut>
                          <Check className="h-3 w-3" />
                        </DropdownMenuShortcut>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAiSync} disabled={isAiUpdating} className="text-xs">
                  {isAiUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-2 text-amber-500 fill-amber-500" />
                  )}
                  Run Intelligence Sync
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover open={showAddPlanModal} onOpenChange={setShowAddPlanModal}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon-sm" className="h-8 w-8 rounded-md" type="button">
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

            <Button variant="outline" size="icon-sm" className="h-8 w-8 rounded-md" asChild>
              <Link href={detailHref} title="Open course" aria-label="Open course">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </ButtonGroup>
        </div>
      </CardFooter>
    </Card>
  );
}
