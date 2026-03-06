"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Dumbbell, ExternalLink, Loader2, NotebookPen, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OverviewRoutineItem } from "@/lib/overview-routine";

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

    const previous = item.isDone;
    setPendingKeys((current) => ({ ...current, [item.key]: true }));
    setItems((current) =>
      current.map((entry) =>
        entry.key === item.key
          ? {
              ...entry,
              isDone: !entry.isDone,
              statusLabel:
                entry.sourceType === "workout"
                  ? !entry.isDone
                    ? "Attended"
                    : "Mark attended"
                  : !entry.isDone
                    ? "Completed"
                    : "Mark complete",
            }
          : entry
      )
    );

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

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to update routine state");
      }
    } catch {
      setItems((current) =>
        current.map((entry) =>
          entry.key === item.key
            ? {
                ...entry,
                isDone: previous,
                statusLabel:
                  entry.sourceType === "workout"
                    ? previous
                      ? "Attended"
                      : "Mark attended"
                    : previous
                      ? "Completed"
                      : "Mark complete",
              }
            : entry
        )
      );
    } finally {
      setPendingKeys((current) => {
        const next = { ...current };
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
        return (
          <div
            key={item.key}
            className="grid gap-3 border-b border-border/50 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center"
          >
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">{item.timeLabel}</p>
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
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                  <span className="truncate max-w-[240px]">{item.meta}</span>
                  {item.location && (
                    <>
                      <span className="text-muted-foreground/30 text-[8px] tracking-normal">·</span>
                      <span className="truncate max-w-[120px]">{item.location}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-self-end">
                {item.action ? (
                  <Button
                    variant={item.isDone ? "secondary" : "outline"}
                    size="sm"
                    type="button"
                    disabled={isPending}
                    onClick={() => void handleAction(item)}
                    className="h-8"
                  >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : item.sourceType === "workout" ? <Dumbbell className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    {item.statusLabel}
                  </Button>
                ) : item.href ? (
                  <Button size="sm" variant="ghost" asChild className="h-8">
                    <a href={item.href} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}>
                      <NotebookPen className="mr-2 h-4 w-4" />
                      Open
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
                    <NotebookPen className="h-4 w-4" />
                    Due today
                  </div>
                )}
                {item.sourceType === "assignment" ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : null}
              </div>
          </div>
        );
      })}
    </div>
  );
}
