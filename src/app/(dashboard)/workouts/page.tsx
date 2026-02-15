import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import WorkoutSidebar from "@/components/workouts/WorkoutSidebar";
import WorkoutList from "@/components/workouts/WorkoutList";
import { createClient, mapWorkoutFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { getWorkoutLastUpdateTime } from "@/actions/scrapers";

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
    <div className="flex flex-col min-h-screen bg-white">
      <Hero dict={dict.dashboard} />
      
      <div className="flex-grow max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarData dict={dict.dashboard.workouts} />
        </Suspense>
        
        <Suspense fallback={<WorkoutListSkeleton />}>
          <WorkoutListData params={params} dict={dict.dashboard.workouts} />
        </Suspense>
      </div>
    </div>
  );
}

async function SidebarData({ dict }: { 
  dict: Dictionary['dashboard']['workouts']
}) {
  const supabase = await createClient();

  // Fetch distinct categories with counts
  const { data: categoriesData } = await supabase
    .from('workouts')
    .select('category_en, category');

  // Fetch distinct statuses with counts
  const { data: statusesData } = await supabase
    .from('workouts')
    .select('booking_status');

  const categoryCounts: Record<string, number> = {};
  categoriesData?.forEach(w => {
    const name = w.category_en || w.category;
    if (name) categoryCounts[name] = (categoryCounts[name] || 0) + 1;
  });
  
  const categories = Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const statusCounts: Record<string, number> = {};
  statusesData?.forEach(w => {
    const name = w.booking_status;
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
  const size = 12;
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

  const { data, count, error } = await supabaseQuery.range(offset, offset + size - 1);

  if (error) {
    console.error("[Supabase] Fetch workouts error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const items = (data || []).map((row: any) => mapWorkoutFromRow(row)); // eslint-disable-line @typescript-eslint/no-explicit-any

  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return { items, total, pages };
}

function SidebarSkeleton() {
  return <div className="w-64 space-y-8 animate-pulse"><div className="h-4 bg-gray-100 rounded w-1/2"></div><div className="space-y-4"><div className="h-8 bg-gray-50 rounded"></div><div className="h-8 bg-gray-50 rounded"></div></div></div>;
}

function WorkoutListSkeleton() {
  return <div className="flex-grow space-y-4 animate-pulse"><div className="h-10 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div></div>;
}
