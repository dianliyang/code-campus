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

function toShortLabel(label: string): string {
  if (label.length <= 16) return label;
  return `${label.slice(0, 13)}...`;
}

export default function LearningProfileChart({
  data,
  unitLabel,
}: LearningProfileChartProps) {
  const items = data
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d9d2c7] px-5 py-8">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#e7e2d8]">
            <Orbit className="h-5 w-5 text-[#64748b]" />
          </div>
          <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-[#111827]">
            Learning map is still blank
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#64748b]">
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
      className="space-y-5 rounded-2xl border border-[#ece7dc] bg-[#fcfbf8] p-4"
      data-testid="learning-profile-chart"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#64748b]">
            Total Learning Units
          </p>
          <div className="flex items-end gap-3">
            <p
              className="text-4xl font-semibold leading-none tracking-[-0.04em] text-[#111827]"
              data-testid="learning-profile-total"
            >
              {total}
            </p>
            <p className="pb-1 text-sm text-[#64748b]">{unitLabel}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#ebe6dc] bg-white/80 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#94a3b8]">
            Dominant field
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#111827]">{dominant.name}</p>
              <p className="mt-1 text-xs text-[#64748b]">
                {Math.round((dominant.count / total) * 100)}% of current learning volume
              </p>
            </div>
            <div className="rounded-full bg-[#f3f1eb] p-2 text-[#111827]">
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
            idx === 0 ? "bg-[#111827]" : idx === 1 ? "bg-[#475569]" : "bg-[#cbd5e1]";
          return (
            <div
              key={`field-${item.name}`}
              className="space-y-2"
              data-testid="learning-profile-row"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[#111827]">{toShortLabel(item.name)}</p>
                  <p className="mt-0.5 text-xs text-[#64748b]">{pct}% share</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-[#475569]">
                  {item.count} {unitLabel}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#ebe7df]">
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
