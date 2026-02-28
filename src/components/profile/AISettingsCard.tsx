"use client";

import { useEffect, useState } from "react";
import {
  deactivateAiModelPricing,
  deactivateAiProviderPricing,
  updateAiPreferences,
  updateAiPromptTemplates,
  upsertAiModelPricing,
} from "@/actions/profile";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai/models-client";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Save, Loader2, Cpu, FileCode, CalendarDays, Tag, BarChart2, Search, Sparkles, BookOpen, Trash2 } from "lucide-react";

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
    fetch("/api/ai/usage/stats")
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

  const saveProviderSettings = () => {
    setIsSavingProvider(true);
    void (async () => {
      try {
        await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
        showToast({ type: "success", message: "Intelligence preferences updated." });
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

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[#666] block">Intelligence Provider</label>
                <div className="flex gap-2">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const nextProvider = p as AIProvider;
                        const available = modelsForProvider(nextProvider);
                        setProvider(nextProvider);
                        if (available.length > 0 && !available.includes(defaultModel)) {
                          setDefaultModel(available[0]);
                        }
                      }}
                      className={`flex-1 h-8 rounded-md border transition-colors text-[13px] font-medium ${
                        provider === p
                          ? "bg-[#1f1f1f] border-[#1f1f1f] text-white"
                          : "bg-white border-[#d8d8d8] text-[#666] hover:bg-[#f8f8f8]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-[#666] block">Active Language Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {modelsForProvider(provider).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDefaultModel(m)}
                      className={`h-8 px-2.5 rounded-md border transition-colors text-[12px] font-medium ${
                        defaultModel === m
                          ? "bg-[#1f1f1f] border-[#1f1f1f] text-white"
                          : "bg-white border-[#d8d8d8] text-[#666] hover:bg-[#f8f8f8]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 rounded-md border border-[#e6e6e6] p-3">
                <label className="text-xs font-semibold text-[#555] block">Provider Catalog Management</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="model id (e.g. gemini-2.5-pro)"
                    className="h-8 rounded-md border border-[#d8d8d8] px-2 text-[12px] outline-none focus:border-[#bcbcbc]"
                    disabled={isSavingCatalog}
                  />
                  <input
                    value={newModelInputPerMillion}
                    onChange={(e) => setNewModelInputPerMillion(e.target.value)}
                    placeholder="input $ / 1M"
                    className="h-8 rounded-md border border-[#d8d8d8] px-2 text-[12px] outline-none focus:border-[#bcbcbc]"
                    disabled={isSavingCatalog}
                  />
                  <input
                    value={newModelOutputPerMillion}
                    onChange={(e) => setNewModelOutputPerMillion(e.target.value)}
                    placeholder="output $ / 1M"
                    className="h-8 rounded-md border border-[#d8d8d8] px-2 text-[12px] outline-none focus:border-[#bcbcbc]"
                    disabled={isSavingCatalog}
                  />
                </div>
                <div className="flex items-center gap-2">
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
                <div className="max-h-28 overflow-y-auto rounded border border-[#efefef]">
                  {modelsForProvider(provider).length === 0 ? (
                    <p className="text-[12px] text-[#888] p-2">No active models for this provider.</p>
                  ) : (
                    <div className="divide-y divide-[#f2f2f2]">
                      {modelsForProvider(provider).map((m) => (
                        <div key={m} className="flex items-center justify-between px-2 py-1.5 text-[12px]">
                          <span className="font-mono text-[#444]">{m}</span>
                          <button
                            onClick={() => handleDeleteModelFromCatalog(m)}
                            disabled={isSavingCatalog}
                            className="inline-flex items-center gap-1 rounded border border-[#ebd0d0] px-1.5 py-0.5 text-[#9d3b3b] hover:bg-[#fff5f5] disabled:opacity-50"
                            aria-label={`Delete model ${m}`}
                            title={`Delete model ${m}`}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-md border border-[#e5e5e5] hover:bg-[#fafafa] transition-colors">
                  <input
                    type="checkbox"
                    checked={webSearchEnabled}
                    onChange={(e) => setWebSearchEnabled(e.target.checked)}
                    disabled={isSavingProvider}
                    className="w-4 h-4 rounded border-gray-300 text-[#1f1f1f] focus:ring-[#1f1f1f] transition-all"
                  />
                  <div>
                    <span className="block text-[13px] font-medium text-[#222]">Web Grounding</span>
                    <span className="text-xs text-[#777]">Real-time data synthesis enabled.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-[#fafafa] rounded-md p-4 border border-[#e5e5e5] flex flex-col justify-center">
              <p className="text-xs text-[#666] leading-relaxed">
                &quot;System Preferences define the core execution parameters for all synthesized responses. Choosing a specific provider alters the latency and grounding capabilities of the intelligence layer.&quot;
              </p>
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
