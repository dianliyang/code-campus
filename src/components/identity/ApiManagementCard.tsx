"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Loader2, Trash2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";

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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const [latestKey, setLatestKey] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newReadOnly, setNewReadOnly] = useState(false);
  const [nameError, setNameError] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/settings/api-key", { cache: "no-store" });
      const payload = await response.json();
      const nextItems: ApiKeyItem[] = Array.isArray(payload?.keys) ? payload.keys : [];
      setItems(nextItems);
      const nextDrafts: DraftById = {};
      for (const item of nextItems) {
        nextDrafts[item.id] = {
          isActive: Boolean(item.isActive),
          isReadOnly: Boolean(item.isReadOnly),
        };
      }
      setDrafts(nextDrafts);
    } catch {
      setItems([]);
      setDrafts({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const hasRows = useMemo(() => items.length > 0, [items.length]);
  const activeCount = useMemo(() => items.filter((item) => item.isActive).length, [items]);
  const totalRequestsUsed = useMemo(() => items.reduce((acc, item) => acc + (item.requestsUsed || 0), 0), [items]);

  const showSaved = (message: string) => {
    setSaved(message);
    setTimeout(() => setSaved(null), 1800);
  };

  const parseLimit = (value: string): number | null => {
    if (!value.trim()) return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1) {
      throw new Error("Limit must be an integer >= 1.");
    }
    return n;
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
      await load();
    } catch (error) {
      showSaved(error instanceof Error ? error.message : "Failed to generate key.");
    } finally {
      setIsCreating(false);
    }
  };

  const persistRow = async (
    id: number,
    draftOverride?: { isActive: boolean; isReadOnly: boolean },
  ) => {
    const draft = draftOverride ?? drafts[id];
    if (!draft) return;

    setWorkingId(id);
    setSaved(null);
    try {
      const response = await fetch("/api/settings/api-key", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          isActive: draft.isActive,
          isReadOnly: draft.isReadOnly,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to save");
      showSaved("Updated.");
      await load();
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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to delete key");
      showSaved("API key deleted.");
      await load();
    } catch (error) {
      showSaved(error instanceof Error ? error.message : "Failed to delete key");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total Keys</p>
            <p className="mt-1 text-2xl font-semibold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Active Keys</p>
            <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-xs text-muted-foreground">Requests Used</p>
            <p className="mt-1 text-2xl font-semibold">{totalRequestsUsed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create API Key</CardTitle>
          <CardDescription>
            Create a new key and optionally set a request limit. Leave blank for unlimited.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldGroup className="grid gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(120px,auto)_auto] sm:items-end">
              <Field>
                <FieldLabel htmlFor="api-key-name">Key Name</FieldLabel>
                <Input
                  id="api-key-name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (nameError && e.target.value.trim()) setNameError(false);
                  }}
                  placeholder="Enter key name"
                />
                <FieldError>{nameError ? "Name is required." : null}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="api-key-limit">Request Limit</FieldLabel>
                <Input
                  id="api-key-limit"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                />
              </Field>
              <Field className="sm:max-w-[160px]">
                <FieldLabel htmlFor="api-key-read-only">Read-only access</FieldLabel>
                <Toggle
                  id="api-key-read-only"
                  aria-label="Read-only access"
                  aria-pressed={newReadOnly}
                  pressed={newReadOnly}
                  onPressedChange={setNewReadOnly}
                  variant="outline"
                  size="sm"
                  className="w-fit data-[state=on]:border-black data-[state=on]:bg-black data-[state=on]:text-white"
                >
                  RO
                </Toggle>
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
              <Button variant="outline" type="button" onClick={copyLatestKey}>
                <Copy />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage status, usage limits, and lifecycle. Update limit with an integer, or clear it for unlimited.
          </CardDescription>
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
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={8}>
                    Loading...
                  </td>
                </tr>
              ) : !hasRows ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={8}>
                    No API keys yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const fallbackDraft = {
                    isActive: item.isActive,
                    isReadOnly: item.isReadOnly,
                  };
                  const draft = drafts[item.id] || fallbackDraft;
                  const busy = workingId === item.id;
                  return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">{item.name || "API Key"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{toMaskedKey(item.keyPrefix)}</td>
                      <td className="px-3 py-2">
                        <span className="text-muted-foreground">{item.requestsLimit ?? "Unlimited"}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {item.requestsUsed}
                        {item.requestsLimit != null ? ` / ${item.requestsLimit}` : ""}
                      </td>
                      <td className="px-3 py-2">
                        <Toggle
                          pressed={draft.isActive}
                          onPressedChange={(pressed) => {
                            const nextDraft = { ...draft, isActive: pressed };
                            setDrafts((prev) => ({ ...prev, [item.id]: nextDraft }));
                            void persistRow(item.id, nextDraft);
                          }}
                          disabled={busy}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] uppercase font-bold tracking-wider data-[state=on]:bg-emerald-50 data-[state=on]:text-emerald-700 data-[state=on]:border-emerald-200"
                        >
                          {draft.isActive ? "Active" : "Paused"}
                        </Toggle>
                      </td>
                      <td className="px-3 py-2">
                        <Toggle
                          pressed={draft.isReadOnly}
                          onPressedChange={(pressed) => {
                            const nextDraft = { ...draft, isReadOnly: pressed };
                            setDrafts((prev) => ({ ...prev, [item.id]: nextDraft }));
                            void persistRow(item.id, nextDraft);
                          }}
                          disabled={busy}
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] uppercase font-bold tracking-wider data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 data-[state=on]:border-amber-200"
                        >
                          {draft.isReadOnly ? "Read-Only" : "Full-Access"}
                        </Toggle>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : "Never"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => deleteRow(item.id)}
                          disabled={busy}
                          aria-label="Delete API key"
                          title="Delete API key"
                        >
                          <Trash2 />
                        </Button>
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

      {saved ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {saved}
        </p>
      ) : null}
    </div>
  );
}
