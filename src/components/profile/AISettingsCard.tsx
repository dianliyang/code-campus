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
    <div className={`mt-4 p-3 border font-mono text-[10px] leading-tight ${
      status.type === "success" 
        ? "bg-gray-50 border-gray-900 text-gray-900" 
        : "bg-red-50 border-red-200 text-red-800"
    } animate-in fade-in duration-300`}>
      <div className="flex items-start gap-3">
        {status.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        <span>{status.message}</span>
      </div>
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
        setStatus({ type: "success", message: "Intelligence configuration updated.", panel: "provider" });
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
        setStatus({ type: "success", message: "Metadata instruction set updated.", panel: "description" });
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
        setStatus({ type: "success", message: "Scheduling logic instruction set updated.", panel: "studyplan" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Update failed.", panel: "studyplan" });
      }
    });
  };

  return (
    <div className="space-y-24">
      {/* 1. Provider Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-gray-900 mb-2">
            <Cpu className="w-5 h-5" />
            <span className="text-sm font-bold italic uppercase tracking-tighter">CORE_ENGINE_CONFIG</span>
          </div>
          
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Intelligence Provider</label>
            <div className="flex gap-2">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setProvider(p as "gemini" | "perplexity");
                    setDefaultModel(p === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0]);
                  }}
                  className={`flex-1 h-11 px-4 border-2 transition-all text-xs font-bold uppercase tracking-widest ${
                    provider === p 
                      ? "bg-black border-black text-white" 
                      : "bg-white border-gray-200 text-gray-400 hover:border-gray-900 hover:text-gray-900"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Active Language Model</label>
            <div className="grid grid-cols-2 gap-2">
              {(provider === "gemini" ? GEMINI_MODELS : PERPLEXITY_MODELS).map((m) => (
                <button
                  key={m}
                  onClick={() => setDefaultModel(m)}
                  className={`h-10 px-3 border transition-all text-[10px] font-bold font-mono ${
                    defaultModel === m
                      ? "bg-gray-100 border-black text-black"
                      : "bg-white border-gray-200 text-gray-400 hover:border-gray-400"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-4 cursor-pointer group p-4 border border-dashed border-gray-200 hover:border-black transition-colors">
              <input
                type="checkbox"
                checked={webSearchEnabled}
                onChange={(e) => setWebSearchEnabled(e.target.checked)}
                disabled={isPending}
                className="w-4 h-4 rounded-none border-2 border-black text-black focus:ring-0"
              />
              <div>
                <span className="block text-xs font-bold uppercase tracking-tighter text-gray-900">WEB_GROUNDING_PROTOCOL</span>
                <span className="text-[10px] text-gray-400 font-mono">Allow the engine to synthesize real-time data from external networks.</span>
              </div>
            </label>
          </div>

          <div className="pt-4">
            <button
              onClick={saveProviderSettings}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 h-12 bg-black text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Save className="w-4 h-4" />}
              Save_Configuration
            </button>
            <StatusDisplay panel="provider" status={status} />
          </div>
        </div>

        <div className="hidden md:flex flex-col justify-center border-l border-gray-100 pl-12">
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed uppercase">
            System Preferences define the core execution parameters for all synthesized responses. Choosing a specific provider alters the latency and grounding capabilities of the intelligence layer.
          </p>
        </div>
      </div>

      {/* 2. Metadata Instruction Set */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3 text-gray-900">
            <FileCode className="w-5 h-5" />
            <span className="text-sm font-bold italic uppercase tracking-tighter">COURSE_METADATA_INSTRUCTIONS</span>
          </div>
          <button
            onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            RESET_TO_DEFAULT
          </button>
        </div>

        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          className="w-full h-64 bg-gray-50 border-2 border-black p-6 text-[11px] font-mono leading-relaxed focus:bg-white outline-none transition-all resize-none text-gray-700"
          style={{ borderRadius: 0 }}
          placeholder="ENTER_INSTRUCTION_SET..."
          disabled={isPending}
        />

        <div className="flex flex-col items-start gap-4">
          <button
            onClick={saveDescriptionPrompt}
            disabled={isPending}
            className="flex items-center justify-center gap-3 h-11 bg-black text-white px-8 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update_Instruction_Set
          </button>
          <StatusDisplay panel="description" status={status} />
        </div>
      </div>

      {/* 3. Scheduling Instruction Set */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-3 text-gray-900">
            <CalendarDays className="w-5 h-5" />
            <span className="text-sm font-bold italic uppercase tracking-tighter">SCHEDULING_LOGIC_PROMPT</span>
          </div>
          <button
            onClick={() => setStudyPlanPromptTemplate(DEFAULT_STUDY_PLAN_PROMPT)}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            <RefreshCcw className="w-3 h-3" />
            RESET_TO_DEFAULT
          </button>
        </div>

        <textarea
          value={studyPlanPromptTemplate}
          onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
          className="w-full h-64 bg-gray-50 border-2 border-black p-6 text-[11px] font-mono leading-relaxed focus:bg-white outline-none transition-all resize-none text-gray-700"
          style={{ borderRadius: 0 }}
          placeholder="ENTER_INSTRUCTION_SET..."
          disabled={isPending}
        />

        <div className="flex flex-col items-start gap-4">
          <button
            onClick={saveStudyPlanPrompt}
            disabled={isPending}
            className="flex items-center justify-center gap-3 h-11 bg-black text-white px-8 text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update_Logic_Set
          </button>
          <StatusDisplay panel="studyplan" status={status} />
        </div>
      </div>
    </div>
  );
}
