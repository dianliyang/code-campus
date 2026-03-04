"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai/models-client";
import { updateAiPreferences } from "@/actions/profile";
import { useAppToast } from "@/components/common/AppToastProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

export default function EngineSettingsPanel({
  initialProvider,
  initialModel,
  initialWebSearchEnabled,
  modelCatalog,
}: EngineSettingsPanelProps) {
  const [provider, setProvider] = useState<AIProvider>(normalizeProvider(initialProvider));
  const [defaultModel, setDefaultModel] = useState(initialModel);
  const [webSearchEnabled, setWebSearchEnabled] = useState(initialWebSearchEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useAppToast();

  const availableModels = useMemo(() => {
    if (provider === "gemini") return modelCatalog.gemini;
    if (provider === "openai") return modelCatalog.openai;
    return modelCatalog.perplexity;
  }, [provider, modelCatalog]);

  useEffect(() => {
    if (!availableModels.includes(defaultModel) && availableModels.length > 0) {
      setDefaultModel(availableModels[0]);
    }
  }, [availableModels, defaultModel]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await updateAiPreferences({ provider, defaultModel, webSearchEnabled });
      showToast({ type: "success", message: "Engine settings updated." });
    } catch (error) {
      showToast({ type: "error", message: error instanceof Error ? error.message : "Update failed." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Provider</h4>
        <div className="flex flex-wrap gap-2">
          {AI_PROVIDERS.map((p) => (
            <Button key={p} variant="outline" type="button" onClick={() => setProvider(p as AIProvider)}>
              <span className="capitalize">{p}</span>
              {provider === p ? <Badge variant="secondary">Active</Badge> : null}
            </Button>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Default Model</h4>
        <Select value={defaultModel || undefined} onValueChange={setDefaultModel}>
          <SelectTrigger>
            <SelectValue placeholder="Select a model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <Separator />

      <section className="space-y-2">
        <h4 className="text-sm font-semibold">Retrieval</h4>
        <label className="inline-flex items-start gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={webSearchEnabled}
            onCheckedChange={(checked) => setWebSearchEnabled(checked === true)}
            disabled={isSaving}
          />
          <span>
            Enable web grounding for retrieval before syllabus parsing.
          </span>
        </label>
      </section>

      <div className="flex justify-end">
        <Button variant="outline" type="button" onClick={saveSettings} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : null}
          Save Engine
        </Button>
      </div>
    </div>
  );
}
