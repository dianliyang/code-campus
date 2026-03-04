"use client";import { Card } from "@/components/ui/card";

interface FieldStat {
  name: string;
  count: number;
}

interface Props {
  fields: FieldStat[];
}

const BAR_COLORS = [
"#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b",
"#10b981", "#ef4444", "#06b6d4", "#84cc16"];


export default function CognitiveFingerprintCard({ fields }: Props) {
  if (fields.length === 0) {
    return (
      <Card>
        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest text-center">
          No enrolled courses yet
        </p>
      </Card>);

  }

  const max = Math.max(...fields.map((f) => f.count));

  return (
    <Card>
      <div>
        <p className="text-[10px] font-bold text-[#9a9a9a] uppercase tracking-widest mb-0.5">
          Cognitive Fingerprint
        </p>
        <p className="text-xs text-[#555]">Your learning domain distribution</p>
      </div>

      <div className="flex items-end gap-2 h-24">
        {fields.slice(0, 8).map((f, i) => {
          const pct = max > 0 ? f.count / max * 100 : 0;
          return (
            <div key={f.name} className="flex flex-col items-center flex-1 min-w-0 gap-1">
              <span className="text-[9px] font-bold text-gray-400">{f.count}</span>
              <div
                className="w-full transition-all"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  opacity: 0.85
                }}
                title={`${f.name}: ${f.count}`} />
              
            </div>);

        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {fields.slice(0, 8).map((f, i) =>
        <div key={f.name} className="flex items-center gap-1">
            <div
            className="w-2 h-2 flex-shrink-0"
            style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
          
            <span className="text-[10px] text-[#777] truncate max-w-[80px]">{f.name}</span>
          </div>
        )}
      </div>
    </Card>);

}