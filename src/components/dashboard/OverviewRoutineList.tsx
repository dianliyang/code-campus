"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OverviewRoutineItem } from "@/lib/overview-routine";
import { getRoutineChildContainerClassName } from "@/lib/routine-layout";
import { buildTodayRoutineGroups } from "@/lib/week-calendar";
import Link from "next/link";

export default function OverviewRoutineList({
  initialItems,
}: {
  initialItems: OverviewRoutineItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        return a.startsAtSort.localeCompare(b.startsAtSort) || a.title.localeCompare(b.title);
      }),
    [items]
  );

  const groupedItems = useMemo(
    () =>
      buildTodayRoutineGroups(
        sortedItems.map((item) => ({
          ...item,
          date: item.action?.date || "",
          planId: item.action?.type === "toggle_complete" ? item.action.planId ?? null : null,
          scheduleId: item.action?.type === "toggle_complete" ? item.action.scheduleId ?? null : null,
          assignmentId: item.action?.type === "toggle_complete" ? item.action.assignmentId ?? null : null,
          workoutId: item.action?.type === "toggle_attended" ? item.action.workoutId : null,
          startTime: `${item.startsAtSort}:00`,
        }))
      ),
    [sortedItems]
  );

  const renderItem = (item: OverviewRoutineItem, child = false) => {
    const isPending = Boolean(pendingKeys[item.key]);
    const content = (
      <div
        className={`grid gap-3 border-b border-border/50 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[100px_minmax(0,1fr)_auto] sm:items-center group/item ${child ? "sm:grid-cols-[72px_minmax(0,1fr)_auto]" : ""}`}
      >
        <div className="flex flex-col items-start gap-1">
          <p className={`font-medium uppercase tracking-wider text-muted-foreground leading-none ${child ? "text-[9px]" : "text-[10px]"}`}>{item.timeLabel}</p>
          <Badge variant="outline" className={`rounded-full px-1.5 uppercase tracking-[0.12em] border-muted-foreground/30 text-muted-foreground font-medium ${child ? "text-[8px]" : "text-[9px]"}`}>
            {item.kind}
          </Badge>
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-x-2">
            <p className={`${child ? "text-[13px]" : "text-sm"} font-medium tracking-tight leading-tight truncate ${item.isDone ? "text-muted-foreground line-through" : "text-[#0f172a]"}`}>
              {item.title}
            </p>
          </div>
          {(!child && item.meta) || item.location ? (
            <div className={`flex items-center gap-x-2 font-medium text-muted-foreground/60 leading-tight ${child ? "text-[10px]" : "text-[11px]"}`}>
              {!child && item.meta ? <span className="truncate">{item.meta}</span> : null}
              {item.location ? (
                <>
                  {!child && item.meta ? (
                    <span className="text-muted-foreground/30 text-[8px] tracking-normal shrink-0">·</span>
                  ) : null}
                  <span className="truncate">{item.location}</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3 sm:justify-self-end">
          {item.action ? (
            <Button
              variant={item.isDone ? "secondary" : "outline"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleAction(item);
              }}
              disabled={isPending}
              className={`px-2 uppercase font-bold tracking-wider ${child ? "h-6 text-[9px]" : "h-7 text-[10px]"}`}
            >
              {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {item.statusLabel}
            </Button>
          ) : null}
          {item.courseId ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
          ) : null}
        </div>
      </div>
    );

    if (item.courseId) {
      return (
        <Link key={item.key} href={`/courses/${item.courseId}`} className={`block ${child ? "py-0.5" : "py-1"} hover:bg-muted/5 transition-colors`}>
          {content}
        </Link>
      );
    }

    return <div key={item.key} className={child ? "py-0.5" : "py-1"}>{content}</div>;
  };

  const handleAction = async (item: OverviewRoutineItem) => {
    if (!item.action || pendingKeys[item.key]) return;

    setPendingKeys((prev) => ({ ...prev, [item.key]: true }));
    try {
      const endpoint =
        item.action.type === "toggle_complete" ? "/api/schedule" : "/api/workouts/attendance";
      const body =
        item.action.type === "toggle_complete"
          ? {
              action: "toggle_complete",
              planId: item.action.planId,
              scheduleId: item.action.scheduleId,
              assignmentId: item.action.assignmentId,
              date: item.action.date,
            }
          : {
              workoutId: item.action.workoutId,
              date: item.action.date,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Action failed");

      // Optimistic update
      setItems((prev) =>
        prev.map((it) => {
          if (it.key === item.key) {
            const nextDone = !it.isDone;
            let nextStatusLabel = it.statusLabel;
            
            if (it.sourceType === "workout") {
              nextStatusLabel = nextDone ? "Attended" : "Mark attended";
            } else {
              nextStatusLabel = nextDone ? "Completed" : "Mark complete";
            }

            return { ...it, isDone: nextDone, statusLabel: nextStatusLabel };
          }
          return it;
        })
      );
    } catch (error) {
      console.error(error);
    } finally {
      setPendingKeys((prev) => {
        const next = { ...prev };
        delete next[item.key];
        return next;
      });
    }
  };

  if (sortedItems.length === 0) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border">
          <Coffee className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1 text-muted-foreground">
          <p className="text-sm font-medium text-foreground">Routine is clear today.</p>
          <p className="text-sm">No scheduled tasks, workouts, or due items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groupedItems.map(({ parent, children }) => (
        <div key={parent.key} className="space-y-1">
          {renderItem(parent)}
          {children.length > 0 ? (
            <div className={getRoutineChildContainerClassName()}>
              {children.map((child) => renderItem(child, true))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
