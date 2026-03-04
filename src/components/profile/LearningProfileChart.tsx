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
  "#111111",
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16"
];

function toShortLabel(label: string): string {
  if (label.length <= 16) return label;
  return `${label.slice(0, 13)}...`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
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
  const bubbleSizeFor = (count: number) => {
    if (maxCount === minCount) return 64;
    const ratio = (count - minCount) / (maxCount - minCount);
    return Math.round(34 + ratio * 76);
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
        <div className="relative min-h-[210px] rounded-sm border bg-[#fcfcfc] p-3">
          <div className="relative h-[180px] w-full overflow-hidden rounded-sm">
            {items.map((item, idx) => {
              const seed = hashString(item.name);
              const x = 10 + (seed % 81);
              const y = 8 + ((seed >> 7) % 77);
              const size = bubbleSizeFor(item.count);
              const pct = Math.round((item.count / total) * 100);
              return (
                <div
                  key={`bubble-${item.name}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                    opacity: 0.22 + (pct / 100) * 0.45,
                    transform: "translate(-50%, -50%)",
                  }}
                  title={`${item.name}: ${item.count} ${unitLabel} (${pct}%)`}
                />
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
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}
                    />
                    <span className="truncate text-[#444]">{toShortLabel(item.name)}</span>
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {item.count} {unitLabel} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(3, pct)}%`,
                      backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                    }}
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
