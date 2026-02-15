"use server";

import { CAUSport } from "@/lib/scrapers/cau-sport";
import { MIT } from "@/lib/scrapers/mit";
import { Stanford } from "@/lib/scrapers/stanford";
import { CMU } from "@/lib/scrapers/cmu";
import { UCB } from "@/lib/scrapers/ucb";
import { CAU } from "@/lib/scrapers/cau";
import { BaseScraper } from "@/lib/scrapers/BaseScraper";
import { SupabaseDatabase, createClient, createAdminClient, mapWorkoutFromRow } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function runManualScraperAction({
  university,
  semester,
  forceUpdate = false
}: {
  university: string;
  semester: string;
  forceUpdate?: boolean;
}) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  try {
    const db = new SupabaseDatabase();
    let scraper: BaseScraper | null = null;

    if (university === 'mit') scraper = new MIT();
    else if (university === 'stanford') scraper = new Stanford();
    else if (university === 'cmu') scraper = new CMU();
    else if (university === 'ucb') scraper = new UCB();
    else if (university === 'cau') scraper = new CAU();
    else if (university === 'cau-sport') {
        const sportScraper = new CAUSport();
        sportScraper.semester = semester;
        const workouts = await sportScraper.retrieveWorkouts();
        if (workouts.length > 0) {
            await db.saveWorkouts(workouts);
            revalidatePath("/workouts");
            return { success: true, count: workouts.length };
        }
        return { success: true, count: 0 };
    }

    if (!scraper) throw new Error(`University "${university}" not found.`);

    scraper.semester = semester;
    scraper.db = db;

    console.log(`[Manual Scrape] Running ${scraper.name} for ${semester}...`);
    const items = await scraper.retrieve();

    if (items.length > 0) {
      if (scraper.name === 'cau') {
        const standardCategoryLabels = ['Standard Course', 'Compulsory elective modules in Computer Science'];
        const standardCourses = items.filter(item => standardCategoryLabels.includes((item.details as any)?.category)); // eslint-disable-line @typescript-eslint/no-explicit-any
        const projectsSeminars = items.filter(item => !standardCategoryLabels.includes((item.details as any)?.category)); // eslint-disable-line @typescript-eslint/no-explicit-any

        // Force update: mark all courses as fully scraped so upsert overwrites all fields
        if (forceUpdate) {
          for (const item of items) {
            if (item.details && (item.details as any).is_partially_scraped) { // eslint-disable-line @typescript-eslint/no-explicit-any
              delete (item.details as any).is_partially_scraped; // eslint-disable-line @typescript-eslint/no-explicit-any
            }
          }
        }

        if (standardCourses.length > 0) await db.saveCourses(standardCourses);
        if (projectsSeminars.length > 0) await db.saveProjectsSeminars(projectsSeminars);
      } else {
        await db.saveCourses(items);
      }
      revalidatePath("/courses");
      return { success: true, count: items.length };
    }

    return { success: true, count: 0 };
  } catch (error) {
    console.error(`[Manual Scrape] Failed for ${university}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

export async function fetchWorkoutsAction({
  page = 1,
  size = 12,
  query = "",
  sort = "title",
  categories = [] as string[],
  days = [] as string[],
  status = [] as string[]
}) {
  const supabase = await createClient();
  const offset = (page - 1) * size;
  
  let supabaseQuery = supabase
    .from('workouts')
    .select('*', { count: 'exact' });

  if (query) {
    supabaseQuery = supabaseQuery.textSearch('search_vector', query, { config: 'simple', type: 'plain' });
  }

  if (categories.length > 0) {
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
    console.error("[fetchWorkoutsAction] Error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const items = (data || []).map((row) => mapWorkoutFromRow(row as any)); // eslint-disable-line @typescript-eslint/no-explicit-any
  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return { items, total, pages };
}

export async function getWorkoutLastUpdateTime() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workouts')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.updated_at;
}

export async function runManualSportScraper() {
  const user = await getUser();
  
  // Security check: Only allow authorized users if needed, 
  // but for now we'll allow any logged in user to trigger it 
  // since it's a dev/prototype phase.
  if (!user) {
    throw new Error("Unauthorized");
  }

  try {
    const db = new SupabaseDatabase();
    const scraper = new CAUSport();
    
    console.log(`[Manual Scrape] Starting CAU-SPORT scraper...`);
    const workouts = await scraper.retrieveWorkouts();
    
    if (workouts.length > 0) {
      // Always override: clear existing workouts for this source first
      const supabase = await createClient();
      await supabase.from('workouts').delete().eq('source', scraper.name === 'cau-sport' ? 'CAU Kiel Sportzentrum' : scraper.name);

      await db.saveWorkouts(workouts);
      console.log(`[Manual Scrape] Successfully saved ${workouts.length} workouts.`);
      revalidatePath("/workouts");
      return { success: true, count: workouts.length };
    }
    
    return { success: true, count: 0 };
  } catch (error) {
    console.error(`[Manual Scrape] Failed:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

export async function clearCAUCoursesAction() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = createAdminClient();

  const { count: courseCount } = await supabase
    .from('courses')
    .delete({ count: 'exact' })
    .eq('university', 'CAU Kiel');

  const { count: psCount } = await supabase
    .from('projects_seminars')
    .delete({ count: 'exact' })
    .eq('university', 'CAU Kiel');

  const removed = (courseCount || 0) + (psCount || 0);
  console.log(`[CAU Clear] Removed ${courseCount || 0} courses + ${psCount || 0} projects/seminars`);
  revalidatePath("/courses");
  return { success: true, removed };
}
