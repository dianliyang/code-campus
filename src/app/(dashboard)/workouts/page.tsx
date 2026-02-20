import { Suspense } from "react";
import WorkoutSidebar from "@/components/workouts/WorkoutSidebar";
import WorkoutList from "@/components/workouts/WorkoutList";
import { createClient, mapWorkoutFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { getWorkoutLastUpdateTime } from "@/actions/scrapers";
import { aggregateWorkoutsByName } from "@/lib/workouts";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WorkoutsPage({ searchParams }: PageProps) {
  const [lang, params] = await Promise.all([
    getLanguage(),
    searchParams,
  ]);
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-4">
      <Suspense fallback={null}>
        <SidebarData dict={dict.dashboard.workouts} />
      </Suspense>
      <Suspense fallback={<WorkoutListSkeleton />}>
        <WorkoutListData params={params} dict={dict.dashboard.workouts} />
      </Suspense>
    </div>
  );
}

async function SidebarData({ dict }: { 
  dict: Dictionary['dashboard']['workouts']
}) {
  const supabase = await createClient();

  const { data: workoutsData, error } = await supabase
    .from('workouts')
    .select('*');

  if (error) {
    console.error("[Supabase] Fetch sidebar workouts error:", error);
    return <WorkoutSidebar categories={[]} statuses={[]} dict={dict} />;
  }

  const aggregatedWorkouts = aggregateWorkoutsByName(
    (workoutsData || []).map((row: any) => mapWorkoutFromRow(row)) // eslint-disable-line @typescript-eslint/no-explicit-any
  );

  const categoryCounts: Record<string, number> = {};
  aggregatedWorkouts.forEach((w) => {
    const name = w.categoryEn || w.category;
    if (name) categoryCounts[name] = (categoryCounts[name] || 0) + 1;
  });
  
  const categories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const statusCounts: Record<string, number> = {};
  aggregatedWorkouts.forEach((w) => {
    const name = w.bookingStatus;
    if (name) statusCounts[name] = (statusCounts[name] || 0) + 1;
  });
  const statuses = Object.entries(statusCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return <WorkoutSidebar categories={categories} statuses={statuses} dict={dict} />;
}

async function WorkoutListData({ params, dict }: { 
  params: Record<string, string | string[] | undefined>, 
  dict: Dictionary['dashboard']['workouts'] 
}) {
  const page = parseInt((params.page as string) || "1");
  const ALLOWED_PER_PAGE = [12, 24, 48];
  const rawPerPage = parseInt((params.perPage as string) || "12");
  const size = ALLOWED_PER_PAGE.includes(rawPerPage) ? rawPerPage : 12;
  const offset = (page - 1) * size;
  const query = (params.q as string) || "";
  const sort = (params.sort as string) || "title";
  
  const categories = ((params.categories as string) || "").split(",").filter(Boolean);
  const days = ((params.days as string) || "").split(",").filter(Boolean);
  const status = ((params.status as string) || "").split(",").filter(Boolean);

  const [dbWorkouts, lastUpdated] = await Promise.all([
    fetchWorkouts(page, size, offset, query, sort, categories, days, status),
    getWorkoutLastUpdateTime()
  ]);

  return (
    <WorkoutList 
      initialWorkouts={dbWorkouts.items}
      totalItems={dbWorkouts.total}
      totalPages={dbWorkouts.pages}
      currentPage={page}
      perPage={size}
      dict={dict}
      lastUpdated={lastUpdated}
    />
  );
}

async function fetchWorkouts(
  page: number, 
  size: number, 
  offset: number, 
  query: string, 
  sort: string, 
  categories: string[], 
  days: string[], 
  status: string[]
) {
  const supabase = await createClient();
  
  let supabaseQuery = supabase
    .from('workouts')
    .select('*', { count: 'exact' });

  if (query) {
    // Using 'simple' config to match the search_vector definition in schema
    // 'plain' type is better for simple keyword matching
    supabaseQuery = supabaseQuery.textSearch('search_vector', query, { config: 'simple', type: 'plain' });
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
  if (sort === 'price') supabaseQuery = supabaseQuery.order('price_student', { ascending: true });
  else if (sort === 'newest') supabaseQuery = supabaseQuery.order('updated_at', { ascending: false });
  else if (sort === 'day') supabaseQuery = supabaseQuery.order('day_of_week', { ascending: true });
  else supabaseQuery = supabaseQuery.order('title', { ascending: true });

  const { data, error } = await supabaseQuery;

  if (error) {
    console.error("[Supabase] Fetch workouts error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const allItems = aggregateWorkoutsByName((data || []).map((row: any) => mapWorkoutFromRow(row))); // eslint-disable-line @typescript-eslint/no-explicit-any
  const total = allItems.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const items = allItems.slice(offset, offset + size);

  return { items, total, pages };
}

function WorkoutListSkeleton() {
  return <div className="flex-grow space-y-4 animate-pulse"><div className="h-10 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div></div>;
}
