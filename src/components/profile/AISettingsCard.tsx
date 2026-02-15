"use client";

import { useState, useTransition } from "react";
import { updateAiPreferences, updateAiPromptTemplates } from "@/actions/profile";
import { AI_PROVIDERS, GEMINI_MODELS, PERPLEXITY_MODELS } from "@/lib/ai/models";
import { DEFAULT_COURSE_DESCRIPTION_PROMPT, DEFAULT_STUDY_PLAN_PROMPT } from "@/lib/ai/prompts";
import { 
  Save, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Cpu,
  FileCode,
  CalendarDays
} from "lucide-react";

interface AISettingsCardProps {
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  initialPromptTemplate: string;
  initialStudyPlanPromptTemplate: string;
}

interface Status {
  type: "idle" | "success" | "error";
  message?: string;
  panel?: string;
}

const StatusDisplay = ({ panel, status }: { panel: string; status: Status }) => {
  if (status.panel !== panel || status.type === "idle") return null;
  return (
    <div className={`mt-4 p-3 rounded-lg border text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 ${
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
}: AISettingsCardProps) {
  const [provider, setProvider] = useState(initialProvider === "gemini" ? "gemini" : "perplexity");
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [promptTemplate, setPromptTemplate] = useState(initialPromptTemplate);
  const [studyPlanPromptTemplate, setStudyPlanPromptTemplate] = useState(initialStudyPlanPromptTemplate);
  
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>({ type: "idle" });

  const clearStatus = () => setStatus({ type: "idle" });

  const saveProviderSettings = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
        setStatus({ type: "success", message: "Intelligence preferences updated.", panel: "provider" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "provider" });
      }
    });
  };

  const saveDescriptionPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ descriptionPromptTemplate: promptTemplate });
        setStatus({ type: "success", message: "Metadata instructions updated.", panel: "description" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "description" });
      }
    });
  };

  const saveStudyPlanPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ studyPlanPromptTemplate });
        setStatus({ type: "success", message: "Scheduling logic updated.", panel: "studyplan" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "studyplan" });
      }
    });
  };

  return (
    <div className="space-y-12">
      {/* 1. Provider Configuration */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 text-gray-900 mb-8 pb-4 border-b border-gray-50">
          <Cpu className="w-5 h-5 text-brand-blue" />
          <span className="text-sm font-bold tracking-tight uppercase tracking-[0.1em]">Engine Configuration</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Intelligence Provider</label>
              <div className="flex gap-2">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProvider(p as "gemini" | "perplexity");
                      setDefaultModel(p === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0]);
                    }}
                    className={`flex-1 h-10 rounded-lg border-2 transition-all text-[11px] font-black uppercase tracking-widest ${
                      provider === p 
                        ? "bg-gray-900 border-gray-900 text-white" 
                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Active Language Model</label>
              <div className="grid grid-cols-2 gap-2">
                {(provider === "gemini" ? GEMINI_MODELS : PERPLEXITY_MODELS).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDefaultModel(m)}
                    className={`h-9 px-3 rounded-lg border transition-all text-[10px] font-black uppercase tracking-tighter ${
                      defaultModel === m
                        ? "bg-gray-50 border-gray-900 text-gray-900"
                        : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-4 cursor-pointer group p-4 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all">
                <input
                  type="checkbox"
                  checked={webSearchEnabled}
                  onChange={(e) => setWebSearchEnabled(e.target.checked)}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue transition-all"
                />
                <div>
                  <span className="block text-[11px] font-black text-gray-900 uppercase tracking-widest">Web Grounding</span>
                  <span className="text-[10px] text-gray-400 font-medium">Real-time data synthesis enabled.</span>
                </div>
              </label>
            </div>

            <div className="pt-4">
              <button
                onClick={saveProviderSettings}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl bg-brand-blue text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sync Engine
              </button>
              <StatusDisplay panel="provider" status={status} />
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col justify-center">
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium italic">
              &quot;System Preferences define the core execution parameters for all synthesized responses. Choosing a specific provider alters the latency and grounding capabilities of the intelligence layer.&quot;
            </p>
          </div>
        </div>
      </div>

      {/* 2. Metadata Instruction Set */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3 text-gray-900">
            <FileCode className="w-5 h-5 text-brand-blue" />
            <span className="text-sm font-bold tracking-tight uppercase tracking-[0.1em]">Metadata Logic</span>
          </div>
          <button
            onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
            className="flex items-center gap-2 text-[9px] font-black text-gray-400 hover:text-brand-blue transition-colors uppercase tracking-[0.2em]"
          >
            <RefreshCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="space-y-6">
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            className="w-full h-48 bg-gray-50 border border-gray-100 rounded-xl p-6 text-[12px] font-mono leading-relaxed focus:bg-white focus:border-brand-blue/30 outline-none transition-all resize-none text-gray-600"
            placeholder="ENTER_INSTRUCTION_SET..."
            disabled={isPending}
          />

          <div className="flex flex-col items-start gap-4">
            <button
              onClick={saveDescriptionPrompt}
              disabled={isPending}
              className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-gray-900 text-white px-8 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Push Metadata Logic
            </button>
            <StatusDisplay panel="description" status={status} />
          </div>
        </div>
      </div>

      {/* 3. Scheduling Instruction Set */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3 text-gray-900">
            <CalendarDays className="w-5 h-5 text-brand-blue" />
            <span className="text-sm font-bold tracking-tight uppercase tracking-[0.1em]">Scheduling Logic</span>
          </div>
          <button
            onClick={() => setStudyPlanPromptTemplate(DEFAULT_STUDY_PLAN_PROMPT)}
            className="flex items-center gap-2 text-[9px] font-black text-gray-400 hover:text-brand-blue transition-colors uppercase tracking-[0.2em]"
          >
            <RefreshCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        <div className="space-y-6">
          <textarea
            value={studyPlanPromptTemplate}
            onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
            className="w-full h-48 bg-gray-50 border border-gray-100 rounded-xl p-6 text-[12px] font-mono leading-relaxed focus:bg-white focus:border-brand-blue/30 outline-none transition-all resize-none text-gray-600"
            placeholder="ENTER_INSTRUCTION_SET..."
            disabled={isPending}
          />

          <div className="flex flex-col items-start gap-4">
            <button
              onClick={saveStudyPlanPrompt}
              disabled={isPending}
              className="flex items-center justify-center gap-2.5 h-11 rounded-xl bg-gray-900 text-white px-8 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Push Schedule Logic
            </button>
            <StatusDisplay panel="studyplan" status={status} />
          </div>
        </div>
      </div>
    </div>
  );
}
