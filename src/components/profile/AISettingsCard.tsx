"use client";

import { useState, useEffect } from "react";
import { updateAiPreferences, updateAiPromptTemplates } from "@/actions/profile";
import { AI_PROVIDERS, GEMINI_MODELS, PERPLEXITY_MODELS } from "@/lib/ai/models";
import { DEFAULT_COURSE_DESCRIPTION_PROMPT, DEFAULT_STUDY_PLAN_PROMPT, DEFAULT_TOPICS_PROMPT } from "@/lib/ai/prompts";
import { 
  Save, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Cpu,
  FileCode,
  CalendarDays,
  Tag,
  BarChart2,
  Trash2
} from "lucide-react";

interface AISettingsCardProps {
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  initialPromptTemplate: string;
  initialStudyPlanPromptTemplate: string;
  initialTopicsPromptTemplate: string;
}

interface Status {
  type: "idle" | "success" | "error";
  message?: string;
  panel?: string;
}

const StatusDisplay = ({ panel, status }: { panel: string; status: Status }) => {
  if (status.panel !== panel || status.type === "idle") return null;
  return (
    <div className={`mt-3 rounded-md border px-3 py-2 text-xs font-medium flex items-center gap-2 ${
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
  initialProvider,
  initialModel,
  initialWebSearchEnabled,
  initialPromptTemplate,
  initialStudyPlanPromptTemplate,
  initialTopicsPromptTemplate,
}: AISettingsCardProps) {
  const [provider, setProvider] = useState(initialProvider === "gemini" ? "gemini" : "perplexity");
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [promptTemplate, setPromptTemplate] = useState(initialPromptTemplate || DEFAULT_COURSE_DESCRIPTION_PROMPT);
  const [studyPlanPromptTemplate, setStudyPlanPromptTemplate] = useState(initialStudyPlanPromptTemplate || DEFAULT_STUDY_PLAN_PROMPT);
  const [topicsPromptTemplate, setTopicsPromptTemplate] = useState(initialTopicsPromptTemplate || DEFAULT_TOPICS_PROMPT);
  
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isSavingStudyPlan, setIsSavingStudyPlan] = useState(false);
  const [isSavingTopics, setIsSavingTopics] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [aiUsage, setAiUsage] = useState({ calls: 0, tokens: 0 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cc_ai_usage");
      if (stored) setAiUsage(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const clearAiUsage = () => {
    localStorage.removeItem("cc_ai_usage");
    setAiUsage({ calls: 0, tokens: 0 });
  };

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

  return (
    <div className="space-y-4">
      {/* 1. Provider Configuration */}
      <div className="bg-white border border-[#e5e5e5] rounded-md p-4">
        <div className="flex items-center gap-2 text-[#222] mb-4 pb-3 border-b border-[#efefef]">
          <Cpu className="w-4 h-4 text-[#777]" />
          <span className="text-sm font-semibold">Engine Configuration</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#666] block">Intelligence Provider</label>
              <div className="flex gap-2">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProvider(p as "gemini" | "perplexity");
                      setDefaultModel(p === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0]);
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
                {(provider === "gemini" ? GEMINI_MODELS : PERPLEXITY_MODELS).map((m) => (
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

            <div className="pt-2">
              <button
                onClick={saveProviderSettings}
                disabled={isSavingProvider}
                className="w-full h-8 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {isSavingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sync Engine
              </button>
              <StatusDisplay panel="provider" status={status} />
            </div>
          </div>

          <div className="bg-[#fafafa] rounded-md p-4 border border-[#e5e5e5] flex flex-col justify-center">
            <p className="text-xs text-[#666] leading-relaxed">
              &quot;System Preferences define the core execution parameters for all synthesized responses. Choosing a specific provider alters the latency and grounding capabilities of the intelligence layer.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* 2. Metadata Instruction Set */}
      <div className="bg-white border border-[#e5e5e5] rounded-md p-4">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef]">
          <div className="flex items-center gap-2 text-[#222]">
            <FileCode className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Metadata Logic</span>
          </div>
          <button
            onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            className="w-full h-40 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
            placeholder="ENTER_INSTRUCTION_SET..."
            disabled={isSavingDescription}
          />

          <div className="flex flex-col gap-4">
            <button
              onClick={saveDescriptionPrompt}
              disabled={isSavingDescription}
              className="w-full h-8 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isSavingDescription ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Push Metadata Logic
            </button>
            <StatusDisplay panel="description" status={status} />
          </div>
        </div>
      </div>

      {/* 3. Scheduling Instruction Set */}
      <div className="bg-white border border-[#e5e5e5] rounded-md p-4">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef]">
          <div className="flex items-center gap-2 text-[#222]">
            <CalendarDays className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Scheduling Logic</span>
          </div>
          <button
            onClick={() => setStudyPlanPromptTemplate(DEFAULT_STUDY_PLAN_PROMPT)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            value={studyPlanPromptTemplate}
            onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
            className="w-full h-40 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
            placeholder="ENTER_INSTRUCTION_SET..."
            disabled={isSavingStudyPlan}
          />

          <div className="flex flex-col gap-4">
            <button
              onClick={saveStudyPlanPrompt}
              disabled={isSavingStudyPlan}
              className="w-full h-8 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isSavingStudyPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Push Schedule Logic
            </button>
            <StatusDisplay panel="studyplan" status={status} />
          </div>
        </div>
      </div>

      {/* 4. Topic Classification Logic */}
      <div className="bg-white border border-[#e5e5e5] rounded-md p-4">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef]">
          <div className="flex items-center gap-2 text-[#222]">
            <Tag className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Topic Classification Logic</span>
          </div>
          <button
            onClick={() => setTopicsPromptTemplate(DEFAULT_TOPICS_PROMPT)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="space-y-3">
          <textarea
            value={topicsPromptTemplate}
            onChange={(e) => setTopicsPromptTemplate(e.target.value)}
            className="w-full h-40 rounded-md border border-[#d8d8d8] bg-white p-3 text-[13px] leading-relaxed text-[#333] outline-none transition-colors focus:border-[#bcbcbc] resize-none"
            placeholder="ENTER_INSTRUCTION_SET..."
            disabled={isSavingTopics}
          />

          <div className="flex flex-col gap-4">
            <button
              onClick={saveTopicsPrompt}
              disabled={isSavingTopics}
              className="w-full h-8 rounded-md border border-[#d3d3d3] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f8f8f8] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isSavingTopics ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Push Topic Logic
            </button>
            <StatusDisplay panel="topics" status={status} />
          </div>
        </div>
      </div>

      {/* 5. Usage Statistics */}
      <div className="bg-white border border-[#e5e5e5] rounded-md p-4">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#efefef]">
          <div className="flex items-center gap-2 text-[#222]">
            <BarChart2 className="w-4 h-4 text-[#777]" />
            <span className="text-sm font-semibold">Usage Statistics</span>
          </div>
          <button
            onClick={clearAiUsage}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#d3d3d3] bg-white px-2.5 text-[13px] font-medium text-[#3b3b3b] hover:bg-[#f8f8f8] transition-colors"
            title="Clear usage stats"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
        <div className="rounded-md bg-[#fafafa] border border-[#f0f0f0] p-3">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Requests</p>
              <p className="text-lg font-bold text-gray-800">{aiUsage.calls.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tokens</p>
              <p className="text-lg font-bold text-gray-800">{aiUsage.tokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Est. Cost</p>
              <p className="text-lg font-bold text-gray-800">${(aiUsage.tokens * 0.000001).toFixed(4)}</p>
            </div>
          </div>
          {aiUsage.calls === 0 && (
            <p className="text-[10px] text-gray-400 mt-2 text-center">No AI calls tracked yet. Stats accumulate as you use AI features.</p>
          )}
        </div>
      </div>
    </div>
  );
}
