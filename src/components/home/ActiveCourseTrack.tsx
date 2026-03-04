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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  CalendarCheck,
  CalendarPlus,
  Clock,
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

  return (
    <div className="rounded-lg border">
      <AddPlanModal
        isOpen={showAddPlanModal}
        onClose={() => setShowAddPlanModal(false)}
        onSuccess={(saved) => setLocalPlan(saved)}
        course={{ id: course.id, title: course.title }}
        existingPlan={localPlan} />
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
          className="cursor-pointer space-y-1 p-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap">
              <UniversityIcon
                name={course.university}
                size={32}
                className="shrink-0 bg-gray-50 border border-gray-100" />

              <div className="min-w-0">
                <span className="text-[11px] text-[#777]">{course.university} · {course.courseCode}</span>
                <h3 className="truncate text-base font-semibold tracking-tight text-[#1f1f1f]">
                  <Link href={detailHref}>{course.title}</Link>
                </h3>
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              {course.aiPlanSummary?.days ?
              <Badge variant="secondary">
                  {course.aiPlanSummary.nextDate ?
                `AI Plan ${course.aiPlanSummary.nextDate}` :
                "AI Plan Ready"}
                  {course.aiPlanSummary.nextFocus ?
                ` · ${course.aiPlanSummary.nextFocus}` :
                ""}
                </Badge> :
              <Badge variant="secondary">AI Plan pending sync</Badge>}
              {localPlan ?
              <>
                  <Badge>{localPlan.days_of_week.map((d) => weekdaysShort[d]).join("/")}</Badge>
                  <span className="inline-flex items-center gap-0.5 text-[11px] text-[#555] leading-none">
                    <Clock className="h-3.5 w-3.5" />
                    {localPlan.start_time.slice(0, 5)} - {localPlan.end_time.slice(0, 5)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
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
                </> :
              <p className="text-[11px] italic text-muted-foreground leading-none">No schedule defined</p>}
            </div>
          </div>

          <div className="flex items-center gap-[2px]">
            {Array.from({ length: focusSegments }).map((_, index) =>
            <span
              key={index}
              className={`h-1 flex-1 transition-colors ${
              index < activeFocusSegments ?
              "bg-black" :
              "bg-[#ececec]"}`
              } />

            )}
          </div>
        </div>
        <div
          data-no-card-nav="true"
          className="flex items-center gap-2 border-t p-1 md:border-t-0">
          <Separator orientation="vertical" className="h-5" />
          <p className="text-sm font-semibold tracking-tight text-[#1f1f1f] w-8">{progress}%</p>
          <Separator orientation="vertical" className="h-5" />
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
                  <DropdownMenuRadioGroup
                    value={aiSourceMode}
                    onValueChange={(next) => {
                      const nextMode = next as AiSyncSourceMode;
                      setAiSourceMode(nextMode);
                      try {
                        window.localStorage.setItem(
                          AI_SYNC_MODE_STORAGE_KEY,
                          nextMode
                        );
                      } catch {



                        // Ignore localStorage errors.
                      }}}>
                    
                    <DropdownMenuRadioItem value="auto">
                      Auto
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="existing">
                      Existing
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="fresh">
                      Fresh
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddPlanModal(true)}>
              {localPlan ? <CalendarCheck /> : <CalendarPlus />}
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>);

}
