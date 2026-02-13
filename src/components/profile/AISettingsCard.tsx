"use client";

import { useState, useTransition } from "react";
import { updateAiPreferences } from "@/actions/profile";
import { AI_PROVIDERS, GEMINI_MODELS, PERPLEXITY_MODELS } from "@/lib/ai/models";
import { DEFAULT_COURSE_DESCRIPTION_PROMPT } from "@/lib/ai/prompts";

interface AISettingsCardProps {
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  initialPromptTemplate: string;
}

export default function AISettingsCard({
  initialProvider,
  initialModel,
  initialWebSearchEnabled,
  initialPromptTemplate,
}: AISettingsCardProps) {
  const [provider, setProvider] = useState(
    initialProvider === "gemini" ? "gemini" : "perplexity",
  );
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [promptTemplate, setPromptTemplate] = useState(initialPromptTemplate);
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setMessage("");
    startTransition(async () => {
      try {
        await updateAiPreferences({ provider, defaultModel, webSearchEnabled, promptTemplate });
        setMessage("Saved.");
      } catch (error) {
        console.error(error);
        setMessage(error instanceof Error ? error.message : "Failed to save.");
      }
    });
  };

  return (
    <section id="settings" className="border border-gray-100 rounded-2xl p-6 bg-gray-50/50">
      <h3 className="text-sm font-black text-gray-800 uppercase tracking-[0.2em] mb-5">AI Settings</h3>
      <div className="space-y-5">
        <label className="block">
          <span className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Provider</span>
          <select
            value={provider}
            onChange={(e) => {
              const nextProvider = e.target.value === "gemini" ? "gemini" : "perplexity";
              setProvider(nextProvider);
              const firstModel = nextProvider === "gemini" ? GEMINI_MODELS[0] : PERPLEXITY_MODELS[0];
              setDefaultModel(firstModel);
            }}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
            disabled={isPending}
          >
            {AI_PROVIDERS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Default model</span>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
            disabled={isPending}
          >
            {(provider === "gemini" ? GEMINI_MODELS : PERPLEXITY_MODELS).map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
          <span className="text-sm font-medium text-gray-800">Enable web search for AI generation</span>
          <input
            type="checkbox"
            checked={webSearchEnabled}
            onChange={(e) => setWebSearchEnabled(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Prompt template</span>
          <textarea
            value={promptTemplate}
            onChange={(e) => setPromptTemplate(e.target.value)}
            rows={10}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder={"Use placeholders like {{title}}, {{course_code}}, {{university}}, {{level}}, {{prerequisites}}, {{corequisites}}, {{description}}"}
            disabled={isPending}
          />
          <p className="mt-2 text-xs text-gray-500">
            Leave empty to use the built-in default prompt.
          </p>
        </label>

        <div className="block">
          <div className="flex items-center justify-between mb-2">
            <span className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Default prompt</span>
            <button
              type="button"
              onClick={() => setPromptTemplate(DEFAULT_COURSE_DESCRIPTION_PROMPT)}
              disabled={isPending}
              className="text-xs font-bold uppercase tracking-wider text-brand-blue disabled:opacity-50"
            >
              Use default
            </button>
          </div>
          <pre className="w-full bg-gray-900 text-gray-100 border border-gray-800 rounded-lg px-3 py-3 text-xs overflow-auto whitespace-pre-wrap">
            {DEFAULT_COURSE_DESCRIPTION_PROMPT}
          </pre>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-blue text-white text-xs font-bold uppercase tracking-wider disabled:opacity-60"
          >
            {isPending ? "Saving..." : "Save settings"}
          </button>
          {message ? <span className="text-xs text-gray-600">{message}</span> : null}
        </div>
      </div>
    </section>
  );
}
