"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck, Trash2, WandSparkles, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { useCachedJsonResource } from "@/hooks/useCachedJsonResource";
import { updateAiApiKeys } from "@/actions/identity";

type ApiKeyItem = {
  id: number;
  name: string;
  keyPrefix: string | null;
  isActive: boolean;
  isReadOnly: boolean;
  requestsLimit: number | null;
  requestsUsed: number;
  lastUsedAt: string | null;
};

type DraftById = Record<number, { isActive: boolean; isReadOnly: boolean }>;

function toMaskedKey(prefix: string | null): string {
  if (!prefix) return "****";
  return `${prefix}_****`;
}

export default function ApiManagementCard() {
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [drafts, setDrafts] = useState<DraftById>({});
  const [isCreating, setIsCreating] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [shakingId, setShakingId] = useState<number | null>(null);
  const [latestKey, setLatestKey] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newReadOnly, setNewReadOnly] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const [aiKeys, setAiKeys] = useState({ openai: "", perplexity: "", gemini: "" });
  const [isUpdatingAi, setIsUpdatingAi] = useState(false);

  const apiKeysFetchInit = useMemo(() => ({ cache: "no-store" } as RequestInit), []);
  const { data: apiKeysData, loading: isLoading, refresh } = useCachedJsonResource<{ keys?: ApiKeyItem[] }>({
    cacheKey: "cc:cached-json:api-keys",
    url: "/api/settings/api-key",
    ttlMs: 60_000,
    init: apiKeysFetchInit,
  });

  useEffect(() => {
    const nextItems: ApiKeyItem[] = Array.isArray(apiKeysData?.keys) ? apiKeysData.keys : [];
    setItems(nextItems);
    const nextDrafts: DraftById = {};
    for (const item of nextItems) {
      nextDrafts[item.id] = {
        isActive: Boolean(item.isActive),
        isReadOnly: Boolean(item.isReadOnly),
      };
    }
    setDrafts(nextDrafts);
  }, [apiKeysData]);

  useEffect(() => {
    const updateViewport = () => setIsMobileViewport(window.innerWidth < 768);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const showSaved = (message: string) => {
    setSaved(message);
    setTimeout(() => setSaved(null), 1800);
  };

  const handleUpdateAiKeys = async (provider: 'openai' | 'perplexity' | 'gemini') => {
    const value = aiKeys[provider].trim();
    if (!value) return;
    setIsUpdatingAi(true);
    try {
      await updateAiApiKeys({ [provider]: value });
      setAiKeys(prev => ({ ...prev, [provider]: "" }));
      showSaved(`${provider.toUpperCase()} key updated.`);
    } catch {
      showSaved("Failed to update key.");
    } finally {
      setIsUpdatingAi(false);
    }
  };

  const triggerShake = (id: number) => {
    setShakingId(id);
    setTimeout(() => setShakingId(null), 400);
  };

  const parseLimit = (value: string): number | null => {
    if (!value.trim()) return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) {
      throw new Error("Limit must be an integer >= 1.");
    }
    return n;
  };

  const generateKey = async () => {
    if (!newName.trim()) {
      setNameError(true);
      return;
    }
    setIsCreating(true);
    setSaved(null);
    try {
      setNameError(false);
      const limit = parseLimit(newLimit);
      const response = await fetch("/api/settings/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          requestsLimit: limit,
          isReadOnly: newReadOnly,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to generate key");
      const key = String(payload?.key || "");
      setLatestKey(key);
      if (key) showSaved("New API key generated.");
      setNewName("");
      setNewLimit("");
      setNewReadOnly(false);
      await refresh().catch(() => null);
    } catch (error) {
      showSaved(error instanceof Error ? error.message : "Failed to generate key.");
    } finally {
      setIsCreating(false);
    }
  };

  const persistRow = async (id: number, draftOverride?: { isActive: boolean; isReadOnly: boolean }) => {
    const draft = draftOverride ?? drafts[id];
    if (!draft) return;
    setWorkingId(id);
    setSaved(null);
    try {
      const response = await fetch("/api/settings/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: draft.isActive, isReadOnly: draft.isReadOnly }),
      });
      if (!response.ok) throw new Error("Failed to save");
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, isActive: draft.isActive, isReadOnly: draft.isReadOnly } : it)));
      showSaved("Updated.");
    } catch (error) {
      showSaved(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setWorkingId(null);
    }
  };

  const deleteRow = async (id: number) => {
    if (!confirm("Delete this API key?")) return;
    setWorkingId(id);
    setSaved(null);
    try {
      const response = await fetch(`/api/settings/api-key?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete key");
      setItems((prev) => prev.filter((it) => it.id !== id));
      showSaved("API key deleted.");
    } catch (error) {
      showSaved(error instanceof Error ? error.message : "Failed to delete key");
    } finally {
      setWorkingId(null);
    }
  };

  const copyLatestKey = async () => {
    if (!latestKey) return;
    try {
      await navigator.clipboard.writeText(latestKey);
      setLatestKey("");
      showSaved("Copied API key.");
    } catch {
      showSaved("Unable to copy.");
    }
  };

  const renderStatCard = ({ label, value, icon, iconTestId }: { label: string; value: number; icon: React.ReactNode; iconTestId: string }) => (
    <Card className="min-w-[160px] flex-1">
      <CardContent className="flex h-24 flex-col justify-between px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-muted-foreground" data-testid={iconTestId}>{icon}</span>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="mt-auto text-2xl font-semibold leading-none">{value}</p>
      </CardContent>
    </Card>
  );

  const hasRows = items.length > 0;
  const activeCount = items.filter((item) => item.isActive).length;
  const totalRequestsUsed = items.reduce((acc, item) => acc + (item.requestsUsed || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <CardTitle>AI Infrastructure</CardTitle>
          </div>
          <CardDescription>
            Configure your own AI API keys. These are stored securely and never exposed back to the UI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel htmlFor="ai-openai">OpenAI Key</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="ai-openai"
                  type="password"
                  placeholder="sk-..."
                  value={aiKeys.openai}
                  onChange={e => setAiKeys(prev => ({ ...prev, openai: e.target.value }))}
                />
                <Button size="icon" variant="outline" onClick={() => handleUpdateAiKeys('openai')} disabled={isUpdatingAi || !aiKeys.openai}>
                  <CheckCircle2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="ai-perplexity">Perplexity Key</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="ai-perplexity"
                  type="password"
                  placeholder="pplx-..."
                  value={aiKeys.perplexity}
                  onChange={e => setAiKeys(prev => ({ ...prev, perplexity: e.target.value }))}
                />
                <Button size="icon" variant="outline" onClick={() => handleUpdateAiKeys('perplexity')} disabled={isUpdatingAi || !aiKeys.perplexity}>
                  <CheckCircle2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="ai-gemini">Gemini Key</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="ai-gemini"
                  type="password"
                  placeholder="AIza..."
                  value={aiKeys.gemini}
                  onChange={e => setAiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                />
                <Button size="icon" variant="outline" onClick={() => handleUpdateAiKeys('gemini')} disabled={isUpdatingAi || !aiKeys.gemini}>
                  <CheckCircle2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto pb-1" data-testid="api-stats-row">
        <div className="flex min-w-max gap-2.5 sm:gap-3">
          {renderStatCard({ label: "Total Keys", value: items.length, icon: <KeyRound className="h-4 w-4" />, iconTestId: "api-total-keys-icon" })}
          {renderStatCard({ label: "Active Keys", value: activeCount, icon: <ShieldCheck className="h-4 w-4" />, iconTestId: "api-active-keys-icon" })}
          {renderStatCard({ label: "Requests Used", value: totalRequestsUsed, icon: <Activity className="h-4 w-4" />, iconTestId: "api-requests-used-icon" })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
          <CardDescription>Create a new key and optionally set a request limit.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(120px,auto)_auto] sm:items-end">
              <Field>
                <FieldLabel htmlFor="api-key-name">Key Name</FieldLabel>
                <Input id="api-key-name" value={newName} onChange={(e) => { setNewName(e.target.value); if (nameError && e.target.value.trim()) setNameError(false); }} placeholder="Enter key name" />
                <FieldError>{nameError ? "Name is required." : null}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="api-key-limit">Request Limit</FieldLabel>
                <Input id="api-key-limit" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} type="number" min={1} placeholder="Unlimited" />
              </Field>
              <Field className="sm:max-w-[160px]">
                <FieldLabel htmlFor="api-key-read-only">Read-only access</FieldLabel>
                <Toggle id="api-key-read-only" pressed={newReadOnly} onPressedChange={setNewReadOnly} variant="outline" size="sm" className="w-fit">RO</Toggle>
              </Field>
              <Button variant="outline" type="button" onClick={generateKey} disabled={isCreating}>
                {isCreating ? <Loader2 className="animate-spin" /> : <WandSparkles />}
                Generate Key
              </Button>
            </FieldGroup>
          </FieldSet>
        </CardContent>
      </Card>

      {latestKey ? (
        <Card>
          <CardHeader>
            <CardTitle>New Key</CardTitle>
            <CardDescription>Shown once. Copy and store it securely.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input readOnly value={latestKey} />
              <Button variant="outline" type="button" onClick={copyLatestKey}><Copy />Copy</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage status, usage limits, and lifecycle.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">API Key</th>
                  <th className="px-3 py-2 font-medium">Limit</th>
                  <th className="px-3 py-2 font-medium">Usage</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Mode</th>
                  <th className="px-3 py-2 font-medium">Last Used</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-3 py-3 text-muted-foreground" colSpan={8}>Loading...</td></tr>
                ) : !hasRows ? (
                  <tr><td className="px-3 py-3 text-muted-foreground" colSpan={8}>No API keys yet.</td></tr>
                ) : (
                  items.map((item) => {
                    const draft = drafts[item.id] || { isActive: item.isActive, isReadOnly: item.isReadOnly };
                    const busy = workingId === item.id;
                    return (
                      <tr key={item.id} className="border-b last:border-b-0">
                        <td className="px-3 py-2">{item.name || "API Key"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{toMaskedKey(item.keyPrefix)}</td>
                        <td className="px-3 py-2"><span className="text-muted-foreground">{item.requestsLimit ?? "Unlimited"}</span></td>
                        <td className="px-3 py-2 text-muted-foreground">{item.requestsUsed}{item.requestsLimit != null ? ` / ${item.requestsLimit}` : ""}</td>
                        <td className="px-3 py-2">
                          <Toggle pressed={draft.isActive} onPressedChange={(pressed) => { triggerShake(item.id); const next = { ...draft, isActive: pressed }; setDrafts(prev => ({ ...prev, [item.id]: next })); void persistRow(item.id, next); }} disabled={busy} size="sm" variant="outline" className={cn("h-7 px-2 text-[10px] font-bold data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700 data-[state=on]:border-emerald-200", shakingId === item.id && "animate-shake")}>
                            {draft.isActive ? "Active" : "Paused"}
                          </Toggle>
                        </td>
                        <td className="px-3 py-2">
                          <Toggle pressed={draft.isReadOnly} onPressedChange={(pressed) => { triggerShake(item.id); const next = { ...draft, isReadOnly: pressed }; setDrafts(prev => ({ ...prev, [item.id]: next })); void persistRow(item.id, next); }} disabled={busy} size="sm" variant="outline" className={cn("h-7 px-2 text-[10px] font-bold data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 data-[state=on]:border-amber-200", shakingId === item.id && "animate-shake")}>
                            {draft.isReadOnly ? "Read-Only" : "Full-Access"}
                          </Toggle>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "Never"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="ghost" type="button" onClick={() => { triggerShake(item.id); void deleteRow(item.id); }} disabled={busy} className={cn(shakingId === item.id && "animate-shake")}><Trash2 /></Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {saved && (
        <p className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {saved}
        </p>
      )}
    </div>
  );
}
