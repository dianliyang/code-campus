"use client";

import { useEffect, useState } from "react";
import { updateAiPreferences, updateAiPromptTemplates } from "@/actions/profile";
import { AI_PROVIDERS } from "@/lib/ai/models-client";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Save, Loader2, RefreshCcw, Cpu, FileCode, CalendarDays, Tag, BarChart2, Search, Sparkles, BookOpen } from "lucide-react";

type AISectionId = "engine" | "metadata" | "scheduling" | "study-planner" | "topics" | "course-update" | "syllabus-retrieve" | "usage";

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
  modelCatalog: { perplexity: string[]; gemini: string[] };
  defaultPrompts: {
    description: string;
    studyPlan: string;
    planner: string;
    topics: string;
    courseUpdate: string;
    syllabusRetrieve: string;
  };
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
  modelCatalog,
  defaultPrompts,
}: AISettingsCardProps) {
  const perplexityModels = modelCatalog.perplexity;
  const geminiModels = modelCatalog.gemini;
  const [provider, setProvider] = useState(initialProvider === "gemini" ? "gemini" : "perplexity");
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [promptTemplate, setPromptTemplate] = useState(initialPromptTemplate || defaultPrompts.description);
  const [studyPlanPromptTemplate, setStudyPlanPromptTemplate] = useState(initialStudyPlanPromptTemplate || defaultPrompts.studyPlan);
  const [plannerPromptTemplate, setPlannerPromptTemplate] = useState(initialPlannerPromptTemplate || defaultPrompts.planner);
  const [topicsPromptTemplate, setTopicsPromptTemplate] = useState(initialTopicsPromptTemplate || defaultPrompts.topics);
  const [courseUpdatePromptTemplate, setCourseUpdatePromptTemplate] = useState(initialCourseUpdatePromptTemplate || defaultPrompts.courseUpdate);
  const [syllabusPromptTemplate, setSyllabusPromptTemplate] = useState(initialSyllabusPromptTemplate || defaultPrompts.syllabusRetrieve);

  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isSavingStudyPlan, setIsSavingStudyPlan] = useState(false);
  const [isSavingPlanner, setIsSavingPlanner] = useState(false);
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [isSavingCourseUpdate, setIsSavingCourseUpdate] = useState(false);
  const [isSavingSyllabus, setIsSavingSyllabus] = useState(false);
  const { showToast } = useAppToast();

  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    const available = provider === "gemini" ? geminiModels : perplexityModels;
    if (available.length === 0) return;
    if (!available.includes(defaultModel)) {
      setDefaultModel(available[0]);
    }
  }, [provider, defaultModel, geminiModels, perplexityModels]);

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
                        const nextProvider = p as "gemini" | "perplexity";
                        const available = nextProvider === "gemini" ? geminiModels : perplexityModels;
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
                  {(provider === "gemini" ? geminiModels : perplexityModels).map((m) => (
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
                onClick={() => setPromptTemplate(defaultPrompts.description)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset
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
                onClick={() => setStudyPlanPromptTemplate(defaultPrompts.studyPlan)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset
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
                onClick={() => setPlannerPromptTemplate(defaultPrompts.planner)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset
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
                onClick={() => setTopicsPromptTemplate(defaultPrompts.topics)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset
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
                onClick={() => setCourseUpdatePromptTemplate(defaultPrompts.courseUpdate)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset
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
                onClick={() => setSyllabusPromptTemplate(defaultPrompts.syllabusRetrieve)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
              >
                <RefreshCcw className="w-3 h-3" />
                Reset
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
      <div className={section === "usage" ? "h-full flex flex-col overflow-y-auto" : "hidden"}>
        <div className="bg-white border border-[#e5e5e5] rounded-md p-4">
          <div className="flex items-center gap-2 text-[#222] mb-4 pb-3 border-b border-[#efefef]">
            <BarChart2 className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Usage Statistics</span>
          </div>

          {usageLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-[#aaa]" />
            </div>
          ) : !usageStats || usageStats.totals.requests === 0 ? (
            <p className="text-[11px] text-[#aaa] text-center py-4">No AI calls tracked yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="rounded-md bg-[#fafafa] border border-[#f0f0f0] p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[9px] font-bold text-[#aaa] uppercase tracking-widest mb-1">Requests</p>
                  <p className="text-lg font-bold text-[#1f1f1f]">{usageStats.totals.requests.toLocaleString()}</p>
                  <p className="text-[10px] text-[#aaa]">{usageStats.recentTotals.requests} this week</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#aaa] uppercase tracking-widest mb-1">Input Tokens</p>
                  <p className="text-lg font-bold text-[#1f1f1f]">{usageStats.totals.tokens_input.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#aaa] uppercase tracking-widest mb-1">Output Tokens</p>
                  <p className="text-lg font-bold text-[#1f1f1f]">{usageStats.totals.tokens_output.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-[#aaa] uppercase tracking-widest mb-1">Total Cost</p>
                  <p className="text-lg font-bold text-[#1f1f1f]">${usageStats.totals.cost_usd.toFixed(4)}</p>
                  <p className="text-[10px] text-[#aaa]">${usageStats.recentTotals.cost_usd.toFixed(4)} this week</p>
                </div>
              </div>

              {usageStats.daily && <UsageBarChart daily={usageStats.daily} />}

              {usageStats.recentResponses.length > 0 && (
                <div className="rounded-md border border-[#f0f0f0] overflow-hidden">
                  <div className="px-3 py-2 bg-[#fafafa] border-b border-[#f0f0f0]">
                    <p className="text-[10px] font-semibold text-[#888] uppercase tracking-widest">Recent AI Responses (10)</p>
                  </div>
                  <div className="divide-y divide-[#f5f5f5]">
                    {usageStats.recentResponses.map((item) => (
                      <div key={item.id} className="px-3 py-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] text-[#444] truncate">
                            {(() => {
                              const featureLabel = FEATURE_LABELS[item.feature] ?? item.feature;
                              const preset = (item.preset || "").trim();
                              const isDuplicatePreset = preset.length > 0 && preset.toLowerCase() === featureLabel.toLowerCase();
                              return isDuplicatePreset ? featureLabel : `${featureLabel}${preset ? ` · ${preset}` : ""}`;
                            })()}
                          </p>
                          <p className="text-[11px] text-[#999] truncate">
                            {item.provider || "-"} / {item.model || "-"} · in {item.tokens_input} · out {item.tokens_output}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-medium text-[#555]">${Number(item.cost_usd || 0).toFixed(4)}</p>
                          <p className="text-[10px] text-[#999]">{new Date(item.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(usageStats.byFeature).length > 0 && (
                <div className="rounded-md border border-[#f0f0f0] overflow-hidden">
                  <div className="px-3 py-2 bg-[#fafafa] border-b border-[#f0f0f0]">
                    <p className="text-[10px] font-semibold text-[#888] uppercase tracking-widest">By Feature</p>
                  </div>
                  <div className="divide-y divide-[#f5f5f5]">
                    {Object.entries(usageStats.byFeature)
                      .sort((a, b) => b[1].requests - a[1].requests)
                      .map(([feature, stat]) => (
                        <div key={feature} className="px-3 py-2 flex items-center justify-between">
                          <span className="text-[13px] text-[#444]">{FEATURE_LABELS[feature] ?? feature}</span>
                          <div className="flex items-center gap-4 text-right">
                            <span className="text-[11px] text-[#888]">{stat.requests} req</span>
                            <span className="text-[11px] font-medium text-[#555] w-16">${stat.cost_usd.toFixed(4)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {Object.keys(usageStats.byModel).length > 0 && (
                <div className="rounded-md border border-[#f0f0f0] overflow-hidden">
                  <div className="px-3 py-2 bg-[#fafafa] border-b border-[#f0f0f0]">
                    <p className="text-[10px] font-semibold text-[#888] uppercase tracking-widest">By Model</p>
                  </div>
                  <div className="divide-y divide-[#f5f5f5]">
                    {Object.entries(usageStats.byModel)
                      .sort((a, b) => b[1].requests - a[1].requests)
                      .map(([model, stat]) => (
                        <div key={model} className="px-3 py-2 flex items-center justify-between">
                          <span className="text-[13px] font-mono text-[#444]">{model}</span>
                          <div className="flex items-center gap-4 text-right">
                            <span className="text-[11px] text-[#888]">{stat.requests} req</span>
                            <span className="text-[11px] font-medium text-[#555] w-16">${stat.cost_usd.toFixed(4)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
