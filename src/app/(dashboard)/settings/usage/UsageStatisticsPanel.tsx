"use client";

import { useEffect, useState } from "react";
import { BarChart2, Loader2 } from "lucide-react";

type UsageStats = {
  totals: { requests: number; tokens_input: number; tokens_output: number; cost_usd: number };
  byFeature: Record<string, { requests: number; cost_usd: number }>;
  byModel: Record<string, { requests: number; cost_usd: number }>;
  recentTotals: { requests: number; cost_usd: number };
};

export default function UsageStatisticsPanel() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/ai/usage/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load usage statistics");
        const payload = (await res.json()) as UsageStats;
        if (!cancelled) setStats(payload);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[#1f1f1f]">Usage Statistics</h3>
        <p className="text-xs text-[#7a7a7a] mt-0.5">AI call history, token usage, and cost breakdown.</p>
      </div>
      <div className="rounded-md border border-[#e5e5e5] bg-white p-4 space-y-4">
        <div className="flex items-center gap-2 text-[#222] pb-3 border-b border-[#efefef]">
          <BarChart2 className="w-4 h-4 text-[#777]" />
          <span className="text-sm font-semibold">Usage Statistics</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-4 h-4 animate-spin text-[#999]" />
          </div>
        ) : !stats ? (
          <p className="text-sm text-[#666]">Failed to load usage statistics.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-md border border-[#ededed] bg-[#fcfcfc] p-3">
              <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Requests</p>
              <p className="text-xl font-semibold text-[#111] mt-1">{stats.totals.requests.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-[#ededed] bg-[#fcfcfc] p-3">
              <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Input Tokens</p>
              <p className="text-xl font-semibold text-[#111] mt-1">{stats.totals.tokens_input.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-[#ededed] bg-[#fcfcfc] p-3">
              <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Output Tokens</p>
              <p className="text-xl font-semibold text-[#111] mt-1">{stats.totals.tokens_output.toLocaleString()}</p>
            </div>
            <div className="rounded-md border border-[#ededed] bg-[#fcfcfc] p-3">
              <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Total Cost (USD)</p>
              <p className="text-xl font-semibold text-[#111] mt-1">${Number(stats.totals.cost_usd || 0).toFixed(4)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

