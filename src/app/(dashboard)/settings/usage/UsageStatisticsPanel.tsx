"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Cpu, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type UsageStats = {
  totals: { requests: number; tokens_input: number; tokens_output: number; cost_usd: number };
  byFeature: Record<string, { requests: number; cost_usd: number }>;
  byModel: Record<string, { requests: number; cost_usd: number }>;
  recentTotals: { requests: number; cost_usd: number };
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
  daily: Record<string, { requests: number; cost_usd: number }>;
};

function StatBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="h-full">
      <CardContent>
        <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : <span />}
      </CardContent>
    </Card>
  );
}

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

  const featureRows = useMemo(
    () =>
      stats
        ? Object.entries(stats.byFeature).sort(
            (a, b) => Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0),
          )
        : [],
    [stats],
  );

  const modelRows = useMemo(
    () =>
      stats
        ? Object.entries(stats.byModel).sort(
            (a, b) => Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0),
          )
        : [],
    [stats],
  );

  const dailyRows = useMemo(() => (stats ? Object.entries(stats.daily) : []), [stats]);
  const maxDailyRequests = Math.max(1, ...dailyRows.map(([, row]) => Number(row.requests || 0)));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground">Failed to load usage statistics.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-[#1f1f1f]">Usage Statistics</h3>
        <p className="mt-1 text-sm text-muted-foreground">Requests, token usage, cost trends, and recent AI responses.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <div className="min-w-[190px] flex-1">
          <StatBlock
            label="Requests"
            value={stats.totals.requests.toLocaleString()}
            sub={`${stats.recentTotals.requests.toLocaleString()} in last 7 days`}
          />
        </div>
        <div className="min-w-[190px] flex-1">
          <StatBlock label="Input Tokens" value={stats.totals.tokens_input.toLocaleString()} />
        </div>
        <div className="min-w-[190px] flex-1">
          <StatBlock label="Output Tokens" value={stats.totals.tokens_output.toLocaleString()} />
        </div>
        <div className="min-w-[190px] flex-1">
          <StatBlock
            label="Total Cost (USD)"
            value={`$${Number(stats.totals.cost_usd || 0).toFixed(4)}`}
            sub={`$${Number(stats.recentTotals.cost_usd || 0).toFixed(4)} in last 7 days`}
          />
        </div>
      </div>

      <section className="space-y-1.5">
        <h4 className="text-sm font-semibold">Daily Activity</h4>
        <Card>
          <CardContent className="pt-6">
          {dailyRows.length > 0 ? (
            <div className="flex h-32 items-end justify-between gap-1 sm:gap-2">
              {dailyRows.map(([day, row]) => (
                <div key={day} className="group relative flex flex-1 flex-col items-center">
                  <div className="flex h-20 w-full items-end justify-center">
                    <div
                      className="w-full max-w-[32px] rounded-t-[2px] bg-foreground/10 transition-colors group-hover:bg-foreground/20"
                      style={{
                        height: `${Math.max(4, Math.round((Number(row.requests || 0) / maxDailyRequests) * 100))}%`,
                        backgroundColor: Number(row.requests) > 0 ? undefined : 'transparent'
                      }}
                    />
                    {Number(row.requests) > 0 && (
                      <div
                        className="absolute bottom-6 z-10 hidden min-w-[80px] -translate-y-full rounded bg-stone-900 px-2 py-1 text-center text-[10px] text-white shadow-xl group-hover:block"
                      >
                        <p className="font-bold">{row.requests} requests</p>
                        <p className="text-stone-400">{day}</p>
                        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-stone-900" />
                      </div>
                    )}
                  </div>
                  <span className="mt-2 text-[9px] font-medium uppercase tracking-tighter text-muted-foreground sm:tracking-normal">
                    {new Date(day).toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No daily activity.</p>
          )}
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        <Card>
          <CardContent>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">By Feature</h4>
          </div>
          <div className="mt-2 space-y-2">
            {featureRows.length > 0 ? (
              featureRows.slice(0, 10).map(([feature, row]) => (
                <div key={feature} className="flex items-center justify-between text-xs">
                  <span className="truncate pr-2">{feature}</span>
                  <span className="text-muted-foreground">
                    {row.requests} · ${Number(row.cost_usd || 0).toFixed(4)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No feature data.</p>
            )}
          </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">By Model</h4>
          </div>
          <div className="mt-2 space-y-2">
            {modelRows.length > 0 ? (
              modelRows.slice(0, 10).map(([model, row]) => (
                <div key={model} className="flex items-center justify-between text-xs">
                  <span className="truncate pr-2">{model}</span>
                  <span className="text-muted-foreground">
                    {row.requests} · ${Number(row.cost_usd || 0).toFixed(4)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No model data.</p>
            )}
          </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Recent AI Responses</h4>
        </div>
        {stats.recentResponses.length > 0 ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Feature</th>
                  <th className="px-2 py-2 font-medium">Provider / Model</th>
                  <th className="px-2 py-2 text-right font-medium">Tokens</th>
                  <th className="px-2 py-2 text-right font-medium">Cost</th>
                  <th className="px-2 py-2 text-right font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentResponses.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-2 py-2">{item.preset ? `${item.feature} · ${item.preset}` : item.feature}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {item.provider || "-"} / {item.model || "-"}
                    </td>
                    <td className="px-2 py-2 text-right text-muted-foreground">
                      {(item.tokens_input + item.tokens_output).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-right">${Number(item.cost_usd || 0).toFixed(4)}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No recent responses.</p>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
