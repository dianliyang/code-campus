"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deactivateAiModelPricing,
  deactivateAiProviderPricing,
  updateAiPreferences,
  updateAiPromptTemplates,
  upsertAiModelPricing,
} from "@/actions/profile";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai/models-client";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Save, Loader2, Cpu, FileCode, CalendarDays, Tag, BarChart2, Search, Sparkles, BookOpen, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";

type AISectionId = "engine" | "metadata" | "scheduling" | "study-planner" | "topics" | "course-update" | "syllabus-retrieve" | "course-intel" | "usage";

interface AISettingsCardProps {
  section: AISectionId;
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  initialPromptTemplate: string;
  initialStudyPlanPromptTemplate: string;
  initialPlannerPromptTemplate: string;
  initialTopicsPromptTemplate: string;
  initialCourseUpdatePromptTemplate: string;
  initialSyllabusPromptTemplate: string;
  initialCourseIntelPromptTemplate: string;
  modelCatalog: { perplexity: string[]; gemini: string[]; openai: string[]; vertex: string[] };
}

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

type ProviderHealth = {
  provider: AIProvider;
  healthy: boolean;
  missing: string[];
  checks: Record<string, boolean>;
};

type AIHealthStats = {
  healthy: boolean;
  providers: ProviderHealth[];
  checked_at: string;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function UsageBarChart({ daily }: { daily: Record<string, { requests: number; cost_usd: number }> }) {
  const entries = Object.entries(daily);
  const max = Math.max(...entries.map(([, v]) => v.requests), 1);
  return (
    <div className="rounded-md border border-[#f0f0f0] p-3">
      <p className="text-[10px] font-semibold text-[#888] uppercase tracking-widest mb-3">Last 7 Days</p>
      <div className="flex items-end gap-1.5 h-16">
        {entries.map(([date, val]) => {
          const pct = (val.requests / max) * 100;
          const dayName = DAY_LABELS[new Date(date + "T12:00:00").getDay()];
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1f1f1f] text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {val.requests} req · ${val.cost_usd.toFixed(3)}
              </div>
              <div className="w-full flex items-end" style={{ height: "52px" }}>
                <div
                  className="w-full rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max(pct, val.requests > 0 ? 6 : 2)}%`,
                    backgroundColor: val.requests > 0 ? "#1f1f1f" : "#e5e5e5",
                  }}
                />
              </div>
              <span className="text-[9px] text-[#aaa]">{dayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FEATURE_LABELS: Record<string, string> = {
  planner: "AI Planner",
  topics: "Topics",
  "course-update": "Course Update",
  "learning-path": "Learning Path",
  "schedule-parse": "Schedule Parse",
};

const PROVIDER_HINTS: Record<AIProvider, string> = {
  perplexity: "Best for grounded web retrieval",
  gemini: "Fast general-purpose generation",
  openai: "Strong structured output quality",
  vertex: "Google Vertex-hosted Gemini",
};

export default function AISettingsCard({
  section,
  initialProvider,
  initialModel,
  initialWebSearchEnabled,
  initialPromptTemplate,
  initialStudyPlanPromptTemplate,
  initialPlannerPromptTemplate,
  initialTopicsPromptTemplate,
  initialCourseUpdatePromptTemplate,
  initialSyllabusPromptTemplate,
  initialCourseIntelPromptTemplate,
  modelCatalog,
}: AISettingsCardProps) {
  const router = useRouter();
  const perplexityModels = modelCatalog.perplexity;
  const geminiModels = modelCatalog.gemini;
  const openaiModels = modelCatalog.openai;
  const vertexModels = modelCatalog.vertex;
  const normalizeProvider = (value: string): AIProvider => {
    if (value === "gemini") return "gemini";
    if (value === "openai") return "openai";
    if (value === "vertex") return "vertex";
    return "perplexity";
  };
  const modelsForProvider = (p: AIProvider) =>
    p === "gemini" ? geminiModels : p === "openai" ? openaiModels : p === "vertex" ? vertexModels : perplexityModels;
  const [provider, setProvider] = useState<AIProvider>(normalizeProvider(initialProvider));
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [promptTemplate, setPromptTemplate] = useState(initialPromptTemplate);
  const [studyPlanPromptTemplate, setStudyPlanPromptTemplate] = useState(initialStudyPlanPromptTemplate);
  const [plannerPromptTemplate, setPlannerPromptTemplate] = useState(initialPlannerPromptTemplate);
  const [topicsPromptTemplate, setTopicsPromptTemplate] = useState(initialTopicsPromptTemplate);
  const [courseUpdatePromptTemplate, setCourseUpdatePromptTemplate] = useState(initialCourseUpdatePromptTemplate);
  const [syllabusPromptTemplate, setSyllabusPromptTemplate] = useState(initialSyllabusPromptTemplate);
  const [courseIntelPromptTemplate, setCourseIntelPromptTemplate] = useState(initialCourseIntelPromptTemplate);

  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isSavingStudyPlan, setIsSavingStudyPlan] = useState(false);
  const [isSavingPlanner, setIsSavingPlanner] = useState(false);
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [isSavingCourseUpdate, setIsSavingCourseUpdate] = useState(false);
  const [isSavingSyllabus, setIsSavingSyllabus] = useState(false);
  const [isSavingCourseIntel, setIsSavingCourseIntel] = useState(false);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newModelInputPerMillion, setNewModelInputPerMillion] = useState("0");
  const [newModelOutputPerMillion, setNewModelOutputPerMillion] = useState("0");
  const { showToast } = useAppToast();

  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [healthStats, setHealthStats] = useState<AIHealthStats | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const totalCostUsd = Number(usageStats?.totals?.cost_usd || 0);
  const sortedFeatureStats = usageStats
    ? Object.entries(usageStats.byFeature).sort((a, b) => {
        const costDiff = Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0);
        return costDiff !== 0 ? costDiff : b[1].requests - a[1].requests;
      })
    : [];
  const sortedModelStats = usageStats
    ? Object.entries(usageStats.byModel).sort((a, b) => {
        const costDiff = Number(b[1].cost_usd || 0) - Number(a[1].cost_usd || 0);
        return costDiff !== 0 ? costDiff : b[1].requests - a[1].requests;
      })
    : [];

  useEffect(() => {
    const available = modelsForProvider(provider);
    if (available.length === 0) return;
    if (!available.includes(defaultModel)) {
      setDefaultModel(available[0]);
    }
  }, [provider, defaultModel, geminiModels, perplexityModels, openaiModels, vertexModels]);

  useEffect(() => {
    if (section !== "usage") return;
    setUsageLoading(true);
    fetch("/api/ai/usage/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setUsageStats({
            ...d,
            recentResponses: Array.isArray(d.recentResponses) ? d.recentResponses : [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [section]);

  useEffect(() => {
    if (section !== "engine") return;
    setHealthLoading(true);
    fetch("/api/ai/health", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setHealthStats({
            healthy: Boolean(d.healthy),
            providers: Array.isArray(d.providers) ? d.providers : [],
            checked_at: typeof d.checked_at === "string" ? d.checked_at : new Date().toISOString(),
          });
        }
      })
      .catch(() => {})
      .finally(() => setHealthLoading(false));
  }, [section]);

  const saveProviderSettings = () => {
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
  };

  const handleAddModelToCatalog = () => {
    setIsSavingCatalog(true);
    void (async () => {
      try {
        await upsertAiModelPricing({
          provider,
          model: newModelName.trim(),
          inputPerMillion: Number(newModelInputPerMillion || "0"),
          outputPerMillion: Number(newModelOutputPerMillion || "0"),
        });
        showToast({ type: "success", message: "Model added to provider catalog." });
        setNewModelName("");
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

  const handleDeleteProviderFromCatalog = () => {
    setIsSavingCatalog(true);
    void (async () => {
      try {
        await deactivateAiProviderPricing({ provider });
        showToast({ type: "success", message: `Provider removed: ${provider}` });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Failed to delete provider." });
      } finally {
        setIsSavingCatalog(false);
      }
    })();
  };

  const saveDescriptionPrompt = () => {
    setIsSavingDescription(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ descriptionPromptTemplate: promptTemplate });
        showToast({ type: "success", message: "Metadata instructions updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingDescription(false);
      }
    })();
  };

  const saveStudyPlanPrompt = () => {
    setIsSavingStudyPlan(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ studyPlanPromptTemplate });
        showToast({ type: "success", message: "Scheduling logic updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingStudyPlan(false);
      }
    })();
  };

  const saveTopicsPrompt = () => {
    setIsSavingTopics(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ topicsPromptTemplate });
        showToast({ type: "success", message: "Topic classification logic updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingTopics(false);
      }
    })();
  };

  const savePlannerPrompt = () => {
    setIsSavingPlanner(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ plannerPromptTemplate });
        showToast({ type: "success", message: "Study planner logic updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingPlanner(false);
      }
    })();
  };

  const saveSyllabusPrompt = () => {
    setIsSavingSyllabus(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ syllabusPromptTemplate });
        showToast({ type: "success", message: "Syllabus retrieve logic updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingSyllabus(false);
      }
    })();
  };

  const saveCourseUpdatePrompt = () => {
    setIsSavingCourseUpdate(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ courseUpdatePromptTemplate });
        showToast({ type: "success", message: "Course update search logic updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingCourseUpdate(false);
      }
    })();
  };

  const saveCourseIntelPrompt = () => {
    setIsSavingCourseIntel(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ courseIntelPromptTemplate });
        showToast({ type: "success", message: "Course intel logic updated." });
        router.refresh();
      } catch (error) {
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      } finally {
        setIsSavingCourseIntel(false);
      }
    })();
  };

  return (
    <div className="h-full flex flex-col">
      {/* 1. Provider Configuration */}
      <div className={section === "engine" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <Cpu className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Engine Configuration</span>
            </div>
            <button
              onClick={saveProviderSettings}
              disabled={isSavingProvider}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
            >
              {isSavingProvider ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Sync Engine
            </button>
          </div>

          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="rounded-md border border-[#e8e8e8] bg-[#fcfcfc] p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wide">AI Provider Health</p>
                <button
                  onClick={() => {
                    setHealthLoading(true);
                    fetch("/api/ai/health", { cache: "no-store" })
                      .then((r) => r.json())
                      .then((d) => {
                        if (!d.error) {
                          setHealthStats({
                            healthy: Boolean(d.healthy),
                            providers: Array.isArray(d.providers) ? d.providers : [],
                            checked_at: typeof d.checked_at === "string" ? d.checked_at : new Date().toISOString(),
                          });
                        }
                      })
                      .catch(() => {})
                      .finally(() => setHealthLoading(false));
                  }}
                  disabled={healthLoading}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[#d8d8d8] bg-white px-2 text-[11px] font-medium text-[#444] hover:bg-[#f8f8f8] disabled:opacity-60"
                >
                  {healthLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Refresh
                </button>
              </div>
              {healthLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-[#777]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Checking environment status...
                </div>
              ) : !healthStats ? (
                <p className="text-[12px] text-[#8a8a8a]">Health status unavailable.</p>
              ) : (
                <div className="space-y-2">
                  <div
                    className={`rounded-md border px-2.5 py-2 text-[12px] ${
                      healthStats.healthy
                        ? "border-[#d6ebd6] bg-[#f6fbf6] text-[#256b25]"
                        : "border-[#efd8d8] bg-[#fff7f7] text-[#8b3434]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {healthStats.healthy ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span className="font-medium">
                        {healthStats.healthy ? "All providers are configured." : "One or more providers are missing required settings."}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {healthStats.providers.map((item) => (
                      <div key={item.provider} className="rounded-md border border-[#e9e9e9] bg-white p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold capitalize text-[#333]">{item.provider}</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              item.healthy
                                ? "border-[#cce5cc] bg-[#f3fbf3] text-[#2f7a2f]"
                                : "border-[#f0d0d0] bg-[#fff6f6] text-[#9d3b3b]"
                            }`}
                          >
                            {item.healthy ? "Healthy" : "Missing config"}
                          </span>
                        </div>
                        {!item.healthy && item.missing.length > 0 ? (
                          <p className="mt-1.5 text-[11px] text-[#8a4a4a] break-words">
                            Missing: {item.missing.join(", ")}
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-[#5f7b5f]">Required environment vars detected.</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#9a9a9a]">
                    Checked: {new Date(healthStats.checked_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-md border border-[#e8e8e8] bg-[#fcfcfc] p-3">
              <p className="text-xs font-semibold text-[#5a5a5a] mb-2 uppercase tracking-wide">Provider</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      const nextProvider = p as AIProvider;
                      const available = modelsForProvider(nextProvider);
                      setProvider(nextProvider);
                      if (available.length > 0 && !available.includes(defaultModel)) setDefaultModel(available[0]);
                    }}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      provider === p
                        ? "border-[#1f1f1f] bg-[#1f1f1f] text-white"
                        : "border-[#d8d8d8] bg-white text-[#333] hover:bg-[#f8f8f8]"
                    }`}
                  >
                    <p className="text-sm font-semibold capitalize">{p}</p>
                    <p className={`text-[11px] mt-0.5 ${provider === p ? "text-[#efefef]" : "text-[#6f6f6f]"}`}>
                      {PROVIDER_HINTS[p as AIProvider]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-[#e8e8e8] bg-white p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wide">Model</p>
                <p className="text-[11px] text-[#7a7a7a]">Selected provider: <span className="font-semibold capitalize">{provider}</span></p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {modelsForProvider(provider).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDefaultModel(m)}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      defaultModel === m
                        ? "border-[#1f1f1f] bg-[#111] text-white"
                        : "border-[#d8d8d8] bg-white text-[#333] hover:bg-[#f8f8f8]"
                    }`}
                  >
                    <p className="text-[12px] font-medium font-mono">{m}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-[#e8e8e8] bg-white p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={webSearchEnabled}
                  onChange={(e) => setWebSearchEnabled(e.target.checked)}
                  disabled={isSavingProvider}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1f1f1f] focus:ring-[#1f1f1f]"
                />
                <div>
                  <p className="text-sm font-semibold text-[#222]">Web Grounding</p>
                  <p className="text-xs text-[#666] mt-0.5">
                    When enabled, retrieval uses web-grounded context (Perplexity + fetched resource pages) before parsing syllabus JSON.
                  </p>
                </div>
              </label>
            </div>

            <div className="rounded-md border border-[#e8e8e8] bg-white p-3">
              <p className="text-xs font-semibold text-[#5a5a5a] uppercase tracking-wide mb-2">Provider Catalog</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                <input
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="model id"
                  className="h-9 rounded-md border border-[#d8d8d8] px-2.5 text-[12px] outline-none focus:border-[#bcbcbc]"
                  disabled={isSavingCatalog}
                />
                <input
                  value={newModelInputPerMillion}
                  onChange={(e) => setNewModelInputPerMillion(e.target.value)}
                  placeholder="input $ / 1M"
                  className="h-9 rounded-md border border-[#d8d8d8] px-2.5 text-[12px] outline-none focus:border-[#bcbcbc]"
                  disabled={isSavingCatalog}
                />
                <input
                  value={newModelOutputPerMillion}
                  onChange={(e) => setNewModelOutputPerMillion(e.target.value)}
                  placeholder="output $ / 1M"
                  className="h-9 rounded-md border border-[#d8d8d8] px-2.5 text-[12px] outline-none focus:border-[#bcbcbc]"
                  disabled={isSavingCatalog}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                  onClick={handleAddModelToCatalog}
                  disabled={isSavingCatalog || !newModelName.trim()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[12px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
                >
                  {isSavingCatalog ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Add Model
                </button>
                <button
                  onClick={handleDeleteProviderFromCatalog}
                  disabled={isSavingCatalog}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#ebd0d0] bg-white px-2.5 text-[12px] font-medium text-[#9d3b3b] hover:bg-[#fff5f5] transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Provider
                </button>
              </div>
              <div className="rounded border border-[#efefef] divide-y divide-[#f2f2f2] max-h-40 overflow-y-auto">
                {modelsForProvider(provider).length === 0 ? (
                  <p className="text-[12px] text-[#888] p-2">No active models for this provider.</p>
                ) : (
                  modelsForProvider(provider).map((m) => (
                    <div key={m} className="flex items-center justify-between px-2.5 py-1.5 text-[12px]">
                      <span className="font-mono text-[#333]">{m}</span>
                      <button
                        onClick={() => handleDeleteModelFromCatalog(m)}
                        disabled={isSavingCatalog}
                        className="inline-flex items-center gap-1 rounded border border-[#ebd0d0] px-1.5 py-0.5 text-[#9d3b3b] hover:bg-[#fff5f5] disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Metadata Instruction Set */}
      <div className={section === "metadata" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <FileCode className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Metadata Logic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveDescriptionPrompt}
                disabled={isSavingDescription}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              >
                {isSavingDescription ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Push Metadata Logic
              </button>
              <button
                onClick={() => setPromptTemplate("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="w-full flex-1 min-h-0 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
              placeholder="ENTER_INSTRUCTION_SET..."
              disabled={isSavingDescription}
            />
          </div>
        </div>
      </div>

      {/* 3. Scheduling Instruction Set */}
      <div className={section === "scheduling" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <CalendarDays className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Scheduling Logic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveStudyPlanPrompt}
                disabled={isSavingStudyPlan}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              >
                {isSavingStudyPlan ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Push Schedule Logic
              </button>
              <button
                onClick={() => setStudyPlanPromptTemplate("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <textarea
              value={studyPlanPromptTemplate}
              onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
              className="w-full flex-1 min-h-0 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
              placeholder="ENTER_INSTRUCTION_SET..."
              disabled={isSavingStudyPlan}
            />
          </div>
        </div>
      </div>

      {/* 4. Study Planner Logic */}
      <div className={section === "study-planner" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <Sparkles className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Study Planner Logic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={savePlannerPrompt}
                disabled={isSavingPlanner}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              >
                {isSavingPlanner ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Push Study Planner Logic
              </button>
              <button
                onClick={() => setPlannerPromptTemplate("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <textarea
              value={plannerPromptTemplate}
              onChange={(e) => setPlannerPromptTemplate(e.target.value)}
              className="w-full flex-1 min-h-0 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
              placeholder="ENTER_INSTRUCTION_SET..."
              disabled={isSavingPlanner}
            />
          </div>
        </div>
      </div>

      {/* 5. Topic Classification Logic */}
      <div className={section === "topics" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <Tag className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Topic Classification Logic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveTopicsPrompt}
                disabled={isSavingTopics}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              >
                {isSavingTopics ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Push Topic Logic
              </button>
              <button
                onClick={() => setTopicsPromptTemplate("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <textarea
              value={topicsPromptTemplate}
              onChange={(e) => setTopicsPromptTemplate(e.target.value)}
              className="w-full flex-1 min-h-0 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
              placeholder="ENTER_INSTRUCTION_SET..."
              disabled={isSavingTopics}
            />
          </div>
        </div>
      </div>

      {/* 6. Course Update Search Logic */}
      <div className={section === "course-update" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <Search className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Course Update Search Logic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveCourseUpdatePrompt}
                disabled={isSavingCourseUpdate}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              >
                {isSavingCourseUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Push Update Search Logic
              </button>
              <button
                onClick={() => setCourseUpdatePromptTemplate("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <textarea
              value={courseUpdatePromptTemplate}
              onChange={(e) => setCourseUpdatePromptTemplate(e.target.value)}
              className="w-full flex-1 min-h-0 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
              placeholder="ENTER_INSTRUCTION_SET..."
              disabled={isSavingCourseUpdate}
            />
          </div>
        </div>
      </div>

      {/* 7. Syllabus Retrieve Logic */}
      <div className={section === "syllabus-retrieve" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <BookOpen className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Syllabus Retrieve Logic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveSyllabusPrompt}
                disabled={isSavingSyllabus}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              >
                {isSavingSyllabus ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Push Syllabus Logic
              </button>
              <button
                onClick={() => setSyllabusPromptTemplate("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <textarea
              value={syllabusPromptTemplate}
              onChange={(e) => setSyllabusPromptTemplate(e.target.value)}
              className="w-full flex-1 min-h-0 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
              placeholder="ENTER_INSTRUCTION_SET..."
              disabled={isSavingSyllabus}
            />
          </div>
        </div>
      </div>

      {/* 8. Usage Statistics */}
      <div className={section === "course-intel" ? "h-full flex flex-col" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef] shrink-0">
            <div className="flex items-center gap-2 text-[#222]">
              <Sparkles className="w-4 h-4 text-[#777]" />
              <span className="text-sm font-semibold">Course Intel Logic</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveCourseIntelPrompt}
                disabled={isSavingCourseIntel}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50"
              >
                {isSavingCourseIntel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Push Course Intel Logic
              </button>
              <button
                onClick={() => setCourseIntelPromptTemplate("")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <textarea
              value={courseIntelPromptTemplate}
              onChange={(e) => setCourseIntelPromptTemplate(e.target.value)}
              className="w-full flex-1 min-h-0 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
              placeholder="ENTER_INSTRUCTION_SET..."
              disabled={isSavingCourseIntel}
            />
          </div>
        </div>
      </div>

      {/* 8. Usage Statistics */}
      <div className={section === "usage" ? "h-full flex flex-col overflow-y-auto" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4 space-y-4">
          <div className="flex items-center gap-2 text-[#222] pb-3 border-b border-[#efefef]">
            <BarChart2 className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Usage Statistics</span>
          </div>

          {usageLoading ? (
            <div className="flex items-center justify-center py-10" aria-live="polite" aria-busy="true">
              <Loader2 className="w-4 h-4 animate-spin text-[#aaa]" />
            </div>
          ) : !usageStats || usageStats.totals.requests === 0 ? (
            <p className="text-sm text-[#666] text-center py-6">No AI calls tracked yet.</p>
          ) : (
            <div className="space-y-4">
              <section aria-label="Usage summary" className="rounded-md bg-[#fafafa] border border-[#ececec] p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-md border border-[#ededed] bg-white p-3">
                  <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Requests</p>
                  <p className="text-xl font-semibold text-[#111] mt-1">{usageStats.totals.requests.toLocaleString()}</p>
                  <p className="text-xs text-[#666] mt-1">{usageStats.recentTotals.requests.toLocaleString()} in last 7 days</p>
                </div>
                <div className="rounded-md border border-[#ededed] bg-white p-3">
                  <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Input Tokens</p>
                  <p className="text-xl font-semibold text-[#111] mt-1">{usageStats.totals.tokens_input.toLocaleString()}</p>
                </div>
                <div className="rounded-md border border-[#ededed] bg-white p-3">
                  <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Output Tokens</p>
                  <p className="text-xl font-semibold text-[#111] mt-1">{usageStats.totals.tokens_output.toLocaleString()}</p>
                </div>
                <div className="rounded-md border border-[#ededed] bg-white p-3">
                  <p className="text-[11px] font-semibold text-[#5a5a5a] uppercase tracking-wide">Total Cost (USD)</p>
                  <p className="text-xl font-semibold text-[#111] mt-1">${usageStats.totals.cost_usd.toFixed(4)}</p>
                  <p className="text-xs text-[#666] mt-1">${usageStats.recentTotals.cost_usd.toFixed(4)} in last 7 days</p>
                </div>
              </section>

              {usageStats.daily && (
                <section aria-label="Last 7 days activity chart">
                  <UsageBarChart daily={usageStats.daily} />
                </section>
              )}

              {usageStats.recentResponses.length > 0 && (
                <section aria-label="Recent responses" className="rounded-md border border-[#eaeaea] overflow-hidden">
                  <div className="px-3 py-2 bg-[#fafafa] border-b border-[#ececec]">
                    <p className="text-xs font-semibold text-[#555] uppercase tracking-wide">
                      Recent AI Responses ({usageStats.recentResponses.length})
                    </p>
                  </div>
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
                                {(item.provider || "-")}/{(item.model || "-")}
                              </td>
                              <td className="px-3 py-2 text-right text-[#444]">
                                in {item.tokens_input.toLocaleString()} / out {item.tokens_output.toLocaleString()}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-[#222]">${Number(item.cost_usd || 0).toFixed(4)}</td>
                              <td className="px-3 py-2 text-right text-[#666]">{new Date(item.created_at).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {sortedFeatureStats.length > 0 && (
                <section aria-label="Spend by feature" className="rounded-md border border-[#eaeaea] overflow-hidden">
                  <div className="px-3 py-2 bg-[#fafafa] border-b border-[#ececec]">
                    <p className="text-xs font-semibold text-[#555] uppercase tracking-wide">By Feature (Top Spend)</p>
                  </div>
                  <div className="divide-y divide-[#f5f5f5]" role="list">
                    {sortedFeatureStats.map(([feature, stat]) => (
                      <div key={feature} className="px-3 py-3 flex items-center justify-between gap-4" role="listitem">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-[#222]">{FEATURE_LABELS[feature] ?? feature}</span>
                            <span className="text-xs text-[#666]">{stat.requests.toLocaleString()} req</span>
                          </div>
                          <div className="mt-2 h-2.5 w-full rounded bg-[#efefef]" aria-hidden="true">
                            <div
                              className="h-2.5 rounded bg-[#3a3a3a]"
                              style={{ width: `${Math.min(100, totalCostUsd > 0 ? (Number(stat.cost_usd || 0) / totalCostUsd) * 100 : 0)}%` }}
                            />
                          </div>
                          <p className="text-xs text-[#666] mt-1">
                            {totalCostUsd > 0 ? `${((Number(stat.cost_usd || 0) / totalCostUsd) * 100).toFixed(1)}% of spend` : "0.0% of spend"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-[#222]">${Number(stat.cost_usd || 0).toFixed(4)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {sortedModelStats.length > 0 && (
                <section aria-label="Spend by model" className="rounded-md border border-[#eaeaea] overflow-hidden">
                  <div className="px-3 py-2 bg-[#fafafa] border-b border-[#ececec]">
                    <p className="text-xs font-semibold text-[#555] uppercase tracking-wide">By Model (Top Spend)</p>
                  </div>
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
                    {sortedModelStats.map(([model, stat]) => (
                      <tr key={model} className="border-b border-[#f6f6f6] last:border-b-0">
                        <td className="px-3 py-2 font-mono text-[#222]">{model}</td>
                        <td className="px-3 py-2 text-right text-[#444]">{stat.requests.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-[#444]">
                          ${stat.requests > 0 ? (Number(stat.cost_usd || 0) / stat.requests).toFixed(4) : "0.0000"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-[#222]">${Number(stat.cost_usd || 0).toFixed(4)}</td>
                      </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
