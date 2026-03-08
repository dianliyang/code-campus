"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Globe, Sparkles, X } from "lucide-react";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai/models-client";
import { updateAiPreferences } from "@/actions/identity";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import ServiceHealthStatus from "./ServiceHealthStatus";

interface EngineSettingsPanelProps {
  initialProvider: string;
  initialModel: string;
  initialWebSearchEnabled: boolean;
  modelCatalog: {
    perplexity: string[];
    gemini: string[];
    openai: string[];
    vertex?: string[];
  };
}

function normalizeProvider(value: string): AIProvider {
  if (value === "gemini") return "gemini";
  if (value === "openai") return "openai";
  return "perplexity";
}

function pickPreferredModel(models: string[], keywords: string[]) {
  const lowered = models.map((m) => ({ original: m, lower: m.toLowerCase() }));
  for (const keyword of keywords) {
    const found = lowered.find((entry) => entry.lower.includes(keyword));
    if (found) return found.original;
  }
  return models[0] ?? "";
}

function providerLabel(value: AIProvider) {
  if (value === "openai") return "OpenAI";
  if (value === "gemini") return "Gemini";
  return "Perplexity";
}

function providerIconPath(value: AIProvider) {
  if (value === "openai") return "/brands/openai-combine.svg";
  if (value === "gemini") return "/brands/gemini-combine.svg";
  return "/brands/perplexity-combine.svg";
}

function providerIconClass(value: AIProvider) {
  void value;
  return "h-4 w-auto max-w-full";
}

function providerSummaryIconPath(value: AIProvider) {
  if (value === "openai") return "/brands/openai.svg";
  if (value === "gemini") return "/brands/gemini.svg";
  return "/brands/perplexity.svg";
}

function providerSummaryIconClass(value: AIProvider) {
  if (value === "openai") return "size-4";
  if (value === "gemini") return "size-4";
  return "size-4";
}

export default function EngineSettingsPanel({
  initialProvider,
  initialModel,
  initialWebSearchEnabled,
  modelCatalog,
}: EngineSettingsPanelProps) {
  const [provider, setProvider] = useState<AIProvider>(normalizeProvider(initialProvider));
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [removedModels, setRemovedModels] = useState<Record<AIProvider, string[]>>({
    perplexity: [],
    gemini: [],
    openai: [],
  });
  const [customModels, setCustomModels] = useState<Record<AIProvider, string[]>>({
    perplexity: [],
    gemini: [],
    openai: [],
  });
  const [modelDraft, setModelDraft] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const { showToast } = useAppToast();
  const isFirstSyncRef = useRef(true);
  const saveSeqRef = useRef(0);

  const providerCatalogModels = useMemo(() => {
    return provider === "gemini"
      ? modelCatalog.gemini
      : provider === "openai"
        ? modelCatalog.openai
        : modelCatalog.perplexity;
  }, [provider, modelCatalog]);

  const availableModels = useMemo(() => {
    const source = [...providerCatalogModels, ...(customModels[provider] || [])];
    const uniqueSource = Array.from(new Set(source));
    const removed = new Set(removedModels[provider] || []);
    return uniqueSource.filter((model) => !removed.has(model));
  }, [provider, providerCatalogModels, customModels, removedModels]);

  const modelPickerOptions = useMemo(() => {
    const ordered = [...availableModels, ...(removedModels[provider] || [])];
    return Array.from(new Set(ordered));
  }, [availableModels, removedModels, provider]);

  const saveStatusLabel = useMemo(() => {
    if (saveState === "saving") return "Saving...";
    if (saveState === "saved") return lastSavedAt ? `Saved ${lastSavedAt.toLocaleTimeString()}` : "Saved";
    if (saveState === "error") return "Save failed";
    return "Ready";
  }, [saveState, lastSavedAt]);

  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }

    const saveId = ++saveSeqRef.current;

    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
        if (saveSeqRef.current !== saveId) return;
        setSaveState("saved");
        setLastSavedAt(new Date());
      } catch (error) {
        if (saveSeqRef.current !== saveId) return;
        setSaveState("error");
        showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
      }
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [provider, defaultModel, webSearchEnabled, showToast]);

  const saveNow = async () => {
    const saveId = ++saveSeqRef.current;
    setSaveState("saving");
    try {
      await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
      if (saveSeqRef.current !== saveId) return;
      setSaveState("saved");
      setLastSavedAt(new Date());
    } catch (error) {
      if (saveSeqRef.current !== saveId) return;
      setSaveState("error");
      showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
    }
  };

  const applyPreset = (mode: "balanced" | "fast" | "quality") => {
    if (mode === "balanced") {
      setProvider("perplexity");
      setDefaultModel(pickPreferredModel(modelCatalog.perplexity, ["sonar", "pro", "small"]));
      setWebSearchEnabled(true);
      return;
    }
    if (mode === "fast") {
      setProvider("openai");
      setDefaultModel(pickPreferredModel(modelCatalog.openai, ["mini", "nano", "4o-mini"]));
      setWebSearchEnabled(false);
      return;
    }
    setProvider("gemini");
    setDefaultModel(pickPreferredModel(modelCatalog.gemini, ["pro", "2.0", "1.5"]));
    setWebSearchEnabled(true);
  };

  const removeModel = (model: string) => {
    setRemovedModels((prev) => ({
      ...prev,
      [provider]: [...prev[provider], model],
    }));
    if (defaultModel === model) {
      const next = availableModels.filter((m) => m !== model)[0] || "";
      setDefaultModel(next);
    }
  };

  const addModel = (rawModel: string) => {
    const model = rawModel.trim();
    if (!model) return;

    if (!providerCatalogModels.includes(model)) {
      setCustomModels((prev) => ({
        ...prev,
        [provider]: Array.from(new Set([...prev[provider], model])),
      }));
    }

    setRemovedModels((prev) => ({
      ...prev,
      [provider]: prev[provider].filter((m) => m !== model),
    }));

    setDefaultModel(model);
    setModelDraft("");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Image
                src={providerSummaryIconPath(provider)}
                alt={`${providerLabel(provider)} icon`}
                className={providerSummaryIconClass(provider)}
                width={20}
                height={20}
              />
              <span className="text-xs">Active Provider</span>
            </div>
            <p className="mt-2 text-base font-semibold">{providerLabel(provider)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="size-4" />
              <span className="text-xs">Default Model</span>
            </div>
            <p className="mt-2 text-base font-semibold truncate">{defaultModel || "Not selected"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="size-4" />
              <span className="text-xs">Web Grounding</span>
            </div>
            <p className="mt-2 text-base font-semibold">{webSearchEnabled ? "Enabled" : "Disabled"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader>
            <CardTitle>Control Surface</CardTitle>
            <CardDescription>Provider, model, and retrieval policy. Changes autosave.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold tracking-tight">Provider</h4>
                <p className="text-sm text-muted-foreground">Choose the primary AI service.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {AI_PROVIDERS.map((p) => (
                  <Toggle
                    key={p}
                    variant="outline"
                    className="w-full data-[state=on]:border-2 data-[state=on]:border-black data-[state=on]:bg-transparent data-[state=on]:text-foreground"
                    pressed={provider === p}
                    onPressedChange={(pressed) => {
                      if (pressed) setProvider(p as AIProvider);
                    }}
                    aria-label={providerLabel(p as AIProvider)}
                    title={providerLabel(p as AIProvider)}
                  >
                    <Image
                      src={providerIconPath(p as AIProvider)}
                      alt=""
                      className={providerIconClass(p as AIProvider)}
                      width={120}
                      height={24}
                    />
                  </Toggle>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold tracking-tight">Default Model</h4>
                <p className="text-sm text-muted-foreground">Models are filtered by selected provider.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Combobox
                  multiple
                  items={[{ value: "Models", items: modelPickerOptions }]}
                  value={availableModels}
                  inputValue={modelDraft}
                  onInputValueChange={(value) => setModelDraft(value)}
                  onValueChange={(next) => {
                    if (!Array.isArray(next)) return;
                    const nextValues = next.map((value) => String(value));
                    const added = nextValues.filter((value) => !availableModels.includes(value));
                    if (added.length === 0) return;
                    addModel(added[added.length - 1]);
                  }}
                >
                  <ComboboxInput placeholder="Search or type model" className="h-8 w-full min-w-56" />
                  <ComboboxContent>
                    <ComboboxEmpty>No models found.</ComboboxEmpty>
                    <ComboboxList>
                      {(group) => (
                        <ComboboxGroup key={group.value} items={group.items}>
                          <ComboboxCollection>
                            {(item) => (
                              <ComboboxItem key={item} value={item}>
                                {item}
                              </ComboboxItem>
                            )}
                          </ComboboxCollection>
                        </ComboboxGroup>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {availableModels.map((model) => (
                  <ButtonGroup
                    key={model}
                    className={defaultModel === model ? "rounded-md border-2 border-black" : undefined}
                  >
                    <Toggle
                      size="sm"
                      variant="outline"
                      className="font-medium data-[state=on]:bg-transparent data-[state=on]:text-foreground"
                      pressed={defaultModel === model}
                      onPressedChange={(pressed) => {
                        if (pressed) setDefaultModel(model);
                      }}
                    >
                      {model}
                    </Toggle>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      type="button"
                      aria-label={`Remove ${model}`}
                      onClick={() => removeModel(model)}
                    >
                      <X className="size-4" />
                    </Button>
                  </ButtonGroup>
                ))}
                {availableModels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No models available.</p>
                ) : null}
              </div>
            </section>

            <section className="space-y-3">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold tracking-tight">Retrieval Policy</h4>
                <p className="text-sm text-muted-foreground">Control whether web context is included before parsing.</p>
              </div>
              <label className="flex w-full items-start gap-3 rounded-md border p-3">
                <Checkbox
                  id="retrieval-policy-grounding"
                  name="retrieval-policy-grounding"
                  checked={webSearchEnabled}
                  onCheckedChange={(checked) => setWebSearchEnabled(checked === true)}
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">Enable web grounding</p>
                  <p className="text-sm text-muted-foreground">
                    Include web-grounded context before parsing.
                  </p>
                </div>
              </label>
            </section>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Presets</CardTitle>
              <CardDescription>Apply a tuned profile in one click.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button className="w-full" variant="outline" type="button" onClick={() => applyPreset("balanced")}>
                Balanced
              </Button>
              <Button className="w-full" variant="outline" type="button" onClick={() => applyPreset("fast")}>
                Fast Draft
              </Button>
              <Button className="w-full" variant="outline" type="button" onClick={() => applyPreset("quality")}>
                High Quality
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>Save & Health</span>
                <span className="text-xs font-normal text-muted-foreground">{saveStatusLabel}</span>
              </CardTitle>
              <CardDescription>Live status for configuration persistence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Persistence Info</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>Provider</span>
                    <span className="font-medium text-foreground">{providerLabel(provider)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Model</span>
                    <span className="font-medium text-foreground truncate max-w-[120px]">{defaultModel || "Not selected"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Grounding</span>
                    <span className="font-medium text-foreground">{webSearchEnabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">Service Availability</p>
                <ServiceHealthStatus />
              </div>

              {saveState === "error" ? (
                <Button variant="outline" className="w-full mt-2" type="button" onClick={saveNow}>
                  Retry Save
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
