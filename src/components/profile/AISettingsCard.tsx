"use client";

import { useState, useTransition } from "react";
import { updateAiPreferences, updateAiPromptTemplates } from "@/actions/profile";
import { AI_PROVIDERS, GEMINI_MODELS, PERPLEXITY_MODELS } from "@/lib/ai/models";
import { DEFAULT_COURSE_DESCRIPTION_PROMPT, DEFAULT_STUDY_PLAN_PROMPT } from "@/lib/ai/prompts";
import { 
  Bot, 
  Search, 
  FileText, 
  Calendar, 
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
    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${currentStatus.type === "success" ? "text-green-600" : "text-red-600"}`}>
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
        setStatus({ type: "success", message: "Provider settings updated.", panel: "provider" });
      } catch {
        setStatus({ type: "error", message: "Failed to save settings.", panel: "provider" });
      }
    });
  };

  const saveDescriptionPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ descriptionPromptTemplate: promptTemplate });
        setStatus({ type: "success", message: "Description prompt saved.", panel: "description" });
      } catch {
        setStatus({ type: "error", message: "Failed to save template.", panel: "description" });
      }
    });
  };

  const saveStudyPlanPrompt = () => {
    clearStatus();
    startTransition(async () => {
      try {
        await updateAiPromptTemplates({ studyPlanPromptTemplate });
        setStatus({ type: "success", message: "Study plan prompt saved.", panel: "studyplan" });
      } catch {
        setStatus({ type: "error", message: "Failed to save template.", panel: "studyplan" });
      }
    });
  };

  return (
    <section id="settings" className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex flex-col md:flex-row min-h-[400px]">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-56 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-100 p-2 md:p-4">
          <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: "provider" as PanelId, label: "AI Model", icon: Bot },
              { id: "description" as PanelId, label: "Description", icon: FileText },
              { id: "studyplan" as PanelId, label: "Study Plan", icon: Calendar }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={`flex-shrink-0 md:w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all ${
                  activePanel === item.id 
                    ? "bg-white shadow-sm border border-gray-200 text-brand-blue" 
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <item.icon className={`w-4 h-4 ${activePanel === item.id ? "text-brand-blue" : "text-gray-400"}`} />
                <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-grow p-6 md:p-10 bg-white">
          {activePanel === "provider" && (
            <div className="max-w-lg space-y-8 animate-in fade-in duration-300">
              <header>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Compute Configuration</h2>
                <p className="text-xs text-gray-400">Manage your AI processing provider and model preferences.</p>
              </header>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Provider</label>
                  <div className="grid grid-cols-2 gap-3">
                    {AI_PROVIDERS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setProvider(p as "gemini" | "perplexity");
                          setDefaultModel(p === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0]);
                        }}
                        className={`p-4 rounded-xl border text-center transition-all ${
                          provider === p 
                            ? "border-brand-blue bg-blue-50/30 text-brand-blue" 
                            : "border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-tight">{p}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Model</label>
                  <div className="flex flex-wrap gap-2">
                    {(provider === "gemini" ? GEMINI_MODELS : PERPLEXITY_MODELS).map((m) => (
                      <button
                        key={m}
                        onClick={() => setDefaultModel(m)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                          defaultModel === m
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="py-4 border-t border-gray-50">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-brand-blue transition-colors">
                        <Search className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-gray-900 uppercase tracking-tight">Web Grounding</span>
                        <span className="text-[10px] text-gray-400">Enable real-time data fetching</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={webSearchEnabled}
                      onChange={(e) => setWebSearchEnabled(e.target.checked)}
                      disabled={isPending}
                      className="w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/20"
                    />
                  </label>
                </div>
              </div>

              <footer className="pt-6 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={saveProviderSettings}
                  disabled={isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
                <StatusMessage panel="provider" currentStatus={status} />
              </footer>
            </div>
          )}

          {activePanel === "description" && (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
              <header className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Synthesizer</h2>
                  <p className="text-xs text-gray-400">Map course metadata instructions.</p>
                </div>
                <button
                  onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
                  className="text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Reset Template
                </button>
              </header>

              <div className="flex-grow">
                <textarea
                  value={promptTemplate}
                  onChange={(e) => setPromptTemplate(e.target.value)}
                  className="w-full h-[250px] bg-gray-50 border border-gray-200 rounded-xl p-4 text-[11px] font-mono leading-relaxed focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all resize-none"
                  placeholder="Enter prompt..."
                  disabled={isPending}
                />
              </div>

              <footer className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={saveDescriptionPrompt}
                  disabled={isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
                <StatusMessage panel="description" currentStatus={status} />
              </footer>
            </div>
          )}

          {activePanel === "studyplan" && (
            <div className="h-full flex flex-col animate-in fade-in duration-300">
              <header className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1">Study Planner</h2>
                  <p className="text-xs text-gray-400">Configure scheduling logic.</p>
                </div>
                <button
                  onClick={() => setStudyPlanPromptTemplate(DEFAULT_STUDY_PLAN_PROMPT)}
                  className="text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                >
                  Reset Template
                </button>
              </header>

              <div className="flex-grow">
                <textarea
                  value={studyPlanPromptTemplate}
                  onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
                  className="w-full h-[250px] bg-gray-50 border border-gray-200 rounded-xl p-4 text-[11px] font-mono leading-relaxed focus:ring-2 focus:ring-brand-blue/10 outline-none transition-all resize-none"
                  placeholder="Enter prompt..."
                  disabled={isPending}
                />
              </div>

              <footer className="mt-6 pt-6 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={saveStudyPlanPrompt}
                  disabled={isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gray-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
                <StatusMessage panel="studyplan" currentStatus={status} />
              </footer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
