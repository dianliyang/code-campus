"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Dumbbell, ExternalLink, Loader2, NotebookPen, Coffee, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OverviewRoutineItem } from "@/lib/overview-routine";
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
        prev.map((it) => (it.key === item.key ? { ...it, isDone: !it.isDone } : it))
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
    <div className="space-y-1">
      {sortedItems.map((item) => {
        const isPending = Boolean(pendingKeys[item.key]);
        const content = (
          <div
            className="grid gap-3 border-b border-border/50 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center group/item"
          >
            <div className="flex flex-col items-start gap-1 sm:items-center sm:text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">{item.timeLabel}</p>
              <Badge variant="outline" className="rounded-full px-1.5 text-[9px] uppercase tracking-[0.18em]">
                {item.kind}
              </Badge>
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className={`text-sm font-medium tracking-tight ${item.isDone ? "text-muted-foreground line-through" : "text-[#0f172a]"}`}>
                  {item.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-muted-foreground/70">
                <span className="truncate max-w-[240px] uppercase">{item.meta}</span>
                {item.location && (
                  <>
                    <span className="text-muted-foreground/30 text-[8px] tracking-normal">·</span>
                    <span className="truncate max-w-[120px]">{item.location}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:justify-self-end">
              {item.courseId && (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover/item:text-muted-foreground/40 transition-all translate-x-[-4px] group-hover/item:translate-x-0" />
              )}
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
                  className="h-7 px-2 text-[11px] uppercase font-bold tracking-wider"
                >
                  {isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  {item.statusLabel}
                </Button>
              ) : item.sourceType === "assignment" ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : null}
            </div>
          </div>
        );

        if (item.courseId) {
          return (
            <Link key={item.key} href={`/courses/${item.courseId}`} className="block">
              {content}
            </Link>
          );
        }

        return <div key={item.key}>{content}</div>;
      })}
    </div>
  );
}
