import { getUser, createClient } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [user, lang, supabase] = await Promise.all([getUser(), getLanguage(), createClient()]);

  const [dict, { data: enrolledData }] = await Promise.all([
    getDictionary(lang),
    user
      ? supabase
          .from("user_courses")
          .select("course_id, status, updated_at, courses!inner(subdomain)")
          .eq("user_id", user.id)
          .neq("status", "hidden")
      : Promise.resolve({ data: null }),
  ]);

  if (!user) return <div className="p-10 text-center">{dict.dashboard.profile.user_not_found}</div>;

  const email = user.email;
  const name = user.user_metadata?.full_name || email?.split("@")[0] || "User";

  const enrolledIds = enrolledData?.map((r) => r.course_id) || [];
  const statusCounts: Record<string, number> = {};
  enrolledData?.forEach((s) => {
    const status = s.status ?? "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  let universityCount = 0;
  let allFieldStats: { name: string; count: number }[] = [];

  if (enrolledIds.length > 0) {
    const [uniRes, fieldRes] = await Promise.all([
      supabase.from("courses").select("university").in("id", enrolledIds),
      supabase.from("course_fields").select("fields(name)").in("course_id", enrolledIds),
    ]);

    universityCount = new Set(uniRes.data?.map((r) => r.university)).size;

    const fieldCounts: Record<string, number> = {};
    (fieldRes.data as { fields: { name: string } | null }[] | null)?.forEach((cf) => {
      if (cf.fields?.name) {
        fieldCounts[cf.fields.name] = (fieldCounts[cf.fields.name] || 0) + 1;
      }
    });

    allFieldStats = Object.entries(fieldCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  const totalCourses = enrolledData?.length || 0;
  const completedCount = statusCounts.completed || 0;

  const awards = Array.from(
    new Set(
      (enrolledData as Array<{ status: string; courses: { subdomain: string | null } }>)
        ?.filter((r) => r.status === "completed" && r.courses?.subdomain)
        .map((r) => String(r.courses.subdomain))
    )
  ).sort();

  const topField = allFieldStats[0]?.name || dict.dashboard.profile.none;
  const lastActiveData = enrolledData?.sort(
    (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime(),
  )[0];
  const lastActiveDate = lastActiveData?.updated_at ? new Date(lastActiveData.updated_at) : null;

  const fieldTotal = allFieldStats.reduce((acc, curr) => acc + curr.count, 0);
  const coveragePercent = universityCount > 0 ? Math.min(100, Math.round((universityCount / 8) * 100)) : 0;
  const recentStatuses = Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const learningProfileColors = [
    "from-fuchsia-500 to-pink-500",
    "from-cyan-500 to-blue-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-violet-500 to-indigo-500",
    "from-rose-500 to-red-500",
    "from-lime-500 to-green-500",
    "from-sky-500 to-cyan-500",
  ];

  return (
    <main className="w-full space-y-4">
      <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-14 w-14 rounded-xl bg-[#1f1f1f] text-white flex items-center justify-center text-2xl font-semibold">
              {name.substring(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-[26px] leading-none font-semibold tracking-tight text-slate-900 truncate">{name}</h1>
              <p className="mt-1 text-sm text-slate-500 truncate">{email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  Last active:{" "}
                  {lastActiveDate
                    ? lastActiveDate.toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" })
                    : "N/A"}
                </span>
                <span>Universities: {universityCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge>LVL {Math.floor(completedCount / 2) + 1}</Badge>
            <Badge variant="secondary">{dict.dashboard.profile.user_level}</Badge>
          </div>
        </div>
      </section>

      {awards.length > 0 && (
        <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
          <h2 className="text-base font-semibold text-[#1f1f1f] mb-4 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            </span>
            Academic Achievements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {awards.map((award) => (
              <div key={award} className="group relative overflow-hidden rounded-xl border border-[#e8e8e8] bg-white p-4 transition-all hover:border-slate-900 hover:shadow-md">
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-slate-900 to-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 leading-none">Mastery Award</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 truncate">{award}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden border border-[#e5e5e5] bg-[#fcfcfc]">
        <div className="px-4 py-3 border-r border-b lg:border-b-0 border-[#e5e5e5]">
          <p className="text-xs text-slate-500">Courses Enrolled</p>
          <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight text-slate-900">{totalCourses}</p>
        </div>
        <div className="px-4 py-3 border-b lg:border-b-0 lg:border-r border-[#e5e5e5]">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight text-slate-900">{completedCount}</p>
        </div>
        <div className="px-4 py-3 border-r border-[#e5e5e5]">
          <p className="text-xs text-slate-500">Top Field</p>
          <p className="mt-1 text-[20px] leading-none font-semibold tracking-tight text-slate-900 truncate">{topField}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-slate-500">Network Coverage</p>
          <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight text-slate-900">{coveragePercent}%</p>
        </div>
      </section>

      <section className="rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold text-[#1f1f1f]">Learning Profile</h2>
            <p className="text-xs text-[#7a7a7a] mt-1 mb-3">{dict.dashboard.profile.neural_map}</p>

            {fieldTotal > 0 ? (
              <div className="space-y-2">
                {allFieldStats.slice(0, 8).map((field, idx) => {
                  const pct = Math.max(3, Math.round((field.count / fieldTotal) * 100));
                  const barColor = learningProfileColors[idx % learningProfileColors.length];
                  return (
                    <div key={field.name} className="rounded-md border border-[#e8e8e8] bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#2a2a2a] truncate">{field.name}</p>
                        <p className="text-xs text-[#666]">
                          {field.count} {dict.dashboard.profile.units}
                        </p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-[#efefef] overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-[#e1e1e1] bg-white p-6 text-center">
                <p className="text-sm text-slate-500">{dict.dashboard.profile.no_data}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#1f1f1f]">Course Status</h3>
            <p className="text-xs text-[#7a7a7a] mt-1 mb-3">Enrollment distribution</p>
            <div className="space-y-2">
              {recentStatuses.length > 0 ? (
                recentStatuses.map(([status, count]) => (
                  <div
                    key={status}
                    className="rounded-md border border-[#e8e8e8] bg-white px-3 py-2 flex items-center justify-between"
                  >
                    <span className="text-sm text-[#333] capitalize">{status.replace(/_/g, " ")}</span>
                    <span className="text-sm font-medium text-[#222]">{count}</span>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed border-[#e1e1e1] bg-white p-6 text-center">
                  <p className="text-sm text-slate-500">{dict.dashboard.profile.no_data}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
