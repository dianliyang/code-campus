import Link from "next/link";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { getUser } from "@/lib/supabase/server";
import { getDashboardPageHeaderClassName } from "@/lib/dashboard-layout";
import { Button } from "@/components/ui/button";
import OverviewClientContent from "@/components/dashboard/OverviewClientContent";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [user, lang] = await Promise.all([getUser(), getLanguage()]);
  const dict = await getDictionary(lang);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 font-mono uppercase tracking-widest">{dict.dashboard.identity.user_not_found}</p>
        <Button variant="outline" asChild>
          <Link href="/login">{dict.dashboard.login.title}</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="h-full w-full px-4 py-4">
      <div className={getDashboardPageHeaderClassName("-mt-4")}>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Course momentum, today&apos;s routine, and learning identity.
          </p>
        </div>
      </div>
      <OverviewClientContent />
    </main>
  );
}
