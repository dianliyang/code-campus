"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Dumbbell, ExternalLink, Loader2, NotebookPen } from "lucide-react";
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

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.startsAtSort.localeCompare(b.startsAtSort) || a.title.localeCompare(b.title)),
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
      <div className="flex min-h-[240px] items-center justify-center px-6 text-center">
        <div className="space-y-2 text-muted-foreground">
          <p className="text-sm font-medium">Routine is clear today.</p>
          <p className="text-sm">No scheduled tasks, workouts, or due items.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10">
      {sortedItems.map((item) => {
        const isPending = Boolean(pendingKeys[item.key]);
        return (
          <div
            key={item.key}
            className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 border-b border-black/5 px-4 py-3 last:border-b-0"
          >
              <div className="space-y-1">
                <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">{item.timeLabel}</p>
                <Badge variant="outline" className="rounded-full px-1.5 text-[9px] uppercase tracking-[0.18em]">
                  {item.kind}
                </Badge>
              </div>
              <div className="min-w-0 space-y-1">
                <p className={`truncate text-sm font-semibold tracking-[-0.02em] ${item.isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {item.meta}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 justify-self-end">
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
