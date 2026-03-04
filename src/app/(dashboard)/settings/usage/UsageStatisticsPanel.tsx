"use client";

import { useEffect, useState } from "react";
import { BarChart2, Loader2 } from "lucide-react";import { Card } from "@/components/ui/card";

type UsageStats = {
  totals: {requests: number;tokens_input: number;tokens_output: number;cost_usd: number;};
  byFeature: Record<string, {requests: number;cost_usd: number;}>;
  byModel: Record<string, {requests: number;cost_usd: number;}>;
  recentTotals: {requests: number;cost_usd: number;};
  recentResponses: Array<{
    id: number;
    feature: string;
    preset: string | null;
    provider: string | null;
    model: string | null;
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
    created_at: string;
  }>;
  daily: Record<string, {requests: number;cost_usd: number;}>;
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

  const featureRows = stats ?
  Object.entries(stats.byFeature).sort((a, b) => Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0)) :
  [];
  const modelRows = stats ?
  Object.entries(stats.byModel).sort((a, b) => Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0)) :
  [];
  const dailyRows = stats ? Object.entries(stats.daily) : [];
  const maxDailyRequests = Math.max(1, ...dailyRows.map(([, row]) => Number(row.requests || 0)));

  return (
    <div className="h-full flex flex-col">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[#1f1f1f]">Usage Statistics</h3>
        <p className="text-xs text-[#7a7a7a] mt-0.5">AI call history, token usage, and cost breakdown.</p>
      </div>
      <Card>
        <Card>
          <BarChart2 className="w-4 h-4 text-[#777]" />
          <span className="text-sm font-semibold">Usage Statistics</span>
        </Card>

        {loading ?
        <div className="flex items-center justify-center py-10">
            <Loader2 className="w-4 h-4 animate-spin text-[#999]" />
          </div> :
        !stats ?
        <p className="text-sm text-[#666]">Failed to load usage statistics.</p> :

        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Requests</p>
                <p className="text-xl font-semibold text-[#111] mt-1">{stats.totals.requests.toLocaleString()}</p>
                <p className="text-xs text-[#666] mt-1">{stats.recentTotals.requests.toLocaleString()} in last 7 days</p>
              </Card>
              <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Input Tokens</p>
                <p className="text-xl font-semibold text-[#111] mt-1">{stats.totals.tokens_input.toLocaleString()}</p>
              </Card>
              <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Output Tokens</p>
                <p className="text-xl font-semibold text-[#111] mt-1">{stats.totals.tokens_output.toLocaleString()}</p>
              </Card>
              <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Total Cost (USD)</p>
                <p className="text-xl font-semibold text-[#111] mt-1">${Number(stats.totals.cost_usd || 0).toFixed(4)}</p>
                <p className="text-xs text-[#666] mt-1">${Number(stats.recentTotals.cost_usd || 0).toFixed(4)} in last 7 days</p>
              </Card>
            </div>

            {dailyRows.length > 0 &&
          <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide mb-2">Daily Activity (Last 7 Days)</p>
                <div className="grid grid-cols-7 gap-2 items-end h-24">
                  {dailyRows.map(([day, row]) =>
              <div key={day} className="flex flex-col items-center gap-1">
                      <div className="w-full h-16 flex items-end">
                        <div
                    className="w-full bg-[#3d3d3d]"
                    style={{ height: `${Math.max(6, Math.round(Number(row.requests || 0) / maxDailyRequests * 100))}%` }}
                    title={`${day}: ${row.requests} req`} />
                  
                      </div>
                      <span className="text-[10px] text-[#666]">{day.slice(5)}</span>
                    </div>
              )}
                </div>
              </Card>
          }

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide mb-2">By Feature</p>
                {featureRows.length > 0 ?
              <ul className="space-y-1.5">
                    {featureRows.slice(0, 8).map(([feature, row]) =>
                <li key={feature} className="flex items-center justify-between text-xs">
                        <span className="text-[#333] truncate pr-2">{feature}</span>
                        <span className="text-[#666]">{row.requests} · ${Number(row.cost_usd || 0).toFixed(4)}</span>
                      </li>
                )}
                  </ul> :

              <p className="text-xs text-[#666]">No feature data.</p>
              }
              </Card>

              <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide mb-2">By Model</p>
                {modelRows.length > 0 ?
              <ul className="space-y-1.5">
                    {modelRows.slice(0, 8).map(([model, row]) =>
                <li key={model} className="flex items-center justify-between text-xs">
                        <span className="text-[#333] truncate pr-2">{model}</span>
                        <span className="text-[#666]">{row.requests} · ${Number(row.cost_usd || 0).toFixed(4)}</span>
                      </li>
                )}
                  </ul> :

              <p className="text-xs text-[#666]">No model data.</p>
              }
              </Card>
            </div>

            <Card>
              <Card>
                <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Recent AI Responses</p>
              </Card>
              {stats.recentResponses.length > 0 ?
            <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white text-[#666]">
                      <tr className="border-b border-[#efefef]">
                        <th className="px-3 py-2 text-left font-semibold">Feature</th>
                        <th className="px-3 py-2 text-left font-semibold">Provider / Model</th>
                        <th className="px-3 py-2 text-right font-semibold">Tokens</th>
                        <th className="px-3 py-2 text-right font-semibold">Cost</th>
                        <th className="px-3 py-2 text-right font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentResponses.map((item) =>
                  <tr key={item.id} className="border-b border-[#f3f3f3] last:border-b-0">
                          <td className="px-3 py-2 text-[#333]">{item.preset ? `${item.feature} · ${item.preset}` : item.feature}</td>
                          <td className="px-3 py-2 text-[#666]">{item.provider || "-"} / {item.model || "-"}</td>
                          <td className="px-3 py-2 text-right text-[#666]">{(item.tokens_input + item.tokens_output).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-[#333]">${Number(item.cost_usd || 0).toFixed(4)}</td>
                          <td className="px-3 py-2 text-right text-[#777]">{new Date(item.created_at).toLocaleString()}</td>
                        </tr>
                  )}
                    </tbody>
                  </table>
                </div> :

            <p className="p-3 text-sm text-[#666]">No recent responses.</p>
            }
            </Card>
          </div>
        }
      </Card>
    </div>);

}