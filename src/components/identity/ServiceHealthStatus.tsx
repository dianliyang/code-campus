"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIProvider } from "@/lib/ai/models-client";

export type ProviderHealth = {
  provider: AIProvider;
  healthy: boolean;
  missing: string[];
  checks: Record<string, boolean>;
  probe?: {
    ok: boolean;
    status: number | null;
    reason?: string;
  };
};

export type AIHealthStats = {
  healthy: boolean;
  providers: ProviderHealth[];
  active?: { provider: string | null; model: string | null };
  checked_at: string;
};

const AI_HEALTH_CACHE_KEY = "cc:ai-health-cache";
const AI_HEALTH_CACHE_TTL_MS = 5 * 60 * 1000;

const PROVIDER_LABELS: Record<AIProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

export default function ServiceHealthStatus() {
  const [healthStats, setHealthStats] = useState<AIHealthStats | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const loadHealth = useCallback(async (force = false) => {
    setHealthLoading(true);
    try {
      if (!force && typeof window !== "undefined") {
        const raw = window.localStorage.getItem(AI_HEALTH_CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { cachedAt?: number; data?: AIHealthStats };
          const cachedAt = Number(parsed?.cachedAt || 0);
          if (cachedAt > 0 && parsed?.data && Date.now() - cachedAt < AI_HEALTH_CACHE_TTL_MS) {
            setHealthStats(parsed.data);
            setHealthLoading(false);
            return;
          }
        }
      }

      const response = await fetch("/api/ai/health", { cache: "no-store" });
      const d = await response.json();
      if (!d.error) {
        const next: AIHealthStats = {
          healthy: Boolean(d.healthy),
          providers: Array.isArray(d.providers) ? d.providers : [],
          active: d.active && typeof d.active === "object" ? d.active : undefined,
          checked_at: typeof d.checked_at === "string" ? d.checked_at : new Date().toISOString()
        };
        setHealthStats(next);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(AI_HEALTH_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data: next }));
        }
      }
    } catch (error) {
      console.error("Failed to load health status:", error);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth(false);
  }, [loadHealth]);

  if (healthLoading && !healthStats) {
    return (
      <div className="flex items-center gap-2 py-2 text-[12px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking environment status...
      </div>
    );
  }

  if (!healthStats) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <p className="text-[12px] text-muted-foreground">Health status unavailable.</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 text-[11px]" 
          onClick={() => void loadHealth(true)}
        >
          <RefreshCw className="mr-1 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {healthStats.healthy ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span className={`text-sm font-medium ${healthStats.healthy ? "text-emerald-600" : "text-amber-600"}`}>
            {healthStats.healthy ? "Systems Online" : "Configuration Needed"}
          </span>
        </div>
        <button 
          onClick={() => void loadHealth(true)}
          disabled={healthLoading}
          className="text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          title="Refresh health status"
        >
          <RefreshCw className={`h-3 w-3 ${healthLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {healthStats.providers.map((item) => (
          <div 
            key={item.provider}
            className={`rounded-md border p-2 transition-colors ${
              item.healthy && item.probe?.ok !== false 
                ? "border-border/50 bg-background/50" 
                : "border-amber-200/50 bg-amber-50/30"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground">{PROVIDER_LABELS[item.provider] || item.provider}</span>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${item.healthy && item.probe?.ok !== false ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className={`text-xs font-medium ${item.healthy && item.probe?.ok !== false ? "text-emerald-600" : "text-amber-600"}`}>
                  {item.healthy && item.probe?.ok !== false ? "Healthy" : "Attention"}
                </span>
              </div>
            </div>

            {!item.healthy && item.missing.length > 0 && (
              <p className="text-[11px] text-amber-700/75 leading-relaxed">
                Missing: <span className="font-mono">{item.missing.join(", ")}</span>
              </p>
            )}

            {item.probe && !item.probe.ok && (
              <p className="text-[11px] text-amber-700/75 leading-relaxed">
                {item.probe.reason || "Probe failed"} 
                {item.probe.status ? ` (HTTP ${item.probe.status})` : ""}
              </p>
            )}

            {item.healthy && item.probe?.ok !== false && (
              <p className="text-[11px] text-muted-foreground/80">
                Connection verified
              </p>
            )}
          </div>
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-right">
        Verified: {new Date(healthStats.checked_at).toLocaleTimeString()}
      </p>
    </div>
  );
}
