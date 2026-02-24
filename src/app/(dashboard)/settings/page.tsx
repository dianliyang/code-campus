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
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template, ai_topics_prompt_template",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_topics_prompt_template",
    "ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_topics_prompt_template",
    "ai_web_search_enabled, ai_prompt_template, ai_topics_prompt_template",
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

  // Fetch enrolled course field distribution for Cognitive Fingerprint
  let fingerprintFields: { name: string; count: number }[] = [];
  try {
    const { data: fieldRows } = await supabase
      .from("user_courses")
      .select("courses!inner(course_fields(fields(name)))")
      .eq("user_id", user.id)
      .neq("status", "hidden");

    const fieldCount: Record<string, number> = {};
    for (const row of fieldRows ?? []) {
      const course = (row as Record<string, unknown>).courses as Record<string, unknown> | null;
      const cfs = Array.isArray(course?.course_fields)
        ? (course.course_fields as Array<{ fields: { name: string } }>)
        : [];
      for (const cf of cfs) {
        const name = cf?.fields?.name;
        if (name) fieldCount[name] = (fieldCount[name] || 0) + 1;
      }
    }
    fingerprintFields = Object.entries(fieldCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  } catch (e) {
    console.error("[settings] Cognitive Fingerprint fetch failed:", e);
  }

  return (
    <main className="w-full space-y-4">
      <SettingsContainer user={user} profile={profile} fingerprintFields={fingerprintFields} />
    </main>
  );
}
