import SettingsContainer from "@/components/profile/SettingsContainer";
import { getCachedProfileSettings, getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAiRuntimeConfig } from "@/lib/ai/runtime-config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, lang, aiRuntime] = await Promise.all([getUser(), getLanguage(), getAiRuntimeConfig()]);
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

  const profile = await getCachedProfileSettings(user.id);

  return (
    <div className="h-full">
      <SettingsContainer
        user={user}
        profile={profile}
        aiDefaults={{
          modelCatalog: aiRuntime.modelCatalog,
          prompts: {
            description: aiRuntime.prompts.description,
            studyPlan: aiRuntime.prompts.studyPlan,
            topics: aiRuntime.prompts.topics,
            courseUpdate: aiRuntime.prompts.courseUpdate,
          },
        }}
      />
    </div>
  );
}
