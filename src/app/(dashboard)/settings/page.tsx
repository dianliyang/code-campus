import SettingsContainer from "@/components/profile/SettingsContainer";
import { createClient, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import Link from "next/link";
import Image from "next/image";

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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full min-h-screen bg-white">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-10 h-10 rounded-lg bg-gray-950 flex items-center justify-center">
          <Image src="/logo.svg" alt="Logo" width={24} height={24} className="brightness-200" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-widest mb-0.5">
            <span>Dashboard</span>
            <span className="text-gray-200">/</span>
            <span className="text-gray-900">Settings</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">{dict.dashboard.profile.settings}</h1>
        </div>
      </div>
      
      <SettingsContainer user={user} profile={profile} dict={dict} />
    </main>
  );
}
