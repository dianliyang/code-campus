"use server";

import { MIT } from "@/lib/scrapers/mit";
import { Stanford } from "@/lib/scrapers/stanford";
import { CMU } from "@/lib/scrapers/cmu";
import { UCB } from "@/lib/scrapers/ucb";
import { CAU } from "@/lib/scrapers/cau";
import { CAUSport } from "@/lib/scrapers/cau-sport";
import { BaseScraper } from "@/lib/scrapers/BaseScraper";
import { SupabaseDatabase, createAdminClient, createClient, mapWorkoutFromRow } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { aggregateWorkoutsByName } from "@/lib/workouts";
import { revalidatePath } from "next/cache";
import { completeScraperJob, failScraperJob, startScraperJob } from "@/lib/scrapers/scraper-jobs";

function isCauProjectSeminarWorkshop(
  item: { title?: string; details?: Record<string, unknown> },
): boolean {
  const category = typeof item.details?.category === "string" ? item.details.category : "";
  const projectTableCategories = new Set([
    "Seminar",
    "Advanced Project",
    "Involvement in a working group",
    "Open Elective",
    "Colloquia and study groups",
    "Master Thesis Supervision Seminar",
  ]);
  const title = (item.title || "").toLowerCase();

  return (
    projectTableCategories.has(category) ||
    title.includes("project") ||
    title.includes("seminar") ||
    title.includes("workshop")
  );
}

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
    const startedAtMs = Date.now();

    if (university === "cau-sport") {
      const jobId = await startScraperJob({
        university: "cau-sport",
        semester,
        trigger: "manual",
        triggeredByUserId: user.id,
        forceUpdate: true,
        jobType: "workouts",
      });
      const scraper = new CAUSport();
      scraper.semester = semester;
      try {
        const workouts = await scraper.retrieveWorkouts();

        const supabase = createAdminClient();
        const source = "CAU Kiel Sportzentrum";
        const { error: deleteError } = await supabase
          .from("workouts")
          .delete()
          .eq("source", source);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        if (workouts.length > 0) {
          await db.saveWorkouts(workouts);
        }

        await completeScraperJob(jobId, {
          courseCount: workouts.length,
          durationMs: Date.now() - startedAtMs,
          meta: { saved_workouts: workouts.length, semester },
        });
        revalidatePath("/workouts");
        return { success: true, count: workouts.length };
      } catch (error) {
        await failScraperJob(jobId, error, Date.now() - startedAtMs);
        throw error;
      }
    }

    let scraper: BaseScraper | null = null;

    if (university === 'mit') scraper = new MIT();
    else if (university === 'stanford') scraper = new Stanford();
    else if (university === 'cmu') scraper = new CMU();
    else if (university === 'ucb') scraper = new UCB();
    else if (university === "cau") scraper = new CAU();

    if (!scraper) throw new Error(`University "${university}" not found.`);
    const jobId = await startScraperJob({
      university: scraper.name,
      semester,
      trigger: "manual",
      triggeredByUserId: user.id,
      forceUpdate,
      jobType: "courses",
      meta: { requested_university: university },
    });

    scraper.semester = semester;
    scraper.db = db;

    console.log(`[Manual Scrape] Running ${scraper.name} for ${semester}...`);
    try {
      const items = await scraper.retrieve();

      if (items.length > 0) {
        if (university === "cau") {
          const projectsSeminars = items.filter((item) =>
            isCauProjectSeminarWorkshop({
              title: item.title,
              details: (item.details as Record<string, unknown> | undefined) || {},
            }),
          );
          const standardCourses = items.filter(
            (item) =>
              !isCauProjectSeminarWorkshop({
                title: item.title,
                details: (item.details as Record<string, unknown> | undefined) || {},
              }),
          );

          if (standardCourses.length > 0) {
            await db.saveCourses(standardCourses, { forceUpdate });
          }
          if (projectsSeminars.length > 0) {
            await db.saveProjectsSeminars(projectsSeminars);
          }
          revalidatePath("/projects-seminars");
          await completeScraperJob(jobId, {
            courseCount: items.length,
            durationMs: Date.now() - startedAtMs,
            meta: {
              saved_courses: standardCourses.length,
              saved_projects_seminars: projectsSeminars.length,
              semester,
              force_update: forceUpdate,
            },
          });
        } else {
          await db.saveCourses(items, { forceUpdate });
          await completeScraperJob(jobId, {
            courseCount: items.length,
            durationMs: Date.now() - startedAtMs,
            meta: { saved_courses: items.length, semester, force_update: forceUpdate },
          });
        }
        revalidatePath("/courses");
        return { success: true, count: items.length };
      }

      await completeScraperJob(jobId, {
        courseCount: 0,
        durationMs: Date.now() - startedAtMs,
        meta: { semester, force_update: forceUpdate },
      });
      return { success: true, count: 0 };
    } catch (error) {
      await failScraperJob(jobId, error, Date.now() - startedAtMs);
      throw error;
    }
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

  const { data, error } = await supabaseQuery;

  if (error) {
    console.error("[fetchWorkoutsAction] Error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const allItems = aggregateWorkoutsByName((data || []).map((row) => mapWorkoutFromRow(row as any))); // eslint-disable-line @typescript-eslint/no-explicit-any
  const total = allItems.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const items = allItems.slice(offset, offset + size);

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

export async function refreshCauSportWorkoutsAction() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");

  try {
    const db = new SupabaseDatabase();
    const scraper = new CAUSport();
    const workouts = await scraper.retrieveWorkouts();

    const supabase = createAdminClient();
    const source = "CAU Kiel Sportzentrum";
    const { error: deleteError } = await supabase
      .from("workouts")
      .delete()
      .eq("source", source);

    if (deleteError) {
      console.error("[refreshCauSportWorkoutsAction] Failed to clear old workouts:", deleteError);
      return { success: false, error: deleteError.message };
    }

    if (workouts.length > 0) {
      await db.saveWorkouts(workouts);
    }

    revalidatePath("/workouts");
    return { success: true, count: workouts.length };
  } catch (error) {
    console.error("[refreshCauSportWorkoutsAction] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
