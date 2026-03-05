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
  const scheduleSummary = useMemo(() => {
    if (!localPlan) return null;
    const dayIndexes = [...(localPlan.days_of_week || [])].sort((a, b) => a - b);
    const dayText = dayIndexes.map((idx) => weekdaysShort[idx]).join(", ");
    return { dayText };
  }, [localPlan]);

  const roadmapSubdomain = course.subdomain || course.fields?.[0] || "";

  return (
    <Card className="h-full flex flex-col border-[#efefef] hover:border-[#dfdfdf] transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden bg-white text-[#1f1f1f]">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <UniversityIcon
            name={course.university}
            size={42}
            className="shrink-0 bg-white border border-stone-100 p-2 rounded-lg shadow-sm"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                {course.courseCode}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {course.aiPlanSummary?.days ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="AI Ready" />
                ) : null}
                {roadmapSubdomain && (
                  <Badge variant="secondary" className="h-4 text-[9px] uppercase px-1.5 font-bold shrink-0">
                    {roadmapSubdomain}
                  </Badge>
                )}
              </div>
            </div>
            <CardTitle className="text-base font-bold tracking-tight leading-tight line-clamp-2">
              <Link href={detailHref} className="hover:text-black transition-colors">{course.title}</Link>
            </CardTitle>
            <div className="text-[11px] text-muted-foreground font-medium">
              {course.university}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 p-4 pt-0">
        <div className="mt-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-muted-foreground text-[10px]">Progress</span>
            <span className="text-[#1f1f1f] text-[10px] font-bold">{progress}%</span>
          </div>
          <div className="flex items-center gap-1 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1f1f1f] rounded-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-stone-100 bg-gray-50/30 flex items-center justify-between gap-2 py-2 px-4 mt-auto">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          {localPlan ? (
            <HoverCard openDelay={60} closeDelay={80}>
              <HoverCardTrigger asChild>
                <div className="flex items-center gap-1.5 shrink-0" aria-label="Study days">
                  {Array.from({ length: 7 }).map((_, idx) => (
                    <span
                      key={`study-day-dot-${idx}`}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        localPlan.days_of_week.includes(idx) ? "bg-[#1f1f1f]" : "bg-stone-200"
                      }`}
                    />
                  ))}
                </div>
              </HoverCardTrigger>
              {scheduleSummary && (
                <HoverCardContent className="w-auto p-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-600">
                    {scheduleSummary.dayText || "No days selected"}
                  </p>
                </HoverCardContent>
              )}
            </HoverCard>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {Array.from({ length: 7 }).map((_, idx) => (
                <span key={idx} className="h-2 w-2 rounded-full bg-stone-200" />
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 min-w-0">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="font-semibold uppercase truncate">
              {localPlan ? `${localPlan.start_time.slice(0, 5)} - ${localPlan.end_time.slice(0, 5)}` : "No schedule"}
            </span>
          </div>
        </div>

        <ButtonGroup className="shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" className="h-7 w-7 rounded-md border-stone-200 hover:bg-white shadow-none" type="button">
                {isAiUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-stone-600" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md border-stone-200 shadow-xl">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1.5 tracking-wider">
                  Sync Mode: {aiSourceMode}
                </DropdownMenuLabel>
                {(["auto", "existing", "fresh"] as AiSyncSourceMode[]).map((mode) => (
                  <DropdownMenuItem
                    key={mode}
                    className="text-[11px] font-medium cursor-pointer"
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
              <DropdownMenuItem onClick={handleAiSync} disabled={isAiUpdating} className="text-[11px] font-bold cursor-pointer text-stone-900">
                {isAiUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2 text-amber-500 fill-amber-500" />}
                Run Intelligence
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={showAddPlanModal} onOpenChange={setShowAddPlanModal}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon-sm" className="h-7 w-7 rounded-md border-stone-200 hover:bg-white shadow-none" type="button">
                {localPlan ? <CalendarCheck className="h-3.5 w-3.5 text-stone-600" /> : <CalendarPlus className="h-3.5 w-3.5 text-stone-600" />}
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

          <Button variant="outline" size="icon-sm" className="h-7 w-7 rounded-md border-stone-200 hover:bg-white shadow-none" asChild>
            <Link href={detailHref} title="Open course" aria-label="Open course">
              <ExternalLink className="h-3.5 w-3.5 text-stone-600" />
            </Link>
          </Button>
        </ButtonGroup>
      </CardFooter>
    </Card>
  );
}
