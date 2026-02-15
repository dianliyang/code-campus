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
    <div className={`flex items-center gap-2 text-xs font-medium ${currentStatus.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
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
        setStatus({ type: "success", message: "Preferences saved successfully", panel: "provider" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to save", panel: "provider" });
      }
    });
  };

  const saveDescriptionPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ descriptionPromptTemplate: promptTemplate });
        setStatus({ type: "success", message: "Template saved successfully", panel: "description" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to save", panel: "description" });
      }
    });
  };

  const saveStudyPlanPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ studyPlanPromptTemplate });
        setStatus({ type: "success", message: "Template saved successfully", panel: "studyplan" });
      } catch (error) {
        setStatus({ type: "error", message: error instanceof Error ? error.message : "Failed to save", panel: "studyplan" });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex gap-6 border-b border-gray-100 overflow-x-auto no-scrollbar">
        {[
          { id: "provider" as PanelId, label: "Configuration" },
          { id: "description" as PanelId, label: "Course Metadata" },
          { id: "studyplan" as PanelId, label: "Study Planner" }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`pb-3 text-sm font-medium transition-all relative whitespace-nowrap ${
              activePanel === item.id 
                ? "text-gray-900" 
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {item.label}
            {activePanel === item.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 animate-in fade-in duration-300"></div>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activePanel === "provider" && (
          <div className="space-y-10 max-w-xl">
            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-900">Intelligence Provider</label>
              <div className="grid grid-cols-2 gap-3">
                {AI_PROVIDERS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setProvider(p as "gemini" | "perplexity");
                      setDefaultModel(p === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0]);
                    }}
                    className={`px-4 py-2.5 rounded-md border text-xs font-medium transition-all ${
                      provider === p 
                        ? "border-gray-900 bg-gray-900 text-white" 
                        : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-gray-900">Default Model</label>
              <div className="flex flex-wrap gap-2">
                {(provider === "gemini" ? GEMINI_MODELS : PERPLEXITY_MODELS).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDefaultModel(m)}
                    className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                      defaultModel === m
                        ? "bg-gray-100 border-gray-400 text-gray-900"
                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={webSearchEnabled}
                  onChange={(e) => setWebSearchEnabled(e.target.checked)}
                  disabled={isPending}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 transition-all"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900">Web Search Grounding</span>
                  <span className="text-xs text-gray-500">Allow AI to access real-time information from the web.</span>
                </div>
              </label>
            </div>

            <div className="pt-6 flex flex-col gap-4 border-t border-gray-100">
              <button
                onClick={saveProviderSettings}
                disabled={isPending}
                className="w-fit inline-flex items-center justify-center px-5 py-2 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all disabled:opacity-50 h-9"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                Save Preferences
              </button>
              <StatusMessage panel="provider" currentStatus={status} />
            </div>
          </div>
        )}

        {activePanel === "description" && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900">Instruction Template</label>
              <button
                onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
                className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
              >
                Reset to default
              </button>
            </div>

            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              className="w-full h-[350px] bg-white border border-gray-200 rounded-lg p-4 text-xs font-mono leading-relaxed focus:border-gray-400 outline-none transition-all resize-none text-gray-600"
              placeholder="System instructions..."
              disabled={isPending}
            />

            <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={saveDescriptionPrompt}
                disabled={isPending}
                className="w-fit inline-flex items-center justify-center px-5 py-2 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all disabled:opacity-50 h-9"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                Save Template
              </button>
              <StatusMessage panel="description" currentStatus={status} />
            </div>
          </div>
        )}

        {activePanel === "studyplan" && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-900">Scheduling Logic</label>
              <button
                onClick={() => setStudyPlanPromptTemplate(DEFAULT_STUDY_PLAN_PROMPT)}
                className="text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors"
              >
                Reset to default
              </button>
            </div>

            <textarea
              value={studyPlanPromptTemplate}
              onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
              className="w-full h-[350px] bg-white border border-gray-200 rounded-lg p-4 text-xs font-mono leading-relaxed focus:border-gray-400 outline-none transition-all resize-none text-gray-600"
              placeholder="System instructions..."
              disabled={isPending}
            />

            <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={saveStudyPlanPrompt}
                disabled={isPending}
                className="w-fit inline-flex items-center justify-center px-5 py-2 rounded-md bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all disabled:opacity-50 h-9"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                Save Template
              </button>
              <StatusMessage panel="studyplan" currentStatus={status} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
