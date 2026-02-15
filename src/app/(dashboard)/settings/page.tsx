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
      // Ensure we have a plain object and handle null properly
      profile = data ? JSON.parse(JSON.stringify(data)) : null;
      break;
    }

    console.error("[settings] profile select failed:", error.message);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full min-h-screen bg-white">
      {/* Settings Header - Tech Console Style */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-8 md:gap-10 pb-16 border-b border-gray-100 relative mb-12">
        <div className="relative group">
          <div className="w-20 h-20 bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-white relative z-10 overflow-hidden">
            <Image src="/logo.svg" alt="Logo" width={32} height={32} className="brightness-200" />
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/40 to-transparent opacity-50"></div>
          </div>
          <div className="absolute -inset-1 bg-gradient-to-tr from-brand-blue to-brand-green rounded-[1.6rem] blur opacity-20 transition-opacity"></div>
        </div>

        <div className="flex-grow space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic">{dict.dashboard.profile.settings}</h1>
            <div className="flex gap-2">
              <span className="bg-brand-blue/10 text-brand-blue text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-brand-blue/20">
                SYSTEM_CONFIG_v2.0
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 md:gap-x-8 gap-y-2 md:gap-y-3">
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest">ACCESS_LEVEL:</span>
              <span className="text-xs md:text-sm font-bold text-gray-500 tracking-tight">ADMINISTRATOR</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <span className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest">USER_ID:</span>
              <span className="text-xs md:text-sm font-bold text-gray-500 tracking-tight font-mono">{user.id.substring(0, 12).toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>
      
      <SettingsContainer user={user} profile={profile} dict={dict} />
    </main>
  );
}
