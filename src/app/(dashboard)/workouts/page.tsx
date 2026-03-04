import { Suspense } from "react";
import WorkoutSidebar from "@/components/workouts/WorkoutSidebar";
import WorkoutList from "@/components/workouts/WorkoutList";
import { createClient, mapWorkoutFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { getWorkoutLastUpdateTime } from "@/actions/scrapers";
import { aggregateWorkoutsByName } from "@/lib/workouts";
import { Separator } from "@/components/ui/separator";
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
    <div className="h-full flex flex-col gap-4">
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
      <Separator />
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

  const aggregatedWorkouts = aggregateWorkoutsByName(
    (workoutsData || []).map((row: any) => mapWorkoutFromRow(row)) // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  const categoryCounts: Record<string, number> = {};
  aggregatedWorkouts.forEach((w) => {
    let name = w.categoryEn || w.category;
    if (name && (name.toLowerCase().includes("semester fee") || name.toLowerCase().includes("semestergebühr"))) {
      name = "Semester Fee";
    }
    if (name) categoryCounts[name] = (categoryCounts[name] || 0) + 1;
  });

  const categories = Object.entries(categoryCounts).
  map(([name, count]) => ({ name, count })).
  sort((a, b) => b.count - a.count);

  const statusCounts: Record<string, number> = {};
  aggregatedWorkouts.forEach((w) => {
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
  );

  return (
    <WorkoutList
      initialWorkouts={dbWorkouts.items}
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
selectedCategory: string)
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

  if (categories.length > 0) {
    // Check both category and category_en
    supabaseQuery = supabaseQuery.or(`category.in.(${categories.join(',')}),category_en.in.(${categories.join(',')})`);
  }

  if (days.length > 0) {
    supabaseQuery = supabaseQuery.in('day_of_week', days);
  }

  // Filter out expired and fully booked workouts by default unless explicitly requested
  if (status.length > 0) {
    supabaseQuery = supabaseQuery.in('booking_status', status);
  } else {
    supabaseQuery = supabaseQuery.not('booking_status', 'in', '("expired","fully_booked")');
  }

  // Sorting
  if (sort === 'price') supabaseQuery = supabaseQuery.order('price_student', { ascending: true });else
  if (sort === 'newest') supabaseQuery = supabaseQuery.order('updated_at', { ascending: false });else
  if (sort === 'day') supabaseQuery = supabaseQuery.order('day_of_week', { ascending: true });else
  supabaseQuery = supabaseQuery.order('title', { ascending: true });

  const { data, error } = await supabaseQuery;

  if (error) {
    console.error("[Supabase] Fetch workouts error:", error);
    return { items: [], total: 0, categoryGroups: [], selectedCategory: "" };
  }

  const allItems = aggregateWorkoutsByName((data || []).map((row: any) => mapWorkoutFromRow(row))); // eslint-disable-line @typescript-eslint/no-explicit-any
  const grouped = new Map<string, typeof allItems>();
  allItems.forEach((w) => {
    let key = (w.categoryEn || w.category || "Other").trim();
    if (key.toLowerCase().includes("semester fee") || key.toLowerCase().includes("semestergebühr")) {
      key = "Semester Fee";
    }
    const arr = grouped.get(key) || [];
    arr.push(w);
    grouped.set(key, arr);
  });

  const categoryGroups = Array.from(grouped.entries()).
  map(([category, items]) => {
    const prices = items.
    map((i) => i.priceStudent).
    filter((v): v is number => typeof v === "number");
    return {
      category,
      count: items.length,
      minStudentPrice: prices.length ? Math.min(...prices) : null,
      maxStudentPrice: prices.length ? Math.max(...prices) : null
    };
  }).
  sort((a, b) => {
    const isASemesterFee = a.category.toLowerCase().includes("semester fee") || a.category.toLowerCase().includes("semestergebühr");
    const isBSemesterFee = b.category.toLowerCase().includes("semester fee") || b.category.toLowerCase().includes("semestergebühr");
    if (isASemesterFee && !isBSemesterFee) return -1;
    if (!isASemesterFee && isBSemesterFee) return 1;
    return a.category.localeCompare(b.category);
  });

  const activeCategory = selectedCategory && grouped.has(selectedCategory) ?
  selectedCategory :
  categoryGroups[0]?.category || "";
  const items = activeCategory ? grouped.get(activeCategory) || [] : [];

  return { items, total: items.length, categoryGroups, selectedCategory: activeCategory };
}
