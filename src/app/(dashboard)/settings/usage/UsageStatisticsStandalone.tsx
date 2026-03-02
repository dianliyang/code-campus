import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import UsageStatisticsPanel from "./UsageStatisticsPanel";

export default async function UsageStatisticsStandalone() {
  const [user, lang] = await Promise.all([
    getUser(),
    getLanguage(),
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

  return <UsageStatisticsPanel />;
}
