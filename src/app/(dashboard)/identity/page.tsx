import {
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { getUser, createClient } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { getDashboardPageHeaderClassName } from "@/lib/dashboard-layout";
import { Badge } from "@/components/ui/badge";
import SecurityIdentitySection from "@/components/identity/SecurityIdentitySection";

export const dynamic = "force-dynamic";

function formatRelativeLastActive(date: Date | null, lang: string) {
  if (!date) return "No recent activity";

  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
  );

  if (diffDays === 0) return "Active today";
  if (diffDays === 1) return "Active yesterday";

  return `Active ${diffDays} days ago • ${date.toLocaleDateString(lang, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export default async function IdentityPage() {
  const [user, lang, supabase] = await Promise.all([getUser(), getLanguage(), createClient()]);

  const [dict, { data: enrolledData }] = await Promise.all([
    getDictionary(lang),
    user
      ? supabase
          .from("user_courses")
          .select("updated_at")
          .eq("user_id", user.id)
          .neq("status", "hidden")
      : Promise.resolve({ data: null }),
  ]);

  if (!user) {
    return <div className="p-10 text-center">{dict.dashboard.identity.user_not_found}</div>;
  }

  const email = user.email;
  const name = user.user_metadata?.full_name || email?.split("@")[0] || "User";
  const provider =
    typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : undefined;

  const lastActiveData = enrolledData?.sort(
    (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
  )[0];
  const lastActiveDate = lastActiveData?.updated_at ? new Date(lastActiveData.updated_at) : null;

  return (
    <main className="w-full space-y-6 px-4 pb-4">
      <section className={getDashboardPageHeaderClassName()}>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Identity</h1>
          <p className="text-sm text-muted-foreground">
            Profile, learning signals, and account posture.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#e7e2d8]">
        <div className="p-5 sm:p-7 lg:p-8">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]">
                Identity
              </Badge>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827] sm:text-4xl">
                {name}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[#475569] sm:text-[15px]">
                Account profile, authentication posture, and secure access settings.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#475569]">
              <span>{email}</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#111827]" />
                {provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Secure account"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4 text-[#111827]" />
                {formatRelativeLastActive(lastActiveDate, lang)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SecurityIdentitySection view="identity" provider={provider} />
        <SecurityIdentitySection view="account" provider={provider} />
      </section>

    </main>
  );
}
