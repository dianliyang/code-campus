import { Suspense } from "react";
import WorkoutSidebar from "@/components/workouts/WorkoutSidebar";
import WorkoutList from "@/components/workouts/WorkoutList";
import { createClient, getUser, mapWorkoutFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { getWorkoutLastUpdateTime } from "@/actions/scrapers";
import { buildVisibleWorkoutCategoryState } from "@/lib/workout-category-filtering";
import { getDashboardPageHeaderClassName } from "@/lib/dashboard-layout";
import { Badge } from "@/components/ui/badge";

interface PageProps {
  searchParams: Promise<{[key: string]: string | string[] | undefined;}>;
}

export default async function WorkoutsPage({ searchParams }: PageProps) {
  const [lang, params, lastUpdated] = await Promise.all([
  getLanguage(),
  searchParams,
  getWorkoutLastUpdateTime()]
  );
  const dict = await getDictionary(lang);
  const formattedUpdate = lastUpdated
    ? new Date(lastUpdated).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="h-full flex flex-col gap-4 px-4 pb-4">
      <div className={getDashboardPageHeaderClassName()}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Workouts
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse classes by category, compare options, and book quickly.
            </p>
          </div>
          {formattedUpdate ? (
            <Badge variant="secondary" className="mt-1">
              Updated {formattedUpdate}
            </Badge>
          ) : null}
        </div>
      </div>
      <Suspense fallback={null}>
        <SidebarData dict={dict.dashboard.workouts} />
      </Suspense>
      <div className="flex-1 min-h-0">
        <Suspense fallback={null}>
          <WorkoutListData params={params} dict={dict.dashboard.workouts} />
        </Suspense>
      </div>
    </div>);

}

async function SidebarData({ dict

}: {dict: Dictionary['dashboard']['workouts'];}) {
  const supabase = await createClient();

  const { data: workoutsData, error } = await supabase.
  from('workouts').
  select('*');

  if (error) {
    console.error("[Supabase] Fetch sidebar workouts error:", error);
    return <WorkoutSidebar categories={[]} statuses={[]} dict={dict} />;
  }

  const workouts = (workoutsData || []).map((row: any) => mapWorkoutFromRow(row)); // eslint-disable-line @typescript-eslint/no-explicit-any
  const visibleState = buildVisibleWorkoutCategoryState(workouts, [], "");

  const categoryCounts: Record<string, number> = {};
  visibleState.categoryGroups.forEach((group) => {
    categoryCounts[group.category] = group.count;
  });

  const categories = Object.entries(categoryCounts).
  map(([name, count]) => ({ name, count })).
  sort((a, b) => b.count - a.count);

  const statusCounts: Record<string, number> = {};
  workouts
    .filter((w) => w.bookingStatus !== "fully_booked" && w.bookingStatus !== "expired")
    .forEach((w) => {
    const name = w.bookingStatus;
    if (name) statusCounts[name] = (statusCounts[name] || 0) + 1;
  });
  const statuses = Object.entries(statusCounts).
  map(([name, count]) => ({ name, count })).
  sort((a, b) => b.count - a.count);

  return <WorkoutSidebar categories={categories} statuses={statuses} dict={dict} />;
}

async function WorkoutListData({ params, dict


}: {params: Record<string, string | string[] | undefined>;dict: Dictionary['dashboard']['workouts'];}) {
  const user = await getUser();
  const query = params.q as string || "";
  const sort = params.sort as string || "title";
  const categories = (params.categories as string || "").split(",").filter(Boolean);
  const days = (params.days as string || "").split(",").filter(Boolean);
  const status = (params.status as string || "").split(",").filter(Boolean);
  const selectedCategory = params.category as string || "";

  const dbWorkouts = await fetchWorkouts(
    query,
    sort,
    categories,
    days,
    status,
    selectedCategory,
    user?.id || null,
  );

  return (
    <WorkoutList
      initialWorkouts={dbWorkouts.items}
      initialEnrolledIds={dbWorkouts.enrolledIds}
      dict={dict}
      categoryGroups={dbWorkouts.categoryGroups}
      selectedCategory={dbWorkouts.selectedCategory} />);


}

async function fetchWorkouts(
query: string,
sort: string,
categories: string[],
days: string[],
status: string[],
selectedCategory: string,
userId: string | null)
{
  const supabase = await createClient();
  let supabaseQuery = supabase.
  from('workouts').
  select('*', { count: 'exact' });

  if (query) {
    // Transform query for prefix matching (e.g. "swim" -> "swim:*")
    const formattedQuery = query.
    trim().
    split(/\s+/).
    map((term) => `${term}:*`).
    join(' & ');

    supabaseQuery = supabaseQuery.textSearch('search_vector', formattedQuery, {
      config: 'english'
    });
  }

  if (days.length > 0) {
    supabaseQuery = supabaseQuery.in('day_of_week', days);
  }

  // Never filter expired at DB level — we need all statuses to build category groups correctly.
  // Status filtering is applied in-memory below so fully_booked categories still appear.

  // Sorting
  if (sort === 'price') supabaseQuery = supabaseQuery.order('price_student', { ascending: true });else
  if (sort === 'newest') supabaseQuery = supabaseQuery.order('updated_at', { ascending: false });else
  if (sort === 'day') supabaseQuery = supabaseQuery.order('day_of_week', { ascending: true });else
  supabaseQuery = supabaseQuery.order('title', { ascending: true });

  const [{ data, error }, enrolledRes] = await Promise.all([
    supabaseQuery,
    userId
      ? supabase
          .from("user_workouts")
          .select("workout_id")
          .eq("user_id", userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (error) {
    console.error("[Supabase] Fetch workouts error:", error);
    return { items: [], total: 0, categoryGroups: [], selectedCategory: "", enrolledIds: [] as number[] };
  }

  const enrolledIds = new Set(
    ((enrolledRes.data || []) as Array<{ workout_id: number }>).map((row) => Number(row.workout_id))
  );

  const allItemsRaw = (data || []).map((row: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    ...mapWorkoutFromRow(row),
    enrolled: enrolledIds.has(Number(row.id)),
  }));
  const visibleState = buildVisibleWorkoutCategoryState(allItemsRaw, categories, selectedCategory);

  return {
    items: visibleState.items,
    total: visibleState.items.length,
    categoryGroups: visibleState.categoryGroups,
    selectedCategory: visibleState.selectedCategory,
    enrolledIds: Array.from(enrolledIds),
  };
}
