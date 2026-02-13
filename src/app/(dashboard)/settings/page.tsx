import AISettingsCard from "@/components/profile/AISettingsCard";
import SecurityIdentitySection from "@/components/profile/SecurityIdentitySection";
import { createClient, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, lang, supabase] = await Promise.all([getUser(), getLanguage(), createClient()]);
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="p-10 text-center font-mono">
        <p>{dict.dashboard.profile.user_not_found}</p>
        <Link href="/login" className="mt-6 inline-block btn-primary">
          {dict.dashboard.login.title}
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">{dict.dashboard.profile.settings}</h1>
        <p className="text-sm text-gray-500 mt-2">Configure your default AI behavior for course generation.</p>
      </div>
      <AISettingsCard
        initialProvider={profile?.ai_provider || "perplexity"}
        initialModel={profile?.ai_default_model || "sonar"}
        initialWebSearchEnabled={profile?.ai_web_search_enabled ?? false}
        initialPromptTemplate={profile?.ai_prompt_template || ""}
        initialStudyPlanPromptTemplate={profile?.ai_study_plan_prompt_template || ""}
      />
      <SecurityIdentitySection dict={dict.dashboard.profile} />
    </main>
  );
}
