"use client";

import { Orbit, TrendingUp } from "lucide-react";

type LearningField = {
  name: string;
  count: number;
};

type LearningProfileChartProps = {
  data: LearningField[];
  unitLabel: string;
  emptyText: string;
};

export default function LearningProfileChart({
  data,
  unitLabel,
}: LearningProfileChartProps) {
  const items = data
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div className="px-5 py-12">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border">
            <Orbit className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-foreground">
            Learning map is still blank
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Once your enrolled courses accumulate topic and field metadata, your study domains will
            appear here automatically.
          </p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...items.map((item) => item.count));
  const dominant = items[0];

  return (
    <div
      className="space-y-5 px-1"
      data-testid="learning-profile-chart"
    >
      <div
        className="grid gap-3 px-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,auto)] lg:items-end"
        data-testid="learning-profile-summary"
      >
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Total Learning Units
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <p
              className="text-4xl font-semibold leading-none tracking-[-0.04em] text-foreground"
              data-testid="learning-profile-total"
            >
              {total}
            </p>
            <p className="pb-1 text-sm text-muted-foreground">{unitLabel}</p>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-muted/30 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Dominant field
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{dominant.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.round((dominant.count / total) * 100)}% of current learning volume
              </p>
            </div>
            <div className="rounded-full bg-background p-2 text-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const pct = Math.round((item.count / total) * 100);
          const width = Math.max(8, Math.round((item.count / maxCount) * 100));
          const fillClass =
            idx === 0 ? "bg-foreground" : idx === 1 ? "bg-foreground/60" : "bg-border";
          return (
            <div
              key={`field-${item.name}`}
              className="space-y-2"
              data-testid="learning-profile-row"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{pct}% share</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  {item.count} {unitLabel}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${fillClass}`}
                  style={{
                    width: `${width}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
