import SettingsContainer from "@/components/profile/SettingsContainer";
import { createAdminClient, getCachedProfileSettings, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getModelCatalogByProvider } from "@/lib/ai/models";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, lang, modelCatalog] = await Promise.all([
    getUser(),
    getLanguage(),
    getModelCatalogByProvider(),
  ]);
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="p-10 text-center">
        <p>{dict.dashboard.profile.user_not_found}</p>
        <Button asChild className="mt-6">
          <Link href="/login">{dict.dashboard.login.title}</Link>
        </Button>
      </div>
    );
  }

  let profile = await getCachedProfileSettings(user.id);

  // Auto-heal profile model/provider when runtime catalog changed and values drift.
  const rawProvider = String(profile?.ai_provider || "").trim();
  const normalizedProvider: "perplexity" | "gemini" | "openai" =
    rawProvider === "gemini" ? "gemini" : rawProvider === "openai" ? "openai" : "perplexity";
  const catalogForProvider = modelCatalog[normalizedProvider] || [];
  const rawModel = String(profile?.ai_default_model || "").trim();
  const normalizedModel = catalogForProvider.includes(rawModel) ? rawModel : (catalogForProvider[0] || "");

  const providerNeedsFix = rawProvider !== normalizedProvider;
  const modelNeedsFix = Boolean(normalizedModel) && rawModel !== normalizedModel;

  if (providerNeedsFix || modelNeedsFix) {
    try {
      const admin = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      await admin.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? null,
          ai_provider: normalizedProvider,
          ai_default_model: normalizedModel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      profile = {
        ...(profile || {}),
        ai_provider: normalizedProvider,
        ai_default_model: normalizedModel,
      };
    } catch (error) {
      console.warn("Failed to auto-heal AI provider/model consistency:", error);
    }
  }

  return (
    <div className="h-full">
      <SettingsContainer
        user={user}
        profile={profile}
        aiDefaults={{
          modelCatalog,
        }}
      />
    </div>
  );
}
