"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  deactivateAiModelPricing,
  updateAiPreferences,
  upsertAiModelPricing } from
"@/actions/identity";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai/models-client";
import { useAppToast } from "@/components/common/AppToastProvider";
import { ArrowUpRight, BarChart2, DollarSign, History, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import ServiceHealthStatus from "./ServiceHealthStatus";

type AISectionId = "engine" | "usage";

interface AISettingsCardProps {
  section: AISectionId;
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  modelCatalog: {perplexity: string[];gemini: string[];openai: string[];vertex?: string[];};
}

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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function UsageBarChart({ daily }: {daily: Record<string, {requests: number;cost_usd: number;}>;}) {
  const entries = Object.entries(daily);
  const max = Math.max(...entries.map(([, v]) => v.requests), 1);
  return (
    <Card>
      <p className="text-[10px] font-semibold text-[#888] mb-3">Last 7 Days</p>
      <div className="flex items-end gap-1.5 h-16">
        {entries.map(([date, val]) => {
          const pct = val.requests / max * 100;
          const dayName = DAY_LABELS[new Date(date + "T12:00:00").getDay()];
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1f1f1f] text-white text-[10px] px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {val.requests} req · ${val.cost_usd.toFixed(3)}
              </div>
              <div className="w-full flex items-end" style={{ height: "52px" }}>
                <div
                  className="w-full transition-all"
                  style={{
                    height: `${Math.max(pct, val.requests > 0 ? 6 : 2)}%`,
                    backgroundColor: val.requests > 0 ? "#1f1f1f" : "#e5e5e5"
                  }} />
                
              </div>
              <span className="text-[9px] text-[#aaa]">{dayName}</span>
            </div>);

        })}
      </div>
    </Card>);

}

const FEATURE_LABELS: Record<string, string> = {
  planner: "AI Planner",
  topics: "Topics",
  "course-update": "Course Update",
  "learning-path": "Learning Path",
  "schedule-parse": "Schedule Parse"
};

const PROVIDER_HINTS: Record<AIProvider, string> = {
  perplexity: "Best for grounded web retrieval",
  gemini: "Fast general-purpose generation",
  openai: "Strong structured output quality"
};

function formatRecentSummary(value: string, isZero: boolean) {
  return isZero ? "in last 7 days" : `${value} in last 7 days`;
}

export default function AISettingsCard({
  section,
  initialProvider,
  initialModel,
  initialWebSearchEnabled,
  modelCatalog
}: AISettingsCardProps) {
  const router = useRouter();
  const perplexityModels = modelCatalog.perplexity;
  const geminiModels = modelCatalog.gemini;
  const openaiModels = modelCatalog.openai;
  const normalizeProvider = (value: string): AIProvider => {
    if (value === "gemini") return "gemini";
    if (value === "openai") return "openai";
    return "perplexity";
  };
  const modelsForProvider = useCallback((p: AIProvider) =>
  p === "gemini" ? geminiModels : p === "openai" ? openaiModels : perplexityModels,
  [geminiModels, openaiModels, perplexityModels]);
  const [provider, setProvider] = useState<AIProvider>(normalizeProvider(initialProvider));
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);

  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);
  const { showToast } = useAppToast();

  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const totalCostUsd = Number(usageStats?.totals?.cost_usd || 0);
  const sortedFeatureStats = usageStats ?
  Object.entries(usageStats.byFeature).sort((a, b) => {
    const costDiff = Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0);
    return costDiff !== 0 ? costDiff : b[1].requests - a[1].requests;
  }) :
  [];
  const sortedModelStats = usageStats ?
  Object.entries(usageStats.byModel).sort((a, b) => {
    const costDiff = Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0);
    return costDiff !== 0 ? costDiff : b[1].requests - a[1].requests;
  }) :
  [];

  useEffect(() => {
    const available = modelsForProvider(provider);
    if (available.length === 0) return;
    if (!available.includes(defaultModel)) {
      setDefaultModel(available[0]);
    }
  }, [provider, defaultModel, modelsForProvider]);

  useEffect(() => {
    if (section !== "usage") return;
    setUsageLoading(true);
    fetch("/api/ai/usage/stats", { cache: "no-store" }).
    then((r) => r.json()).
    then((d) => {
      if (!d.error) {
        setUsageStats({
          ...d,
          recentResponses: Array.isArray(d.recentResponses) ? d.recentResponses : []
        });
      }
    }).
    catch(() => {}).
    finally(() => setUsageLoading(false));
  }, [section]);

  const saveProviderSettings = useCallback(() => {
    setIsSavingProvider(true);
    void (async () => {
      try {
        await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
        showToast({ type: "success", message: "Intelligence preferences updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingProvider(false);
      }
    })();
  }, [provider, defaultModel, webSearchEnabled, router, showToast]);

  useEffect(() => {
    if (section !== "engine") return;
    const handleSync = () => saveProviderSettings();
    window.addEventListener("cc:sync-engine", handleSync);
    return () => window.removeEventListener("cc:sync-engine", handleSync);
  }, [section, saveProviderSettings]);

  const handleAddModelToCatalog = (modelName: string) => {
    setIsSavingCatalog(true);
    void (async () => {
      try {
        await upsertAiModelPricing({
          provider,
          model: modelName.trim(),
          inputPerMillion: 0,
          outputPerMillion: 0
        });
        showToast({ type: "success", message: "Model added to provider catalog." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Failed to add model." });
      } finally {
        setIsSavingCatalog(false);
      }
    })();
  };

  const handleDeleteModelFromCatalog = (model: string) => {
    setIsSavingCatalog(true);
    void (async () => {
      try {
        await deactivateAiModelPricing({ provider, model });
        showToast({ type: "success", message: `Model removed: ${model}` });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Failed to delete model." });
      } finally {
        setIsSavingCatalog(false);
      }
    })();
  };

  return (
    <div className="h-full flex flex-col">
      {/* 1. Provider Configuration */}
      <div className={section === "engine" ? "h-full flex flex-col" : "hidden"}>
        <div className="flex flex-col h-full">
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
            <Card>
              <div className="flex flex-col gap-1 mb-4">
                <p className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wide">AI Provider Health</p>
                <p className="text-[11px] text-muted-foreground">Verification status of configured environment variables and provider endpoints.</p>
              </div>
              <ServiceHealthStatus />
            </Card>

            <Card>
              <p className="text-xs font-semibold text-[#5a5a5a] mb-2 uppercase tracking-wide">Provider</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {AI_PROVIDERS.map((p) =>
                <Button variant="outline"
                key={p}
                onClick={() => {
                  const nextProvider = p as AIProvider;
                  const available = modelsForProvider(nextProvider);
                  setProvider(nextProvider);
                  if (available.length > 0 && !available.includes(defaultModel)) setDefaultModel(available[0]);
                }}>





                  
                    <p className="font-semibold capitalize">{p}</p>
                    <p className={`text-[11px] mt-0.5 ${provider === p ? "text-[#efefef]" : "text-[#6f6f6f]"}`}>
                      {PROVIDER_HINTS[p as AIProvider]}
                    </p>
                  </Button>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wide">Model</p>
                <p className="text-[11px] text-[#7a7a7a]">Selected provider: <span className="font-semibold capitalize">{provider}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline"
                onClick={() => {
                  const input = window.prompt(`Add model id for ${provider}`, "");
                  const modelName = String(input || "").trim();
                  if (!modelName) return;
                  void handleAddModelToCatalog(modelName);
                }}
                disabled={isSavingCatalog}

                title="Add model"
                aria-label="Add model">
                  
                  {isSavingCatalog ? <Loader2 className="animate-spin" /> : <Plus />}
                </Button>
                <Select value={defaultModel || undefined} onValueChange={setDefaultModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Models</SelectLabel>
                      {modelsForProvider(provider).map((m) =>
                      <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Button variant="outline"
                onClick={() => void handleDeleteModelFromCatalog(defaultModel)}
                disabled={isSavingCatalog || !defaultModel}

                title="Delete model"
                aria-label="Delete model">
                  
                  <Trash2 />
                </Button>
              </div>
            </Card>

            <Card>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={webSearchEnabled}
                  onCheckedChange={(checked) => setWebSearchEnabled(checked === true)}
                  disabled={isSavingProvider} />
                
                <div>
                  <p className="text-sm font-semibold text-[#222]">Web Grounding</p>
                  <p className="text-xs text-[#666] mt-0.5">
                    When enabled, retrieval uses web-grounded context (Perplexity + fetched resource pages) before parsing syllabus JSON.
                  </p>
                </div>
              </label>
            </Card>

          </div>
        </div>
      </div>

      {/* 8. Usage Statistics */}
      <div className={section === "usage" ? "h-full flex flex-col overflow-y-auto" : "hidden"}>
        <Card>
          <Card>
            <BarChart2 className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Usage Statistics</span>
          </Card>

          {usageLoading ?
          <div className="flex items-center justify-center py-10" aria-live="polite" aria-busy="true">
              <Loader2 className="w-4 h-4 animate-spin text-[#aaa]" />
            </div> :
          !usageStats || usageStats.totals.requests === 0 ?
          <p className="text-sm text-[#666] text-center py-6">No AI calls tracked yet.</p> :

          <div className="space-y-4">
              <div aria-label="Usage summary" className="flex gap-2 overflow-x-auto pb-1">
                <Card className="min-w-[200px] flex-1">
                  <div className="flex h-24 flex-col justify-between px-4 py-3">
                    <div className="flex items-start gap-2">
                      <History className="h-4 w-4 text-[#777]" />
                      <p className="text-sm font-medium text-[#5a5a5a]">Requests</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-xl font-semibold text-[#111]">{usageStats.totals.requests.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-[#666]">
                        {formatRecentSummary(
                          usageStats.recentTotals.requests.toLocaleString(),
                          usageStats.recentTotals.requests === 0,
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="min-w-[200px] flex-1">
                  <div className="flex h-24 flex-col justify-between px-4 py-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-[#777]" />
                      <p className="text-sm font-medium text-[#5a5a5a]">Input Tokens</p>
                    </div>
                    <p className="mt-auto text-xl font-semibold text-[#111]">{usageStats.totals.tokens_input.toLocaleString()}</p>
                  </div>
                </Card>
                <Card className="min-w-[200px] flex-1">
                  <div className="flex h-24 flex-col justify-between px-4 py-3">
                    <div className="flex items-start gap-2">
                      <ArrowUpRight className="h-4 w-4 text-[#777]" />
                      <p className="text-sm font-medium text-[#5a5a5a]">Output Tokens</p>
                    </div>
                    <p className="mt-auto text-xl font-semibold text-[#111]">{usageStats.totals.tokens_output.toLocaleString()}</p>
                  </div>
                </Card>
                <Card className="min-w-[200px] flex-1">
                  <div className="flex h-24 flex-col justify-between px-4 py-3">
                    <div className="flex items-start gap-2">
                      <DollarSign className="h-4 w-4 text-[#777]" />
                      <p className="text-sm font-medium text-[#5a5a5a]">Total Cost (USD)</p>
                    </div>
                    <div className="mt-auto">
                      <p className="text-xl font-semibold text-[#111]">${usageStats.totals.cost_usd.toFixed(4)}</p>
                      <p className="mt-1 text-xs text-[#666]">
                        {formatRecentSummary(
                          `$${usageStats.recentTotals.cost_usd.toFixed(4)}`,
                          usageStats.recentTotals.cost_usd === 0,
                        )}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {usageStats.daily &&
            <section aria-label="Last 7 days activity chart">
                  <UsageBarChart daily={usageStats.daily} />
                </section>
            }

              {usageStats.recentResponses.length > 0 &&
            <Card aria-label="Recent responses">
                  <Card>
                    <p className="text-xs font-semibold text-[#555] uppercase tracking-wide">
                      Recent AI Responses ({usageStats.recentResponses.length})
                    </p>
                  </Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white">
                        <tr className="border-b border-[#f0f0f0] text-left text-[11px] uppercase tracking-wide text-[#666]">
                          <th scope="col" className="px-3 py-2 font-semibold">Feature</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Provider / Model</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Tokens</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Cost</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageStats.recentResponses.map((item) => {
                      const featureLabel = FEATURE_LABELS[item.feature] ?? item.feature;
                      const preset = (item.preset || "").trim();
                      const isDuplicatePreset = preset.length > 0 && preset.toLowerCase() === featureLabel.toLowerCase();
                      const featureText = isDuplicatePreset ? featureLabel : `${featureLabel}${preset ? ` · ${preset}` : ""}`;
                      return (
                        <tr key={item.id} className="border-b border-[#f6f6f6] last:border-b-0">
                              <td className="px-3 py-2 text-[#222]">{featureText}</td>
                              <td className="px-3 py-2 text-[#444]">
                                {item.provider || "-"}/{item.model || "-"}
                              </td>
                              <td className="px-3 py-2 text-right text-[#444]">
                                in {item.tokens_input.toLocaleString()} / out {item.tokens_output.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-[#222]">${Number(item.cost_usd || 0).toFixed(4)}</td>
                              <td className="px-3 py-2 text-right text-[#666]">{new Date(item.created_at).toLocaleString()}</td>
                            </tr>);

                    })}
                      </tbody>
                    </table>
                  </div>
                </Card>
            }

              {sortedFeatureStats.length > 0 &&
            <Card aria-label="Spend by feature">
                  <Card>
                    <p className="text-xs font-semibold text-[#555] uppercase tracking-wide">By Feature (Top Spend)</p>
                  </Card>
                  <div className="divide-y divide-[#f5f5f5]" role="list">
                    {sortedFeatureStats.map(([feature, stat]) =>
                <div key={feature} className="px-3 py-3 flex items-center justify-between gap-4" role="listitem">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-[#222]">{FEATURE_LABELS[feature] ?? feature}</span>
                            <span className="text-xs text-[#666]">{stat.requests.toLocaleString()} req</span>
                          </div>
                          <div className="mt-2 h-2.5 w-full bg-[#efefef]" aria-hidden="true">
                            <div
                        className="h-2.5 bg-[#3a3a3a]"
                        style={{ width: `${Math.min(100, totalCostUsd > 0 ? Number(stat.cost_usd || 0) / totalCostUsd * 100 : 0)}%` }} />
                      
                          </div>
                          <p className="text-xs text-[#666] mt-1">
                            {totalCostUsd > 0 ? `${(Number(stat.cost_usd || 0) / totalCostUsd * 100).toFixed(1)}% of spend` : "0.0% of spend"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-[#222]">${Number(stat.cost_usd || 0).toFixed(4)}</p>
                        </div>
                      </div>
                )}
                  </div>
                </Card>
            }

              {sortedModelStats.length > 0 &&
            <Card aria-label="Spend by model">
                  <Card>
                    <p className="text-xs font-semibold text-[#555] uppercase tracking-wide">By Model (Top Spend)</p>
                  </Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white">
                        <tr className="border-b border-[#f0f0f0] text-left text-[11px] uppercase tracking-wide text-[#666]">
                          <th scope="col" className="px-3 py-2 font-semibold">Model</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Requests</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Avg / Request</th>
                          <th scope="col" className="px-3 py-2 font-semibold text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                    {sortedModelStats.map(([model, stat]) =>
                    <tr key={model} className="border-b border-[#f6f6f6] last:border-b-0">
                        <td className="px-3 py-2 font-mono text-[#222]">{model}</td>
                        <td className="px-3 py-2 text-right text-[#444]">{stat.requests.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-[#444]">
                          ${stat.requests > 0 ? (Number(stat.cost_usd || 0) / stat.requests).toFixed(4) : "0.0000"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[#222]">${Number(stat.cost_usd || 0).toFixed(4)}</td>
                      </tr>
                    )}
                      </tbody>
                    </table>
                  </div>
                </Card>
            }
            </div>
          }
        </Card>
      </div>
    </div>);

}
