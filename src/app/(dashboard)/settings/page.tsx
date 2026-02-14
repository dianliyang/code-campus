import AISettingsCard from "@/components/profile/AISettingsCard";
import SecurityIdentitySection from "@/components/profile/SecurityIdentitySection";
import SystemMaintenanceCard from "@/components/profile/SystemMaintenanceCard";
import LogoutButton from "@/components/layout/LogoutButton";
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

  const selectVariants = [
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template",
    "ai_default_model, ai_web_search_enabled, ai_prompt_template",
    "ai_web_search_enabled, ai_prompt_template",
    "id",
  ];

  let profile: Record<string, unknown> | null = null;
  for (const selectColumns of selectVariants) {
    const { data, error } = await supabase
      .from("profiles")
      .select(selectColumns)
      .eq("id", user.id)
      .maybeSingle();

    if (!error) {
      profile = (data as Record<string, unknown> | null) ?? null;
      break;
    }

    console.error("[settings] profile select failed:", error.message);
  }

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full min-h-screen bg-white">
      <div className="mb-6">
        <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase tracking-[0.1em]">{dict.dashboard.profile.settings}</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Configure system intelligence and account parameters</p>
      </div>
      <AISettingsCard
        initialProvider={(profile?.ai_provider as string) || "perplexity"}
        initialModel={(profile?.ai_default_model as string) || "sonar"}
        initialWebSearchEnabled={(profile?.ai_web_search_enabled as boolean | undefined) ?? false}
        initialPromptTemplate={(profile?.ai_prompt_template as string) || ""}
        initialStudyPlanPromptTemplate={(profile?.ai_study_plan_prompt_template as string) || ""}
      />
      
      <SystemMaintenanceCard />

      <SecurityIdentitySection dict={dict.dashboard.profile} provider={user.app_metadata.provider} />

      <div className="mt-12 pt-8 border-t border-gray-100">
        <LogoutButton showLabel={true} dict={dict} fullWidth={true} />
      </div>
    </main>
  );
}
