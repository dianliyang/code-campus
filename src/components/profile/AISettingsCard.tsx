"use client";

import { useEffect, useState } from "react";
import { updateAiPreferences, updateAiPromptTemplates } from "@/actions/profile";
import { AI_PROVIDERS } from "@/lib/ai/models-client";
import { Save, CheckCircle2, AlertCircle, Loader2, RefreshCcw, Cpu, FileCode, CalendarDays, Tag, BarChart2, Search } from "lucide-react";

type AISectionId = "engine" | "metadata" | "scheduling" | "topics" | "course-update" | "usage";

interface AISettingsCardProps {
  section: AISectionId;
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  initialPromptTemplate: string;
  initialStudyPlanPromptTemplate: string;
  initialTopicsPromptTemplate: string;
  initialCourseUpdatePromptTemplate: string;
  modelCatalog: { perplexity: string[]; gemini: string[] };
  defaultPrompts: {
    description: string;
    studyPlan: string;
    topics: string;
    courseUpdate: string;
  };
}

interface Status {
  type: "idle" | "success" | "error";
  message?: string;
  panel?: string;
}

type PlannerResponseRow = {
  id: number;
  feature: string;
  provider: string | null;
  model: string | null;
  prompt: string | null;
  response_text: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  created_at: string;
};

const StatusDisplay = ({ panel, status }: { panel: string; status: Status }) => {
  if (status.panel !== panel || status.type === "idle") return null;
  return (
    <div className={`rounded-md border px-3 py-2 text-xs font-medium flex items-center gap-2 ${
      status.type === "success"
        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
        : "bg-red-50 border-red-100 text-red-700"
    } animate-in fade-in duration-300`}>
      {status.type === "success" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {status.message}
    </div>
  );
};

export default function AISettingsCard({
  section,
  initialProvider,
  initialModel,
  initialWebSearchEnabled,
  initialPromptTemplate,
  initialStudyPlanPromptTemplate,
  initialTopicsPromptTemplate,
  initialCourseUpdatePromptTemplate,
  modelCatalog,
  defaultPrompts,
}: AISettingsCardProps) {
  const perplexityModels = modelCatalog.perplexity || [];
  const geminiModels = modelCatalog.gemini || [];
  const [provider, setProvider] = useState(initialProvider === "gemini" ? "gemini" : "perplexity");
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [promptTemplate, setPromptTemplate] = useState(initialPromptTemplate || defaultPrompts.description);
  const [studyPlanPromptTemplate, setStudyPlanPromptTemplate] = useState(initialStudyPlanPromptTemplate || defaultPrompts.studyPlan);
  const [topicsPromptTemplate, setTopicsPromptTemplate] = useState(initialTopicsPromptTemplate || defaultPrompts.topics);
  const [courseUpdatePromptTemplate, setCourseUpdatePromptTemplate] = useState(initialCourseUpdatePromptTemplate || defaultPrompts.courseUpdate);

  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isSavingStudyPlan, setIsSavingStudyPlan] = useState(false);
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [isSavingCourseUpdate, setIsSavingCourseUpdate] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const [plannerResponses, setPlannerResponses] = useState<PlannerResponseRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(true);

  useEffect(() => {
    if (section !== "usage") return;
    setUsageLoading(true);
    fetch("/api/ai/planner/responses/recent")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && Array.isArray(d.items)) setPlannerResponses(d.items);
      })
      .catch(() => {})
      .finally(() => setUsageLoading(false));
  }, [section]);

  const clearStatus = () => setStatus({ type: "idle" });

  const saveProviderSettings = () => {
    clearStatus();
    setIsSavingProvider(true);
    void (async () => {
      try {
        await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
        setStatus({ type: "success", message: "Intelligence preferences updated.", panel: "provider" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "provider" });
      } finally {
        setIsSavingProvider(false);
      }
    })();
  };

  const saveDescriptionPrompt = () => {
    clearStatus();
    setIsSavingDescription(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ descriptionPromptTemplate: promptTemplate });
        setStatus({ type: "success", message: "Metadata instructions updated.", panel: "description" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "description" });
      } finally {
        setIsSavingDescription(false);
      }
    })();
  };

  const saveStudyPlanPrompt = () => {
    clearStatus();
    setIsSavingStudyPlan(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ studyPlanPromptTemplate });
        setStatus({ type: "success", message: "Scheduling logic updated.", panel: "studyplan" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "studyplan" });
      } finally {
        setIsSavingStudyPlan(false);
      }
    })();
  };

  const saveTopicsPrompt = () => {
    clearStatus();
    setIsSavingTopics(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ topicsPromptTemplate });
        setStatus({ type: "success", message: "Topic classification logic updated.", panel: "topics" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "topics" });
      } finally {
        setIsSavingTopics(false);
      }
    })();
  };

  const saveCourseUpdatePrompt = () => {
    clearStatus();
    setIsSavingCourseUpdate(true);
    void (async () => {
      try {
        await updateAiPromptTemplates({ courseUpdatePromptTemplate });
        setStatus({ type: "success", message: "Course update search logic updated.", panel: "course-update" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "course-update" });
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
                        setProvider(p as "gemini" | "perplexity");
                        setDefaultModel(p === "gemini" ? (geminiModels[0] || "") : (perplexityModels[0] || ""));
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
                          ? "bg-[#efefef] border-[#cfcfcf] text-[#222]"
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
          <StatusDisplay panel="provider" status={status} />
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
            <StatusDisplay panel="description" status={status} />
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
            <StatusDisplay panel="studyplan" status={status} />
          </div>
        </div>
      </div>

      {/* 4. Topic Classification Logic */}
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
            <StatusDisplay panel="topics" status={status} />
          </div>
        </div>
      </div>

      {/* 5. Course Update Search Logic */}
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
            <StatusDisplay panel="course-update" status={status} />
          </div>
        </div>
      </div>

      {/* 6. Usage Statistics */}
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
          ) : plannerResponses.length === 0 ? (
            <p className="text-[11px] text-[#aaa] text-center py-4">No AI planner responses tracked yet.</p>
          ) : (
            <div className="space-y-2">
              {plannerResponses.map((row) => (
                <div key={row.id} className="rounded-md border border-[#ececec] p-3">
                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#777]">
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                    <span>{row.provider || "unknown"}/{row.model || "unknown"}</span>
                  </div>
                  <div className="mt-2 text-[12px] text-[#333]">
                    <p className="font-medium text-[#1f1f1f] mb-1">Prompt</p>
                    <p className="line-clamp-3 whitespace-pre-wrap">{row.prompt || "-"}</p>
                  </div>
                  <div className="mt-2 text-[12px] text-[#333]">
                    <p className="font-medium text-[#1f1f1f] mb-1">Response</p>
                    <p className="line-clamp-4 whitespace-pre-wrap">{row.response_text || "-"}</p>
                  </div>
                  <div className="mt-2 text-[11px] text-[#777] flex items-center gap-3">
                    <span>in: {row.tokens_input ?? 0}</span>
                    <span>out: {row.tokens_output ?? 0}</span>
                    <span>cost: ${(Number(row.cost_usd || 0)).toFixed(6)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
