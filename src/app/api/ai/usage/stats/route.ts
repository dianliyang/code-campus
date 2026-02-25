import { NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UsageLog = {
  provider: string;
  model: string;
  feature: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  created_at: string;
};

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("ai_usage_logs")
    .select("provider, model, feature, tokens_input, tokens_output, cost_usd, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const logs = (data || []) as UsageLog[];

  const totals = logs.reduce(
    (acc, l) => ({
      requests: acc.requests + 1,
      tokens_input: acc.tokens_input + (l.tokens_input || 0),
      tokens_output: acc.tokens_output + (l.tokens_output || 0),
      cost_usd: acc.cost_usd + (l.cost_usd || 0),
    }),
    { requests: 0, tokens_input: 0, tokens_output: 0, cost_usd: 0 }
  );

  const byFeature: Record<string, { requests: number; cost_usd: number }> = {};
  for (const l of logs) {
    if (!byFeature[l.feature]) byFeature[l.feature] = { requests: 0, cost_usd: 0 };
    byFeature[l.feature].requests++;
    byFeature[l.feature].cost_usd += l.cost_usd || 0;
  }

  const byModel: Record<string, { requests: number; cost_usd: number }> = {};
  for (const l of logs) {
    const key = `${l.provider}/${l.model}`;
    if (!byModel[key]) byModel[key] = { requests: 0, cost_usd: 0 };
    byModel[key].requests++;
    byModel[key].cost_usd += l.cost_usd || 0;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recent = logs.filter((l) => l.created_at >= sevenDaysAgo);
  const recentTotals = recent.reduce(
    (acc, l) => ({ requests: acc.requests + 1, cost_usd: acc.cost_usd + (l.cost_usd || 0) }),
    { requests: 0, cost_usd: 0 }
  );

  // Daily breakdown for last 7 days (YYYY-MM-DD keys)
  const daily: Record<string, { requests: number; cost_usd: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    daily[key] = { requests: 0, cost_usd: 0 };
  }
  for (const l of recent) {
    const key = l.created_at.slice(0, 10);
    if (daily[key]) {
      daily[key].requests++;
      daily[key].cost_usd += l.cost_usd || 0;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plannerResponsesBase = (supabase as any).from("ai_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("feature", "planner");
  const [{ count: plannerResponsesTotal, error: plannerTotalError }, { count: plannerResponsesRecent, error: plannerRecentError }] = await Promise.all([
    plannerResponsesBase,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("ai_responses").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("feature", "planner").gte("created_at", sevenDaysAgo),
  ]);

  if (plannerTotalError) return NextResponse.json({ error: plannerTotalError.message }, { status: 500 });
  if (plannerRecentError) return NextResponse.json({ error: plannerRecentError.message }, { status: 500 });

  return NextResponse.json({
    totals,
    byFeature,
    byModel,
    recentTotals,
    plannerResponses: {
      total: plannerResponsesTotal || 0,
      recent: plannerResponsesRecent || 0,
    },
    daily,
  });
}
