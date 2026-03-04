"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
    <div className="rounded-sm border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatBlock
          label="Requests"
          value={stats.totals.requests.toLocaleString()}
          sub={`${stats.recentTotals.requests.toLocaleString()} in last 7 days`}
        />
        <StatBlock label="Input Tokens" value={stats.totals.tokens_input.toLocaleString()} />
        <StatBlock label="Output Tokens" value={stats.totals.tokens_output.toLocaleString()} />
        <StatBlock
          label="Total Cost (USD)"
          value={`$${Number(stats.totals.cost_usd || 0).toFixed(4)}`}
          sub={`$${Number(stats.recentTotals.cost_usd || 0).toFixed(4)} in last 7 days`}
        />
      </div>

      <Separator />

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Daily Activity</h4>
        <div className="rounded-sm border p-3">
          {dailyRows.length > 0 ? (
            <div className="grid h-28 grid-cols-7 items-end gap-2">
              {dailyRows.map(([day, row]) => (
                <div key={day} className="flex h-full flex-col items-center justify-end gap-1">
                  <div className="flex h-20 w-full items-end">
                    <div
                      className="w-full bg-foreground"
                      style={{
                        height: `${Math.max(6, Math.round((Number(row.requests || 0) / maxDailyRequests) * 100))}%`,
                      }}
                      title={`${day}: ${row.requests} req`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No daily activity.</p>
          )}
        </div>
      </section>

      <Separator />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <section className="rounded-sm border p-3">
          <h4 className="text-sm font-semibold">By Feature</h4>
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
        </section>

        <section className="rounded-sm border p-3">
          <h4 className="text-sm font-semibold">By Model</h4>
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
        </section>
      </div>

      <Separator />

      <section className="rounded-sm border p-3">
        <h4 className="text-sm font-semibold">Recent AI Responses</h4>
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
      </section>
    </div>
  );
}
