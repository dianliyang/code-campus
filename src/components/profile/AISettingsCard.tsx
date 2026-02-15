"use client";

import { useState, useTransition } from "react";
import { updateAiPreferences, updateAiPromptTemplates } from "@/actions/profile";
import { AI_PROVIDERS, GEMINI_MODELS, PERPLEXITY_MODELS } from "@/lib/ai/models";
import { DEFAULT_COURSE_DESCRIPTION_PROMPT, DEFAULT_STUDY_PLAN_PROMPT } from "@/lib/ai/prompts";
import { 
  Save, 
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";

interface AISettingsCardProps {
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  initialPromptTemplate: string;
  initialStudyPlanPromptTemplate: string;
}

type PanelId = "provider" | "description" | "studyplan";

function StatusMessage({ 
  panel, 
  currentStatus 
}: { 
  panel: PanelId; 
  currentStatus: { type: "idle" | "success" | "error"; message?: string; panel?: string } 
}) {
  if (currentStatus.panel !== panel || currentStatus.type === "idle") return null;
  return (
    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${currentStatus.type === "success" ? "text-brand-green" : "text-red-600"}`}>
      {currentStatus.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      {currentStatus.message}
    </div>
  );
}

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
  const [activePanel, setActivePanel] = useState<PanelId>("provider");
  
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string; panel?: string }>({ type: "idle" });

  const clearStatus = () => setStatus({ type: "idle" });

  const saveProviderSettings = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
        setStatus({ type: "success", message: "STATE_UPDATED", panel: "provider" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "ERR_SAVE", panel: "provider" });
      }
    });
  };

  const saveDescriptionPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ descriptionPromptTemplate: promptTemplate });
        setStatus({ type: "success", message: "STATE_UPDATED", panel: "description" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "ERR_SAVE", panel: "description" });
      }
    });
  };

  const saveStudyPlanPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ studyPlanPromptTemplate });
        setStatus({ type: "success", message: "STATE_UPDATED", panel: "studyplan" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "ERR_SAVE", panel: "studyplan" });
      }
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex gap-8 border-b border-gray-100 overflow-x-auto no-scrollbar">
        {[
          { id: "provider" as PanelId, label: "CORE_COMPUTE" },
          { id: "description" as PanelId, label: "SYNTH_LOGIC" },
          { id: "studyplan" as PanelId, label: "PATH_GEN" }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${
              activePanel === item.id 
                ? "text-gray-900" 
                : "text-gray-300 hover:text-gray-500"
            }`}
          >
            {item.label}
            {activePanel === item.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-950 animate-in fade-in duration-300"></div>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[450px]">
        {activePanel === "provider" && (
          <div className="space-y-12 max-w-xl">
            <div className="space-y-6">
              <div className="space-y-4">
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] italic">01_COMPUTE_PROVIDER</span>
                <div className="grid grid-cols-2 gap-4">
                  {AI_PROVIDERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setProvider(p as "gemini" | "perplexity");
                        setDefaultModel(p === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0]);
                      }}
                      className={`px-6 py-4 rounded-none border-2 transition-all text-[11px] font-black uppercase tracking-[0.2em] ${
                        provider === p 
                          ? "border-gray-950 bg-gray-950 text-white" 
                          : "border-gray-100 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] italic">02_LOGIC_MODEL</span>
                <div className="flex flex-wrap gap-2">
                  {(provider === "gemini" ? GEMINI_MODELS : PERPLEXITY_MODELS).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDefaultModel(m)}
                      className={`px-4 py-2 rounded-none text-[10px] font-black tracking-widest transition-all border ${
                        defaultModel === m
                          ? "bg-gray-100 border-gray-950 text-gray-950"
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-4 cursor-pointer group w-fit">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={webSearchEnabled}
                      onChange={(e) => setWebSearchEnabled(e.target.checked)}
                      disabled={isPending}
                      className="w-5 h-5 rounded-none border-2 border-gray-200 text-gray-950 focus:ring-0 transition-all cursor-pointer"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">WEB_GROUNDING_PROTOCOL</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Synchronize with real-time academic vectors</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="pt-12 flex flex-col gap-6">
              <button
                onClick={saveProviderSettings}
                disabled={isPending}
                className="w-fit inline-flex items-center justify-center px-8 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-blue transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-4 h-4 mr-3" />}
                EXECUTE_COMMIT
              </button>
              <StatusMessage panel="provider" currentStatus={status} />
            </div>
          </div>
        )}

        {activePanel === "description" && (
          <div className="space-y-10 max-w-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] italic">EXTRACTION_INSTRUCTIONS</span>
              <button
                onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
                className="text-[8px] font-black text-gray-400 hover:text-gray-950 uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
              >
                RESTORE_SYSTEM_DEFAULTS
              </button>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-blue/40 to-transparent"></div>
              <textarea
                value={promptTemplate}
                onChange={(e) => setPromptTemplate(e.target.value)}
                className="w-full h-[400px] bg-gray-50 border-x border-b border-gray-100 p-6 text-[11px] font-mono leading-relaxed focus:bg-white focus:border-gray-200 outline-none transition-all resize-none text-gray-600"
                placeholder="Initialize instruction set..."
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-6">
              <button
                onClick={saveDescriptionPrompt}
                disabled={isPending}
                className="w-fit inline-flex items-center justify-center px-8 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-blue transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-4 h-4 mr-3" />}
                SAVE_PROTOCOL
              </button>
              <StatusMessage panel="description" currentStatus={status} />
            </div>
          </div>
        )}

        {activePanel === "studyplan" && (
          <div className="space-y-10 max-w-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.3em] italic">GENERATION_LOGIC</span>
              <button
                onClick={() => setStudyPlanPromptTemplate(DEFAULT_STUDY_PLAN_PROMPT)}
                className="text-[8px] font-black text-gray-400 hover:text-gray-950 uppercase tracking-[0.2em] transition-colors flex items-center gap-2"
              >
                RESTORE_SYSTEM_DEFAULTS
              </button>
            </div>

            <div className="relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-green/40 to-transparent"></div>
              <textarea
                value={studyPlanPromptTemplate}
                onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
                className="w-full h-[400px] bg-gray-50 border-x border-b border-gray-100 p-6 text-[11px] font-mono leading-relaxed focus:bg-white focus:border-gray-200 outline-none transition-all resize-none text-gray-600"
                placeholder="Initialize logic sequence..."
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-6">
              <button
                onClick={saveStudyPlanPrompt}
                disabled={isPending}
                className="w-fit inline-flex items-center justify-center px-8 py-4 bg-gray-950 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-brand-blue transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <Save className="w-4 h-4 mr-3" />}
                SAVE_PROTOCOL
              </button>
              <StatusMessage panel="studyplan" currentStatus={status} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
