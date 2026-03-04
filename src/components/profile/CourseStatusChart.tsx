"use client";

type CourseStatusChartProps = {
  data: Array<[string, number]>;
  emptyText: string;
  recentUpdates30: number;
  inProgressCount: number;
  stalledCount: number;
  avgProgress: number;
  weeklyActivity: number[];
};

const STATUS_COLORS = [
  "#111111",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6"
];

function toLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (s) => s.toUpperCase());
}

export default function CourseStatusChart({
  data,
  emptyText,
  recentUpdates30,
  inProgressCount,
  stalledCount,
  avgProgress,
  weeklyActivity
}: CourseStatusChartProps) {
  const items = data
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = items.reduce((sum, [, count]) => sum + count, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div className="rounded-sm border p-3">
        <p className="text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  const dominant = items[0];
  const dominantPct = Math.round((dominant[1] / total) * 100);
  const peakActivity = Math.max(1, ...weeklyActivity);

  return (
    <div className="space-y-3 rounded-sm border p-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Total Enrollments</p>
          <p className="text-xl font-semibold leading-none">{total}</p>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          Top: <span className="font-medium text-foreground">{toLabel(dominant[0])}</span> ({dominantPct}%)
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="flex h-full w-full">
          {items.map(([status, count], idx) => {
            const pct = (count / total) * 100;
            return (
              <span
                key={`status-segment-${status}`}
                className="h-full"
                style={{
                  width: `${pct}%`,
                  backgroundColor: STATUS_COLORS[idx % STATUS_COLORS.length]
                }}
                title={`${toLabel(status)}: ${count} (${Math.round(pct)}%)`}
              />
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-sm border p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Updated 30d</p>
          <p className="text-sm font-semibold">{recentUpdates30}</p>
        </div>
        <div className="rounded-sm border p-2">
          <p className="text-[10px] text-muted-foreground uppercase">In Progress</p>
          <p className="text-sm font-semibold">{inProgressCount}</p>
        </div>
        <div className="rounded-sm border p-2">
          <p className="text-[10px] text-muted-foreground uppercase">Avg Progress</p>
          <p className="text-sm font-semibold">{avgProgress}%</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground">
          <span>6-week activity</span>
          <span>{stalledCount} stalled</span>
        </div>
        <div className="flex h-10 items-end gap-1">
          {weeklyActivity.map((count, idx) => (
            <div key={`week-activity-${idx}`} className="flex-1 rounded-sm bg-muted">
              <div
                className="w-full rounded-sm bg-black"
                style={{ height: `${Math.max(10, Math.round(count / peakActivity * 100))}%` }}
                title={`Week ${idx + 1}: ${count} updates`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {items.map(([status, count], idx) => {
          const pct = Math.round((count / total) * 100);
          const color = STATUS_COLORS[idx % STATUS_COLORS.length];
          return (
            <div key={status} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate text-[#444]">{toLabel(status)}</span>
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {count} ({pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
