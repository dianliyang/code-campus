"use client";

type LearningField = {
  name: string;
  count: number;
};

type LearningProfileChartProps = {
  data: LearningField[];
  unitLabel: string;
  emptyText: string;
};

const COLOR_PALETTE = [
  "from-fuchsia-500 to-pink-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-violet-500 to-indigo-500",
  "from-rose-500 to-red-500",
  "from-lime-500 to-green-500",
  "from-sky-500 to-cyan-500"
];

function toShortLabel(label: string): string {
  if (label.length <= 16) return label;
  return `${label.slice(0, 13)}...`;
}

export default function LearningProfileChart({
  data,
  unitLabel,
  emptyText
}: LearningProfileChartProps) {
  const items = data.filter((d) => d.count > 0).slice(0, 18);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (items.length === 0 || total === 0) {
    return (
      <div className="rounded-sm border p-3">
        <p className="text-sm text-slate-500">{emptyText}</p>
      </div>
    );
  }

  const maxCount = Math.max(...items.map((item) => item.count));
  const minCount = Math.min(...items.map((item) => item.count));
  const sizeFor = (count: number) => {
    if (maxCount === minCount) return 18;
    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.round(13 + ratio * 20);
  };
  const weightFor = (count: number) => {
    if (maxCount === minCount) return 600;
    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.round(450 + ratio * 300);
  };
  const dominant = items[0];

  return (
    <div className="space-y-3 rounded-sm border p-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Total Learning Units</p>
          <p className="text-xl font-semibold leading-none">{total}</p>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          Top field:{" "}
          <span className="font-medium text-foreground">{dominant.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="min-h-[210px] rounded-sm border bg-[#fcfcfc] p-3">
          <div className="flex min-h-[180px] flex-wrap content-start items-start gap-x-3 gap-y-2">
            {items.map((item, idx) => {
              const pct = Math.round((item.count / total) * 100);
              return (
                <span
                  key={`word-${item.name}`}
                  className={`inline-flex select-none rounded-sm bg-gradient-to-r bg-clip-text text-transparent ${COLOR_PALETTE[idx % COLOR_PALETTE.length]}`}
                  style={{
                    fontSize: `${sizeFor(item.count)}px`,
                    fontWeight: weightFor(item.count),
                    lineHeight: 1.1
                  }}
                  title={`${item.name}: ${item.count} ${unitLabel} (${pct}%)`}
                >
                  {item.name}
                </span>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {items.map((item, idx) => {
            const pct = Math.round((item.count / total) * 100);
            return (
              <div key={`rank-${item.name}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${COLOR_PALETTE[idx % COLOR_PALETTE.length]}`}
                    />
                    <span className="truncate text-[#444]">{toShortLabel(item.name)}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {item.count} {unitLabel} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${COLOR_PALETTE[idx % COLOR_PALETTE.length]}`}
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
