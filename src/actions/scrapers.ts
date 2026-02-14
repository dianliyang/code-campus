"use server";

import { CAUSport } from "@/lib/scrapers/cau-sport";
import { SupabaseDatabase, createClient, mapWorkoutFromRow } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

  if (status.length > 0) {
    supabaseQuery = supabaseQuery.in('booking_status', status);
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
