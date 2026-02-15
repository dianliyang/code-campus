import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Course as ScrapedCourse } from "../scrapers/types";
import type { WorkoutCourse } from "../scrapers/cau-sport";
import type { Course as AppCourse, Workout } from "@/types";
import { Database, Json } from "./database.types";

export async function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    const formattedEnvUrl = envUrl.replace(/\/$/, "");
    console.log(`[getBaseUrl] Using NEXT_PUBLIC_APP_URL: ${formattedEnvUrl}`);
    return formattedEnvUrl;
  }

  throw new Error("NEXT_PUBLIC_APP_URL is not defined");
}

export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
});

let _adminClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(`Supabase Admin configuration missing.
      URL: ${url ? "Found" : "MISSING"}
      KEY: ${key ? "Found" : "MISSING"}
      Check your .env file.`);
  }

  _adminClient = createSupabaseClient<Database>(url, key);
  return _adminClient;
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export class SupabaseDatabase {
  async saveCourses(courses: ScrapedCourse[]): Promise<void> {
    if (courses.length === 0) return;

    const university = formatUniversityName(courses[0].university);
    console.log(
      `[Supabase] Saving ${courses.length} courses for ${university}...`
    );

    const supabase = createAdminClient();

    // Separate courses into those that need full update and those that are partially scraped
    const toUpsert = courses.map((c) => {
      const payload: {
        university: string;
        course_code: string;
        title: string;
        units?: string;
        credit?: number;
        url?: string;
        department?: string;
        corequisites?: string;
        level?: string;
        difficulty?: number;
        popularity: number;
        workload?: string;
        is_hidden: boolean;
        is_internal: boolean;
        description?: string;
        details?: Json;
        latest_semester?: Json;
      } = {
        university: university,
        course_code: c.courseCode,
        title: c.title,
        units: c.units,
        credit: c.credit,
        url: c.url,
        department: c.department,
        corequisites: c.corequisites,
        level: c.level,
        difficulty: c.difficulty,
        popularity: c.popularity || 0,
        workload: c.workload,
        is_hidden: c.isHidden || false,
        is_internal: c.isInternal || false,
      };

      // If NOT partially scraped, we include description and details and update latest_semester
      // If IT IS partially scraped, we skip these to avoid overwriting existing data
      if (!c.details?.is_partially_scraped) {
        payload.description = c.description;
        payload.details = c.details as Json;
        if (c.semesters && c.semesters.length > 0) {
          payload.latest_semester = { term: c.semesters[0].term, year: c.semesters[0].year };
        }
      }

      return payload;
    });

    // 1. Upsert Courses
    const { error } = await supabase
      .from("courses")
      .upsert(toUpsert, { onConflict: 'university,course_code' });
      
    if (error) {
      console.error(
        `[Supabase] Error saving courses for ${university}:`,
        error
      );
      throw error;
    }

    // 2. Fetch IDs for ALL courses in this batch (both new and existing)
    // We need to match based on university and course_code.
    const courseCodes = courses.map(c => c.courseCode);
    const { data: allCourses, error: fetchError } = await supabase
      .from("courses")
      .select("id, course_code")
      .eq("university", university)
      .in("course_code", courseCodes);

    if (fetchError) {
      console.error(`[Supabase] Error fetching course IDs:`, fetchError);
      // Continue? If we can't get IDs, we can't link semesters.
      return; 
    }

    // Handle Semesters
    const coursesWithSemesters = courses.filter(c => c.semesters && c.semesters.length > 0);
    if (coursesWithSemesters.length > 0 && allCourses) {
      // 1. Collect all unique semesters
      const uniqueSemesters = new Map<string, { term: string, year: number }>();
      coursesWithSemesters.forEach(c => {
        c.semesters?.forEach(s => {
          const key = `${s.term}-${s.year}`;
          uniqueSemesters.set(key, s);
        });
      });

      // 2. Upsert semesters and get IDs
      // Note: upsert on 'year, term' unique constraint
      const semestersArray = Array.from(uniqueSemesters.values());
      const { data: savedSemesters, error: semError } = await supabase
        .from('semesters')
        .upsert(semestersArray, { onConflict: 'year, term' })
        .select('id, term, year');
      
      if (semError) {
         console.error(`[Supabase] Error saving semesters:`, semError);
      } else if (savedSemesters) {
        // 3. Map semester keys to IDs
        const semesterIdMap = new Map<string, number>();
        savedSemesters.forEach(s => {
           semesterIdMap.set(`${s.term}-${s.year}`, s.id);
        });

        // 4. Create course_semesters links
        const courseCodeToId = new Map<string, number>();
        allCourses.forEach(c => {
          courseCodeToId.set(c.course_code, c.id);
        });

        const semesterLinks: { course_id: number, semester_id: number }[] = [];
        
        coursesWithSemesters.forEach(c => {
          const courseId = courseCodeToId.get(c.courseCode);
          if (!courseId) return;

          c.semesters?.forEach(s => {
            const semId = semesterIdMap.get(`${s.term}-${s.year}`);
            if (semId) {
              semesterLinks.push({ course_id: courseId, semester_id: semId });
            }
          });
        });

        if (semesterLinks.length > 0) {
           const { error: linkError } = await supabase
             .from('course_semesters')
             .upsert(semesterLinks, { onConflict: 'course_id, semester_id' });
           
           if (linkError) {
             console.error(`[Supabase] Error linking course semesters:`, linkError);
           }
        }
      }
    }
  }

  async saveWorkouts(workouts: WorkoutCourse[]): Promise<void> {
    if (workouts.length === 0) return;

    const source = workouts[0].source;
    console.log(`[Supabase] Saving ${workouts.length} workouts for ${source}...`);

    const supabase = createAdminClient();

    // Parse date strings like "27.10." into proper DATE values for the current academic year
    const parseGermanDate = (dateStr: string, semester: string): string | null => {
      if (!dateStr) return null;
      const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\./);
      if (!match) return null;
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      // Determine year from semester: WiSe 25/26 → Oct-Dec = 2025, Jan-Apr = 2026
      const semMatch = semester.match(/(\d{2})\/(\d{2})/);
      if (semMatch) {
        const startYear = 2000 + parseInt(semMatch[1]);
        const endYear = 2000 + parseInt(semMatch[2]);
        const year = month >= 8 ? startYear : endYear;
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      return null;
    };

    const parseTime = (timeStr: string): string | null => {
      if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
      return timeStr + ":00";
    };

    const toUpsertRaw = workouts.map((w) => ({
      source: w.source,
      course_code: w.courseCode,
      category: w.category,
      category_en: w.categoryEn || null,
      title: w.title,
      title_en: w.titleEn || null,
      day_of_week: w.dayOfWeek || null,
      start_time: parseTime(w.startTime),
      end_time: parseTime(w.endTime),
      location: w.location || null,
      location_en: w.locationEn || null,
      instructor: w.instructor || null,
      start_date: parseGermanDate(w.startDate, w.semester),
      end_date: parseGermanDate(w.endDate, w.semester),
      price_student: w.priceStudent,
      price_staff: w.priceStaff,
      price_external: w.priceExternal,
      price_external_reduced: w.priceExternalReduced,
      booking_status: w.bookingStatus,
      booking_url: w.bookingUrl || null,
      url: w.url || null,
      semester: w.semester || null,
      details: (w.details && Object.keys(w.details).length > 0 ? w.details : {}) as Json,
      updated_at: new Date().toISOString(),
    }));

    // Deduplicate based on source and course_code to avoid Postgres error 21000
    const deduplicatedMap = new Map();
    toUpsertRaw.forEach(item => {
      const key = `${item.source}-${item.course_code}`;
      deduplicatedMap.set(key, item);
    });
    const toUpsert = Array.from(deduplicatedMap.values());

    // Batch upsert in chunks of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
      const batch = toUpsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("workouts")
        .upsert(batch, { onConflict: "source,course_code" });

      if (error) {
        console.error(`[Supabase] Error saving workouts batch ${i / BATCH_SIZE + 1}:`, error);
        throw error;
      }
    }

    console.log(`[Supabase] Saved ${toUpsert.length} workouts for ${source}.`);
  }

  async clearUniversity(university: string): Promise<void> {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("university", university);

    if (error) {
      console.error(`[Supabase] Error clearing ${university}:`, error);
      throw error;
    }
  }

  async getExistingCourseCodes(university: string): Promise<Map<string, { term: string, year: number } | null>> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('courses')
      .select('course_code, latest_semester')
      .eq('university', university);

    if (error) {
      console.error(`[Supabase] Error fetching existing course codes for ${university}:`, error);
      return new Map();
    }

    const map = new Map<string, { term: string, year: number } | null>();
    (data || []).forEach(row => {
      map.set(row.course_code, row.latest_semester as { term: string, year: number } | null);
    });
    return map;
  }
}

export async function incrementPopularity(courseId: number): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("increment_popularity", {
    row_id: courseId,
  });
  if (error) {
    // Fallback if RPC is not defined yet
    const { data: current } = await supabase
      .from("courses")
      .select("popularity")
      .eq("id", courseId)
      .single();
    await supabase
      .from("courses")
      .update({ popularity: (current?.popularity || 0) + 1 })
      .eq("id", courseId);
  }
}

export async function decrementPopularity(courseId: number): Promise<void> {
  const supabase = await createClient();
  // Try RPC fallback; if RPC not available, do safe decrement
  try {
    const { error } = await supabase.rpc("decrement_popularity" as "increment_popularity", {
      row_id: courseId,
    });
    if (error) throw error;
  } catch {
    // Safe fallback: read current popularity and decrement but not below 0
    const { data: current } = await supabase
      .from("courses")
      .select("popularity")
      .eq("id", courseId)
      .single();
    const newVal = Math.max(0, (current?.popularity || 0) - 1);
    await supabase
      .from("courses")
      .update({ popularity: newVal })
      .eq("id", courseId);
  }
}

export function formatUniversityName(name: string): string {
  const n = name.toLowerCase().trim();
  if (n === 'mit' || n === 'massachusetts institute of technology') return 'MIT';
  if (n === 'stanford' || n === 'stanford university') return 'Stanford';
  if (n === 'cmu' || n === 'carnegie mellon' || n === 'carnegie mellon university' || n === 'carnegie-mellon') return 'CMU';
  if (n === 'ucb' || n === 'uc berkeley' || n === 'university of california berkeley' || n === 'university of california, berkeley') return 'UC Berkeley';
  if (n === 'cau' || n === 'cau kiel' || n === 'christian-albrechts-universität') return 'CAU Kiel';
  if (n === 'ncu') return 'NCU';
  if (n === 'nju') return 'NJU';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function mapCourseFromRow(
  row: Record<string, unknown>
): AppCourse {
  const university = formatUniversityName(String(row.university || ""));
  const courseCode = String(row.course_code || row.course_code || "");
  const code = encodeURIComponent(courseCode);

  const fallbacks: Record<string, string> = {
    mit: `https://student.mit.edu/catalog/search.cgi?search=${code}`,
    stanford: `https://explorecourses.stanford.edu/search?q=${code}`,
    ucb: `https://classes.berkeley.edu/search/class/${code}`,
    cmu: "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search",
  };

  let parsedDetails: Record<string, unknown> = {};
  if (typeof row.details === "string") {
    try {
      const parsed = JSON.parse(row.details);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedDetails = parsed as Record<string, unknown>;
      }
    } catch {
      // Ignore malformed JSON in legacy rows and fall back to empty object.
      parsedDetails = {};
    }
  } else if (row.details && typeof row.details === "object" && !Array.isArray(row.details)) {
    parsedDetails = row.details as Record<string, unknown>;
  }

  return {
    id: Number(row.id),
    university,
    courseCode,
    title: String(row.title || ""),
    fields: [],
    semesters: [],
    units: String(row.units || ""),
    credit: typeof row.credit === 'number' ? row.credit : undefined,
    description: String(row.description || ""),
    url: (row.url as string) || fallbacks[university] || "#",
    department: String(row.department || ""),
    corequisites: String(row.corequisites || ""),
    level: String(row.level || ""),
    prerequisites: String(row.prerequisites || ""),
    relatedUrls: Array.isArray(row.related_urls) ? (row.related_urls as string[]) : [],
    crossListedCourses: String(row.cross_listed_courses || ""),
    difficulty: Number(row.difficulty || 0),
    details: parsedDetails,
    instructors: Array.isArray(row.instructors) ? (row.instructors as string[]) : [],
    popularity: Number(row.popularity || 0),
    workload: String(row.workload || ""),
    isHidden: Boolean(row.is_hidden),
    isInternal: Boolean(row.is_internal),
    createdAt: typeof row.created_at === "string" ? row.created_at : undefined,
  };
}

export function mapWorkoutFromRow(row: any): Workout { // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    id: Number(row.id),
    source: String(row.source || ""),
    courseCode: String(row.course_code || ""),
    category: String(row.category || ""),
    categoryEn: row.category_en ? String(row.category_en) : null,
    title: String(row.title || ""),
    titleEn: row.title_en ? String(row.title_en) : null,
    dayOfWeek: row.day_of_week ? String(row.day_of_week) : null,
    startTime: row.start_time ? String(row.start_time) : null,
    endTime: row.end_time ? String(row.end_time) : null,
    location: row.location ? String(row.location) : null,
    locationEn: row.location_en ? String(row.location_en) : null,
    instructor: row.instructor ? String(row.instructor) : null,
    startDate: row.start_date ? String(row.start_date) : null,
    endDate: row.end_date ? String(row.end_date) : null,
    priceStudent: row.price_student != null ? Number(row.price_student) : null,
    priceStaff: row.price_staff != null ? Number(row.price_staff) : null,
    priceExternal: row.price_external != null ? Number(row.price_external) : null,
    priceExternalReduced: row.price_external_reduced != null ? Number(row.price_external_reduced) : null,
    bookingStatus: row.booking_status ? String(row.booking_status) : null,
    bookingUrl: row.booking_url ? String(row.booking_url) : null,
    url: row.url ? String(row.url) : null,
    semester: row.semester ? String(row.semester) : null,
    details: row.details as Record<string, unknown> | null,
  };
}
