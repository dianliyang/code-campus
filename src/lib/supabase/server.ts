import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Course as ScrapedCourse } from "../scrapers/types";
import type { WorkoutCourse } from "../scrapers/cau-sport";
import type { Course as AppCourse, Workout } from "@/types";
import { Database, Json } from "./database.types";
import { aggregateWorkoutCoursesByName } from "@/lib/workouts";

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

async function fetchProfileSettings(userId: string): Promise<Record<string, unknown> | null> {
  const supabase = createAdminClient();
  const selectVariants = [
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template, ai_planner_prompt_template, ai_topics_prompt_template, ai_course_update_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template, ai_planner_prompt_template, ai_topics_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_planner_prompt_template, ai_topics_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template, ai_planner_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template, ai_topics_prompt_template, ai_course_update_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_study_plan_prompt_template, ai_topics_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_topics_prompt_template, ai_course_update_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_topics_prompt_template, ai_usage_calls, ai_usage_tokens",
    "ai_default_model, ai_web_search_enabled, ai_prompt_template, ai_topics_prompt_template",
    "ai_web_search_enabled, ai_prompt_template, ai_topics_prompt_template",
    "ai_provider, ai_default_model, ai_web_search_enabled, ai_prompt_template",
    "ai_default_model, ai_web_search_enabled, ai_prompt_template",
    "ai_web_search_enabled, ai_prompt_template",
    "id",
  ];

  for (const selectColumns of selectVariants) {
    const { data, error } = await supabase
      .from("profiles")
      .select(selectColumns)
      .eq("id", userId)
      .maybeSingle();

    if (!error) {
      return data ? JSON.parse(JSON.stringify(data)) : null;
    }
  }

  return null;
}

export async function getCachedProfileSettings(userId: string): Promise<Record<string, unknown> | null> {
  return fetchProfileSettings(userId);
}

export function invalidateCachedProfileSettings(userId: string) {
  void userId;
}

function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return "";
}

function extractContentLinks(input: string): { cleanText: string; links: string[] } {
  const links: string[] = [];
  let text = input || "";

  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_, label: string, url: string) => {
    const normalized = normalizeExternalUrl(url);
    if (normalized) links.push(normalized);
    return label;
  });

  text = text.replace(/((?:https?:\/\/|www\.)[^\s<>"')\]]+)/gi, (match: string) => {
    const normalized = normalizeExternalUrl(match);
    if (normalized) links.push(normalized);
    return "";
  });

  const cleanText = text
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  return {
    cleanText: cleanText || "",
    links: Array.from(new Set(links)),
  };
}

export class SupabaseDatabase {
  async saveCourses(
    courses: ScrapedCourse[],
    options: { forceUpdate?: boolean } = {},
  ): Promise<void> {
    if (courses.length === 0) return;
    const { forceUpdate = false } = options;

    const university = formatUniversityName(courses[0].university);
    console.log(
      `[Supabase] Saving ${courses.length} courses for ${university}...`
    );

    const supabase = createAdminClient();
    let coursesForUpsert = courses;

    // CAU special handling:
    // Without force update, existing CAU rows only refresh details.schedule.
    if (university === "CAU Kiel" && !forceUpdate) {
      const courseCodes = courses.map((c) => c.courseCode);
      const { data: existingRows, error: existingFetchError } = await supabase
        .from("courses")
        .select("id, course_code, details")
        .eq("university", university)
        .in("course_code", courseCodes);

      if (existingFetchError) {
        console.error("[Supabase] Error fetching existing CAU courses:", existingFetchError);
        throw existingFetchError;
      }

      const existingByCode = new Map(
        (existingRows || []).map((row) => [row.course_code, row]),
      );

      const existingCourses = courses.filter((c) => existingByCode.has(c.courseCode));
      coursesForUpsert = courses.filter((c) => !existingByCode.has(c.courseCode));

      for (const course of existingCourses) {
        const existing = existingByCode.get(course.courseCode);
        if (!existing) continue;

        const existingDetails =
          typeof existing.details === "string"
            ? (JSON.parse(existing.details || "{}") as Record<string, unknown>)
            : ((existing.details as Record<string, unknown> | null) || {});

        const nextSchedule =
          course.details && typeof course.details === "object"
            ? ((course.details as Record<string, unknown>).schedule as Record<string, unknown> | undefined)
            : undefined;

        if (!nextSchedule) continue;

        const stableStringify = (value: unknown): string => {
          if (Array.isArray(value)) {
            return `[${value.map((item) => stableStringify(item)).join(",")}]`;
          }
          if (value && typeof value === "object") {
            const entries = Object.entries(value as Record<string, unknown>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
            return `{${entries.join(",")}}`;
          }
          return JSON.stringify(value);
        };

        const currentSchedule =
          existingDetails && typeof existingDetails === "object"
            ? ((existingDetails as Record<string, unknown>).schedule as Record<string, unknown> | undefined)
            : undefined;

        if (stableStringify(currentSchedule || {}) === stableStringify(nextSchedule || {})) {
          continue;
        }

        const mergedDetails = {
          ...existingDetails,
          schedule: nextSchedule,
        };

        const { error: updateScheduleError } = await supabase
          .from("courses")
          .update({ details: mergedDetails as Json })
          .eq("id", existing.id);

        if (updateScheduleError) {
          console.error(`[Supabase] Failed to update CAU schedule for ${course.courseCode}:`, updateScheduleError);
          throw updateScheduleError;
        }
      }
    }

    // CAU Sport: on force update, clear all existing records then insert fresh
    if (university === "CAU Sport" && forceUpdate) {
      const { error: deleteError } = await supabase
        .from("courses")
        .delete()
        .eq("university", "CAU Sport");
      if (deleteError) {
        console.error("[Supabase] Failed to clear CAU Sport courses:", deleteError);
        throw deleteError;
      }
      console.log("[Supabase] Cleared all CAU Sport courses for full overwrite.");
    }

    // Regular update: skip courses that already have a description and whose
    // latest semester matches the incoming scraped semester.
    if (!forceUpdate && university !== "CAU Sport") {
      const existingMeta = await this.getExistingCourseCodes(university);
      coursesForUpsert = coursesForUpsert.filter((c) => {
        const meta = existingMeta.get(c.courseCode);
        if (!meta) return true; // new course
        if (!meta.hasDescription) return true; // no description yet
        const scraped = c.semesters?.[0];
        if (!scraped) return true;
        if (meta.term === scraped.term && meta.year === scraped.year) {
          return false; // same semester + has description → skip
        }
        return true;
      });
    }

    if (coursesForUpsert.length === 0) {
      console.log(`[Supabase] No new ${university} courses to upsert.`);
      return;
    }

    const upsertCourseCodes = coursesForUpsert.map((c) => c.courseCode);
    const { data: existingCourseRows } = await supabase
      .from("courses")
      .select("course_code, description, related_urls, details")
      .eq("university", university)
      .in("course_code", upsertCourseCodes);
    const existingCourseByCode = new Map(
      (existingCourseRows || []).map((row) => [row.course_code, row]),
    );

    // Separate courses into those that need full update and those that are partially scraped
    const toUpsert = coursesForUpsert.map((c) => {
      const existing = existingCourseByCode.get(c.courseCode);
      const existingDetails =
        typeof existing?.details === "string"
          ? (JSON.parse(existing.details || "{}") as Record<string, unknown>)
          : ((existing?.details as Record<string, unknown> | null) || {});
      const rawDescription = c.description || existing?.description || "";
      const { cleanText: cleanedDescription, links: extractedLinks } = extractContentLinks(rawDescription);
      const detailsRelatedLinks =
        c.details && typeof c.details === "object" && Array.isArray((c.details as Record<string, unknown>).relatedUrls)
          ? ((c.details as Record<string, unknown>).relatedUrls as unknown[])
              .filter((value): value is string => typeof value === "string")
              .map((value) => normalizeExternalUrl(value))
              .filter(Boolean)
          : [];
      const existingRelatedLinks = Array.isArray(existing?.related_urls)
        ? existing.related_urls.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : [];
      const mergedRelatedLinks = Array.from(new Set([...existingRelatedLinks, ...detailsRelatedLinks, ...extractedLinks]));

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
        is_hidden?: boolean;
        is_internal?: boolean;
        description?: string;
        details?: Json;
        latest_semester?: Json;
        instructors?: string[];
        related_urls?: string[];
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
        // Never overwrite user-managed fields on force update;
        // only set them on initial insert (new courses have no existing row).
        ...(forceUpdate ? {} : {
          is_hidden: c.isHidden || false,
          is_internal: c.isInternal || false,
        }),
      };

      if (mergedRelatedLinks.length > 0) {
        payload.related_urls = mergedRelatedLinks;
      }

      // Extract instructors from details into top-level column
      const detailsInstructors = (c.details as Record<string, unknown>)?.instructors;
      if (Array.isArray(detailsInstructors) && detailsInstructors.length > 0) {
        payload.instructors = detailsInstructors as string[];
      }

      // For force update, always apply incoming description/details/latest semester.
      // Otherwise keep the previous partial-scrape protection.
      if (forceUpdate || !c.details?.is_partially_scraped) {
        payload.description = cleanedDescription || c.description;
        payload.details = c.details as Json;
        if (c.semesters && c.semesters.length > 0) {
          payload.latest_semester = { term: c.semesters[0].term, year: c.semesters[0].year };
        }
      } else {
        const incomingDescription = cleanedDescription || c.description || "";
        const existingHasDescription = (existing?.description || "").trim().length > 0;
        if (incomingDescription && !existingHasDescription) {
          payload.description = incomingDescription;
        }
        if (
          c.details &&
          typeof c.details === "object" &&
          (
            Array.isArray((c.details as Record<string, unknown>).variant_code_links) ||
            Array.isArray((c.details as Record<string, unknown>).cmu_code_links)
          )
        ) {
          const incomingDetails = (c.details as Record<string, unknown>) || {};
          const incomingVariantLinks = Array.isArray(incomingDetails.variant_code_links)
            ? incomingDetails.variant_code_links
            : incomingDetails.cmu_code_links;
          payload.details = {
            ...existingDetails,
            ...incomingDetails,
            ...(incomingVariantLinks ? { variant_code_links: incomingVariantLinks } : {}),
          } as Json;
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
    const courseCodes = coursesForUpsert.map(c => c.courseCode);
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
    const coursesWithSemesters = coursesForUpsert.filter(c => c.semesters && c.semesters.length > 0);
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
    const aggregatedWorkouts = aggregateWorkoutCoursesByName(workouts);
    console.log(`[Supabase] Saving ${aggregatedWorkouts.length} aggregated workouts (from ${workouts.length}) for ${source}...`);

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

    const toUpsertRaw = aggregatedWorkouts.map((w) => ({
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

  async saveProjectsSeminars(items: ScrapedCourse[]): Promise<void> {
    if (items.length === 0) return;

    const university = formatUniversityName(items[0].university);
    console.log(`[Supabase] Saving ${items.length} projects/seminars for ${university}...`);

    const supabase = createAdminClient();
    const courseCodes = Array.from(new Set(items.map((item) => item.courseCode).filter(Boolean)));
    const { data: existingRows } = await supabase
      .from("projects_seminars")
      .select("course_code, department, prerequisites, contents, schedule, related_links")
      .eq("university", university)
      .in("course_code", courseCodes);
    const existingByCode = new Map(
      (existingRows || []).map((row) => [row.course_code, row]),
    );

    const toUpsert = items.map((c) => {
      const rawDetails =
        c.details && typeof c.details === "object"
          ? (c.details as Record<string, unknown>)
          : {};
      const remainingDetails: Record<string, unknown> = { ...rawDetails };
      delete remainingDetails.department;
      delete remainingDetails.prerequisites;
      delete remainingDetails.prerequisites_organisational_information;
      delete remainingDetails.contents;
      delete remainingDetails.related_links;
      delete remainingDetails.schedule;
      const scheduleValue =
        rawDetails.schedule && typeof rawDetails.schedule === "object" && !Array.isArray(rawDetails.schedule)
          ? (rawDetails.schedule as Record<string, unknown>)
          : {};
      const existing = existingByCode.get(c.courseCode);
      const rawContentValue = c.description || (rawDetails.contents as string) || existing?.contents || "";
      const { cleanText: cleanedContents, links: extractedLinks } = extractContentLinks(rawContentValue);
      const detailsRelatedLinks =
        Array.isArray(rawDetails.relatedUrls)
          ? (rawDetails.relatedUrls as unknown[])
              .filter((value): value is string => typeof value === "string")
              .map((value) => normalizeExternalUrl(value))
              .filter(Boolean)
          : [];
      const existingLinks = Array.isArray(existing?.related_links)
        ? existing.related_links.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
        : [];
      const mergedRelatedLinks = Array.from(new Set([...existingLinks, ...detailsRelatedLinks, ...extractedLinks]));

      return {
        university: university,
        course_code: c.courseCode,
        category: (c.details as any)?.category || "Other", // eslint-disable-line @typescript-eslint/no-explicit-any
        title: c.title,
        description: c.description,
        url: c.url,
        instructors: (c.details as any)?.instructors || ([] as string[]), // eslint-disable-line @typescript-eslint/no-explicit-any
        credit: c.credit,
        department: c.department || (rawDetails.department as string) || existing?.department || null,
        prerequisites:
          c.corequisites ||
          (rawDetails.prerequisites as string) ||
          (rawDetails.prerequisites_organisational_information as string) ||
          existing?.prerequisites ||
          null,
        contents: cleanedContents || null,
        related_links: mergedRelatedLinks,
        schedule:
          (((Object.keys(scheduleValue).length > 0 ? scheduleValue : (existing?.schedule as Record<string, unknown> | null)) || {}) as Json),
        latest_semester: c.semesters?.[0] ? { term: c.semesters[0].term, year: c.semesters[0].year } : null,
        details: remainingDetails as Json,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("projects_seminars")
      .upsert(toUpsert, { onConflict: 'university,course_code' });

    if (error) {
      console.error(`[Supabase] Error saving projects/seminars for ${university}:`, error);
      throw error;
    }
  }

  async clearUniversity(university: string): Promise<void> {
    const formattedUni = formatUniversityName(university);
    console.log(`[Supabase] Clearing all records for ${formattedUni}...`);
    const supabase = createAdminClient();
    
    // Clear courses
    const { error: courseError } = await supabase
      .from("courses")
      .delete()
      .eq("university", formattedUni);

    if (courseError) {
      console.error(`[Supabase] Error clearing courses for ${formattedUni}:`, courseError);
      throw courseError;
    }

    // Clear projects_seminars
    const { error: projError } = await supabase
      .from("projects_seminars")
      .delete()
      .eq("university", formattedUni);

    if (projError) {
      console.error(`[Supabase] Error clearing projects/seminars for ${formattedUni}:`, projError);
      throw projError;
    }
  }

  async getExistingCourseCodes(
    university: string
  ): Promise<Map<string, { term: string; year: number; hasDescription: boolean } | null>> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('courses')
      .select('course_code, latest_semester, description')
      .eq('university', university);

    if (error) {
      console.error(`[Supabase] Error fetching existing course codes for ${university}:`, error);
      return new Map();
    }

    const map = new Map<string, { term: string; year: number; hasDescription: boolean } | null>();
    (data || []).forEach(row => {
      const latest = row.latest_semester as { term: string; year: number } | null;
      map.set(
        row.course_code,
        latest
          ? {
              ...latest,
              hasDescription: (row.description || "").trim().length > 0,
            }
          : null
      );
    });
    return map;
  }

  async getProjectSeminarDepartmentStatus(university: string): Promise<Map<string, boolean>> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("projects_seminars")
      .select("course_code, department")
      .eq("university", university);

    if (error) {
      console.error(`[Supabase] Error fetching project/seminar department status for ${university}:`, error);
      return new Map();
    }

    const map = new Map<string, boolean>();
    (data || []).forEach((row) => {
      const hasDepartment = typeof row.department === "string" && row.department.trim().length > 0;
      map.set(row.course_code, hasDepartment);
    });
    return map;
  }

  async getCourseDepartmentStatus(university: string): Promise<Map<string, boolean>> {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("courses")
      .select("course_code, department")
      .eq("university", university);

    if (error) {
      console.error(`[Supabase] Error fetching course department status for ${university}:`, error);
      return new Map();
    }

    const map = new Map<string, boolean>();
    (data || []).forEach((row) => {
      const hasDepartment = typeof row.department === "string" && row.department.trim().length > 0;
      map.set(row.course_code, hasDepartment);
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

  const parseCredit = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value.trim());
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  };

  const derivedCredit = parseCredit(row.credit);

  return {
    id: Number(row.id),
    university,
    courseCode,
    title: String(row.title || ""),
    fields: [],
    semesters: [],
    units: String(row.units || ""),
    credit: derivedCredit,
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
