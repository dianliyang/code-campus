import { getUser, createClient, mapCourseFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import RoadmapAchievementsSection from "@/components/home/RoadmapAchievementsSection";
import { Course } from "@/types";
import CourseStatusChart from "@/components/identity/CourseStatusChart";
import LearningProfileChart from "@/components/identity/LearningProfileChart";

export const dynamic = "force-dynamic";

export default async function IdentityPage() {
  const [user, lang, supabase] = await Promise.all([getUser(), getLanguage(), createClient()]);
  type CompletedAchievement = Course & {
    gpa?: number;
    score?: number;
    attendance?: {attended: number;total: number;};
    updated_at: string;
  };

  const [dict, { data: enrolledData }, completedCoursesRes] = await Promise.all([
  getDictionary(lang),
  user ?
  supabase.
  from("user_courses").
  select("course_id, status, progress, updated_at, courses!inner(subdomain)").
  eq("user_id", user.id).
  neq("status", "hidden") :
  Promise.resolve({ data: null }),
  user ?
  supabase.
  from("courses").
  select(`
            id, university, course_code, title, units, credit, url, description, details, is_hidden,
            uc:user_courses!inner(status, progress, updated_at, gpa, score),
            semesters:course_semesters(semesters(term, year))
          `).
  eq("user_courses.user_id", user.id).
  eq("user_courses.status", "completed").
  neq("is_hidden", true).
  order("updated_at", { foreignTable: "user_courses", ascending: false }) :
  Promise.resolve({ data: null, error: null })]
  );

  if (!user) return <div className="p-10 text-center">{dict.dashboard.identity.user_not_found}</div>;

  const email = user.email;
  const name = user.user_metadata?.full_name || email?.split("@")[0] || "User";

  const enrolledIds = enrolledData?.map((r) => r.course_id) || [];
  const statusCounts: Record<string, number> = {};
  enrolledData?.forEach((s) => {
    const status = s.status ?? "unknown";
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  let universityCount = 0;
  let allFieldStats: {name: string;count: number;}[] = [];

  if (enrolledIds.length > 0) {
    const [uniRes, fieldRes] = await Promise.all([
    supabase.from("courses").select("university").in("id", enrolledIds),
    supabase.from("course_fields").select("fields(name)").in("course_id", enrolledIds)]
    );

    universityCount = new Set(uniRes.data?.map((r) => r.university)).size;

    const fieldCounts: Record<string, number> = {};
    (fieldRes.data as {fields: {name: string;} | null;}[] | null)?.forEach((cf) => {
      if (cf.fields?.name) {
        fieldCounts[cf.fields.name] = (fieldCounts[cf.fields.name] || 0) + 1;
      }
    });

    allFieldStats = Object.entries(fieldCounts).
    map(([name, count]) => ({ name, count })).
    sort((a, b) => b.count - a.count);
  }

  const completedCount = statusCounts.completed || 0;
  const enrolledCount = enrolledData?.length || 0;

  const completedRows = completedCoursesRes.data || [];
  const completedAchievements: CompletedAchievement[] = completedRows.map((row: any) => {// eslint-disable-line @typescript-eslint/no-explicit-any
    const course = mapCourseFromRow(row);
    const semesterNames =
    (row.semesters as {semesters: {term: string;year: number;};}[] | null)?.
    map((s) => `${s.semesters.term} ${s.semesters.year}`) || [];
    const uc =
    (row.uc as {updated_at: string;gpa?: number;score?: number;}[] | null)?.[0] ||
    (row.user_courses as {updated_at: string;gpa?: number;score?: number;}[] | null)?.[0];

    return {
      ...course,
      fields: [],
      semesters: semesterNames,
      updated_at: uc?.updated_at || new Date().toISOString(),
      gpa: uc?.gpa,
      score: uc?.score
    } as CompletedAchievement;
  });

  const availableSemesters = Array.from(new Set(completedAchievements.flatMap((c) => c.semesters))).sort((a, b) => {
    const [termA, yearA] = a.split(" ");
    const [termB, yearB] = b.split(" ");
    if (yearA !== yearB) return Number(yearB) - Number(yearA);
    const order: Record<string, number> = { Fall: 3, Summer: 2, Spring: 1, Winter: 0 };
    return (order[termB] ?? -1) - (order[termA] ?? -1);
  });

  const lastActiveData = enrolledData?.sort(
    (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
  )[0];
  const lastActiveDate = lastActiveData?.updated_at ? new Date(lastActiveData.updated_at) : null;

  const recentStatuses = Object.entries(statusCounts).
  sort((a, b) => b[1] - a[1]).
  slice(0, 4);
  const nowMs = lastActiveDate?.getTime() || 0;
  const dayMs = 24 * 60 * 60 * 1000;
  const recentUpdates30 = (enrolledData || []).filter((row) => {
    if (!row.updated_at) return false;
    const ts = new Date(row.updated_at).getTime();
    return Number.isFinite(ts) && nowMs - ts <= 30 * dayMs;
  }).length;
  const inProgressRows = (enrolledData || []).filter((row) => row.status === "in_progress");
  const inProgressCount = inProgressRows.length;
  const stalledCount = inProgressRows.filter((row) => {
    if (!row.updated_at) return true;
    const ts = new Date(row.updated_at).getTime();
    return !Number.isFinite(ts) || nowMs - ts > 14 * dayMs;
  }).length;
  const avgProgress = inProgressRows.length > 0 ?
  Math.round(
    inProgressRows.reduce((sum, row) => sum + Number(row.progress || 0), 0) /
    inProgressRows.length
  ) :
  0;
  const weeklyActivity = Array.from({ length: 6 }).map((_, idx) => {
    const end = nowMs - (5 - idx) * 7 * dayMs;
    const start = end - 7 * dayMs;
    return (enrolledData || []).filter((row) => {
      if (!row.updated_at) return false;
      const ts = new Date(row.updated_at).getTime();
      return Number.isFinite(ts) && ts >= start && ts < end;
    }).length;
  });

  const profileStats = [
  {
    label: "Enrolled",
    value: enrolledCount
  },
  {
    label: "Completed",
    value: completedCount
  },
  {
    label: "Universities",
    value: universityCount
  },
  {
    label: "In Progress",
    value: inProgressCount
  }];

  return (
    <main className="w-full space-y-5">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Identity</h1>
            <p className="text-sm text-muted-foreground">Minimal snapshot of your learning profile and progress.</p>
          </div>
          <Badge className="shrink-0">LVL {Math.floor(completedCount / 2) + 1}</Badge>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-md bg-[#1f1f1f] text-white flex items-center justify-center text-xl font-semibold shrink-0">
                {name.substring(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-tight truncate text-slate-900">{name}</p>
                <p className="text-sm text-slate-500 truncate">{email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Last active:{" "}
                  {lastActiveDate ?
                  lastActiveDate.toLocaleDateString(lang, { month: "short", day: "numeric", year: "numeric" }) :
                  "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {profileStats.map((item) => (
            <Card key={item.label}>
              <CardContent className="p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Learning Identity</CardTitle>
            <p className="text-xs text-muted-foreground">{dict.dashboard.identity.neural_map}</p>
          </CardHeader>
          <CardContent>
            <LearningProfileChart
              data={allFieldStats}
              unitLabel={dict.dashboard.identity.units}
              emptyText={dict.dashboard.identity.no_data}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Course Status</CardTitle>
            <p className="text-xs text-muted-foreground">Enrollment distribution</p>
          </CardHeader>
          <CardContent>
            <CourseStatusChart
              data={recentStatuses}
              emptyText={dict.dashboard.identity.no_data}
              recentUpdates30={recentUpdates30}
              inProgressCount={inProgressCount}
              stalledCount={stalledCount}
              avgProgress={avgProgress}
              weeklyActivity={weeklyActivity}
            />
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section>
        <RoadmapAchievementsSection
          availableSemesters={availableSemesters}
          completed={completedAchievements}
          title={dict.dashboard.roadmap.phase_2_title}
          emptyText={dict.dashboard.roadmap.peak_ahead} />
      </section>
    </main>);

}
