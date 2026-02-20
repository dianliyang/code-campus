import SettingsContainer from "@/components/profile/SettingsContainer";
import { createClient, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, lang, supabase] = await Promise.all([getUser(), getLanguage(), createClient()]);
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="p-10 text-center">
        <p>{dict.dashboard.profile.user_not_found}</p>
        <Button asChild className="mt-6">
          <Link href="/login">
            {dict.dashboard.login.title}
          </Link>
        </Button>
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
      profile = data ? JSON.parse(JSON.stringify(data)) : null;
      break;
    }

    console.error("[settings] profile select failed:", error.message);
  }

  return (
    <main className="w-full space-y-4">
      <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] px-4 py-3">
        <h1 className="text-[26px] leading-none font-semibold tracking-tight text-slate-900">
          {dict.dashboard.profile.settings}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage your AI preferences, account security, and system operations.
        </p>
      </section>
      <SettingsContainer user={user} profile={profile} />
    </main>
  );
}
