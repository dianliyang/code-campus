import SettingsContainer, { type SectionId } from "@/components/profile/SettingsContainer";
import { createAdminClient, getCachedProfileSettings, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import Link from "next/link";
import { getModelCatalogByProvider } from "@/lib/ai/models";
import { Button } from "@/components/ui/button";

export async function renderSettingsPage(initialSection?: SectionId) {
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
        <Button variant="outline" asChild>
          <Link href="/login">{dict.dashboard.login.title}</Link>
        </Button>
      </div>
    );
  }

  let profile = await getCachedProfileSettings(user.id);

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
        key={`settings-${initialSection || "engine"}`}
        user={user}
        profile={profile}
        initialSection={initialSection}
        aiDefaults={{ modelCatalog }}
        dict={dict}
      />
    </div>
  );
}
