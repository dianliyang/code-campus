import { NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ProviderKey = "openai" | "gemini" | "perplexity";

function isSet(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_provider, ai_default_model")
    .eq("id", user.id)
    .maybeSingle();

  const checksByProvider: Record<ProviderKey, Record<string, boolean>> = {
    openai: {
      OPENAI_API_KEY: isSet(process.env.OPENAI_API_KEY),
    },
    gemini: {
      GEMINI_API_KEY: isSet(process.env.GEMINI_API_KEY),
    },
    perplexity: {
      PERPLEXITY_API_KEY: isSet(process.env.PERPLEXITY_API_KEY),
    },
  };

  const providers = (Object.keys(checksByProvider) as ProviderKey[]).map((provider) => {
    const checks = checksByProvider[provider];
    const missing = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([name]) => name);

    return {
      provider,
      healthy: missing.length === 0,
      missing,
      checks,
    };
  });

  async function probeProvider(provider: ProviderKey): Promise<{ ok: boolean; status: number | null; reason?: string }> {
    const timeoutMs = 7000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      if (provider === "perplexity") {
        if (!isSet(process.env.PERPLEXITY_API_KEY)) {
          return { ok: false, status: null, reason: "PERPLEXITY_API_KEY missing" };
        }
        const preferredModel =
          typeof profile?.ai_default_model === "string" && profile.ai_default_model.trim().length > 0
            ? profile.ai_default_model.trim()
            : "sonar";
        const res = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
          body: JSON.stringify({
            model: preferredModel,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
          cache: "no-store",
          signal: controller.signal,
        });
        return {
          ok: res.ok,
          status: res.status,
          reason:
            res.ok
              ? undefined
              : res.status === 401 || res.status === 403
                ? "API key rejected (Unauthorized/Forbidden)"
                : res.status === 400
                  ? "Auth likely OK, but selected model/payload was rejected"
                  : "Upstream request failed",
        };
      }

      if (provider === "openai") {
        if (!isSet(process.env.OPENAI_API_KEY)) {
          return { ok: false, status: null, reason: "OPENAI_API_KEY missing" };
        }
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          cache: "no-store",
          signal: controller.signal,
        });
        return {
          ok: res.ok,
          status: res.status,
          reason: res.ok ? undefined : res.status === 401 || res.status === 403 ? "API key rejected (Unauthorized/Forbidden)" : "Upstream request failed",
        };
      }

      if (!isSet(process.env.GEMINI_API_KEY)) {
        return { ok: false, status: null, reason: "GEMINI_API_KEY missing" };
      }
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(process.env.GEMINI_API_KEY || "")}`;
      const res = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
      return {
        ok: res.ok,
        status: res.status,
        reason: res.ok ? undefined : res.status === 401 || res.status === 403 ? "API key rejected (Unauthorized/Forbidden)" : "Upstream request failed",
      };
    } catch {
      return { ok: false, status: null, reason: "Network/timeout while probing provider" };
    } finally {
      clearTimeout(timer);
    }
  }

  const probedProviders = await Promise.all(
    providers.map(async (provider) => {
      const probe = await probeProvider(provider.provider);
      return {
        ...provider,
        probe,
      };
    })
  );

  return NextResponse.json(
    {
      healthy: probedProviders.every((p) => p.healthy && p.probe.ok),
      providers: probedProviders,
      active: {
        provider: typeof profile?.ai_provider === "string" ? profile.ai_provider : null,
        model: typeof profile?.ai_default_model === "string" ? profile.ai_default_model : null,
      },
      checked_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
