import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ProviderKey = "openai" | "gemini" | "perplexity" | "vertex";

function isSet(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    vertex: {
      GOOGLE_CLOUD_PROJECT: isSet(process.env.GOOGLE_CLOUD_PROJECT),
      GOOGLE_CLOUD_LOCATION: isSet(process.env.GOOGLE_CLOUD_LOCATION),
      GOOGLE_APPLICATION_CREDENTIALS: isSet(process.env.GOOGLE_APPLICATION_CREDENTIALS),
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

  return NextResponse.json(
    {
      healthy: providers.every((p) => p.healthy),
      providers,
      checked_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
