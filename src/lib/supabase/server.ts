import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Course as ScrapedCourse } from "../scrapers/types";
import type { Course as AppCourse } from "@/types";
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

    // Bulk upsert based on university and course_code
    const toUpsert = courses.map((c) => ({
      university: university,
      course_code: c.courseCode,
      title: c.title,
      units: c.units,
      credit: c.credit,
      description: c.description,
      url: c.url,
      details: c.details as Json,
      department: c.department,
      corequisites: c.corequisites,
      level: c.level,
      difficulty: c.difficulty,
      popularity: c.popularity || 0,
      workload: c.workload,
      is_hidden: c.isHidden || false,
      is_internal: c.isInternal || false,
    }));

    // 1. Upsert Courses (Ignore duplicates to preserve existing details)
    const { error } = await supabase
      .from("courses")
      .upsert(toUpsert, { onConflict: 'university,course_code', ignoreDuplicates: true });
      
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

  const parsedDetails =
    typeof row.details === "string"
      ? JSON.parse(row.details)
      : row.details || {};

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
