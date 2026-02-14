"use client";

import { useState, useTransition } from "react";
import { updateAiPreferences, updateAiPromptTemplates } from "@/actions/profile";
import { AI_PROVIDERS, GEMINI_MODELS, PERPLEXITY_MODELS } from "@/lib/ai/models";
import { DEFAULT_COURSE_DESCRIPTION_PROMPT, DEFAULT_STUDY_PLAN_PROMPT } from "@/lib/ai/prompts";
import { 
  Bot, 
  Cpu, 
  Search, 
  FileText, 
  Calendar, 
  Save, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle
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
    <section id="settings" className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
      <div className="flex flex-col md:flex-row min-h-[450px]">
        {/* Sidebar Nav - Horizontal on Mobile, Vertical on Desktop */}
        <aside className="w-full md:w-64 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-100 p-3 md:p-5">
          <div className="mb-4 hidden md:block">
            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-3">Engine Config</h3>
          </div>
          
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible no-scrollbar pb-2 md:pb-0">
            {[
              { id: "provider" as PanelId, label: "Intelligence", icon: Bot, desc: "Provider & Model" },
              { id: "description" as PanelId, label: "Synthesizer", icon: FileText, desc: "Course Context" },
              { id: "studyplan" as PanelId, label: "Scheduler", icon: Calendar, desc: "Path Generation" }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                className={`flex-shrink-0 md:w-full flex items-center md:items-start gap-3 md:gap-3 px-3 py-2.5 md:py-3 rounded-xl md:rounded-xl transition-all duration-200 ${
                  activePanel === item.id 
                    ? "bg-white border border-gray-100 text-brand-blue" 
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon className={`w-4 h-4 md:w-4 md:h-4 ${activePanel === item.id ? "text-brand-blue" : "text-gray-400"}`} />
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-tight leading-none mb-1">{item.label}</span>
                  <span className="hidden md:block text-[9px] font-medium opacity-60 leading-none">{item.desc}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="hidden md:block mt-auto pt-8 px-2">
            <div className="p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/10">
              <Sparkles className="w-3.5 h-3.5 text-brand-blue mb-1.5" />
              <p className="text-[9px] font-bold text-brand-blue leading-relaxed uppercase tracking-wider">
                Optimized for Sonar.
              </p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-grow p-6 md:p-8 bg-white">
          {activePanel === "provider" && (
            <div className="max-w-xl space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <header>
                <h2 className="text-xl font-black text-gray-900 tracking-tight mb-1">Core Intelligence</h2>
                <p className="text-xs text-gray-500">Select your preferred AI orchestrator and processing model.</p>
              </header>

              <div className="space-y-6">
                {/* Visual Provider Selection */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Bot className="w-3 h-3" /> Compute Provider
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {AI_PROVIDERS.map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          setProvider(p as "gemini" | "perplexity");
                          setDefaultModel(p === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0]);
                        }}
                        className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                          provider === p 
                            ? "border-brand-blue bg-brand-blue/5 text-brand-blue" 
                            : "border-gray-100 bg-white text-gray-400 hover:border-gray-200"
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-tighter">{p}</span>
                        {provider === p && (
                          <div className="absolute top-1.5 right-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Model Selection */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Cpu className="w-3 h-3" /> Logic Model
                  </label>
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

                <div className="p-0.5 rounded-xl border border-gray-100 bg-gray-50/50">
                  <label className="flex items-center justify-between p-3 cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-brand-blue transition-colors">
                        <Search className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-black text-gray-900 leading-none mb-1 uppercase tracking-tight">Active Grounding</span>
                        <span className="text-[9px] font-medium text-gray-400">Real-time course synthesis</span>
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

              <footer className="pt-4 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={saveProviderSettings}
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                >
                  {isPending ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Commit Changes
                </button>
                <StatusMessage panel="provider" currentStatus={status} />
              </footer>
            </div>
          )}

          {activePanel === "description" && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <header className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight mb-1">Synthesizer Protocol</h2>
                    <p className="text-xs text-gray-500">Extract and map course metadata logic.</p>
                  </div>
                  <button
                    onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </header>

              <div className="flex-grow space-y-4">
                <div className="relative group flex-grow">
                  <textarea
                    value={promptTemplate}
                    onChange={(e) => setPromptTemplate(e.target.value)}
                    className="w-full h-[280px] bg-gray-900 text-blue-100/80 border-none rounded-xl p-5 text-[11px] font-mono leading-relaxed focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all resize-none"
                    placeholder="Initialize prompt instructions..."
                    disabled={isPending}
                  />
                  <div className="absolute top-3 right-3 flex gap-1.5">
                    {["title", "course_code"].map(tag => (
                      <span key={tag} className="text-[7px] font-black uppercase tracking-tighter bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.5 rounded">{"{{" + tag + "}}"}</span>
                    ))}
                  </div>
                </div>
              </div>

              <footer className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={saveDescriptionPrompt}
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                >
                  {isPending ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Protocol
                </button>
                <StatusMessage panel="description" currentStatus={status} />
              </footer>
            </div>
          )}

          {activePanel === "studyplan" && (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <header className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight mb-1">Path Generation</h2>
                    <p className="text-xs text-gray-500">AI sequencing and scheduling logic.</p>
                  </div>
                  <button
                    onClick={() => setStudyPlanPromptTemplate(DEFAULT_STUDY_PLAN_PROMPT)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </header>

              <div className="flex-grow space-y-4">
                <div className="relative group flex-grow">
                  <textarea
                    value={studyPlanPromptTemplate}
                    onChange={(e) => setStudyPlanPromptTemplate(e.target.value)}
                    className="w-full h-[280px] bg-gray-900 text-green-100/80 border-none rounded-xl p-5 text-[11px] font-mono leading-relaxed focus:ring-4 focus:ring-brand-blue/10 outline-none transition-all resize-none"
                    placeholder="Initialize study plan logic..."
                    disabled={isPending}
                  />
                  <div className="absolute top-3 right-3">
                    <span className="text-[7px] font-black uppercase tracking-tighter bg-white/5 border border-white/10 text-white/40 px-1.5 py-0.5 rounded">{"{{schedule_lines}}"}</span>
                  </div>
                </div>
              </div>

              <footer className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-4">
                <button
                  onClick={saveStudyPlanPrompt}
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                >
                  {isPending ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Logic
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
