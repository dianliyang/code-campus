import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Course } from "../scrapers/types";

export async function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (envUrl) return envUrl;
  else {
    throw new Error("Missing NEXT_PUBLIC_VERCEL_URL environment variable");
  }
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
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
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(`Supabase Admin configuration missing. 
      URL: ${url ? "Found" : "MISSING"}
      KEY: ${key ? "Found" : "MISSING"}
      Check your .env file.`);
  }

  return createSupabaseClient(url, key);
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export class SupabaseDatabase {
  async saveCourses(courses: Course[]): Promise<void> {
    if (courses.length === 0) return;

    const university = courses[0].university;
    console.log(
      `[Supabase] Saving ${courses.length} courses for ${university}...`
    );

    const supabase = createAdminClient();

    // Clear existing
    await this.clearUniversity(university);

    // Bulk insert
    const toInsert = courses.map((c) => ({
      university: c.university,
      course_code: c.courseCode,
      title: c.title,
      units: c.units,
      description: c.description,
      url: c.url,
      details: c.details,
      department: c.department,
      corequisites: c.corequisites,
      level: c.level,
      difficulty: c.difficulty,
      popularity: c.popularity || 0,
      workload: c.workload,
      is_hidden: c.isHidden || false,
    }));

    const { error } = await supabase.from("courses").insert(toInsert);
    if (error) {
      console.error(
        `[Supabase] Error saving courses for ${university}:`,
        error
      );
      throw error;
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

export function mapCourseFromRow(
  row: Record<string, unknown>
): Course & { id: number; url: string } {
  const university = String(row.university || "").toLowerCase();
  const courseCode = String(row.course_code || row.course_code || "");
  const code = encodeURIComponent(courseCode);

  const fallbacks: Record<string, string> = {
    mit: `https://student.mit.edu/catalog/search.cgi?search=${code}`,
    stanford: `https://explorecourses.stanford.edu/search?q=${code}`,
    ucb: `https://classes.berkeley.edu/search/class/${code}`,
    cmu: "https://enr-apps.as.cmu.edu/open/SOC/SOCServlet/search",
  };

  return {
    id: Number(row.id),
    university,
    courseCode,
    title: String(row.title || ""),
    units: String(row.units || ""),
    description: String(row.description || ""),
    url: (row.url as string) || fallbacks[university] || "#",
    department: String(row.department || ""),
    corequisites: String(row.corequisites || ""),
    level: String(row.level || ""),
    difficulty: Number(row.difficulty || 0),
    details:
      typeof row.details === "string"
        ? JSON.parse(row.details)
        : row.details || {},
    popularity: Number(row.popularity || 0),
    workload: String(row.workload || ""),
    isHidden: Boolean(row.is_hidden),
  };
}
