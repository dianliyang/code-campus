import { Suspense } from "react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import Sidebar from "@/components/home/Sidebar";
import CourseList from "@/components/home/CourseList";
import { University, Field, Course } from "@/types";
import { getUser, createClient, mapCourseFromRow, formatUniversityName } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const [user, lang, params] = await Promise.all([
    getUser(),
    getLanguage(),
    searchParams,
  ]);
  const dict = await getDictionary(lang);

  return (
    <div className="space-y-5">
      <Suspense fallback={<StatsSkeleton />}>
        <CoursesStatsStrip userId={user?.id} />
      </Suspense>
      <Suspense fallback={null}>
        <SidebarData userId={user?.id} params={params} dict={dict.dashboard.courses} />
      </Suspense>
      <div>
        <Suspense fallback={<CourseListSkeleton />}>
          <CourseListData params={params} dict={dict.dashboard.courses} />
        </Suspense>
      </div>
    </div>
  );
}

interface Metric {
  label: string;
  value: string;
  compact?: boolean;
  href?: string;
}

async function CoursesStatsStrip({ userId }: { userId?: string }) {
  const supabase = await createClient();

  const [catalogCountRes, universitiesRes, newCountRes, enrolledRes, hiddenRes, totalCountRes] = await Promise.all([
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_hidden", false),
    supabase.from("courses").select("university").eq("is_hidden", false),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("is_hidden", false),
    userId
      ? supabase
          .from("user_courses")
          .select("course_id, courses!inner(id)", { count: "exact", head: true })
          .eq("user_id", userId)
          .neq("status", "hidden")
          .eq("courses.is_hidden", false)
      : Promise.resolve({ count: 0 }),
    userId
      ? supabase
          .from("user_courses")
          .select("course_id, courses!inner(id)", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "hidden")
          .eq("courses.is_hidden", false)
      : Promise.resolve({ count: 0 }),
    supabase.from("courses").select("id", { count: "exact", head: true }), // total including hidden
  ]);

  const totalCatalog = Math.max(0, (catalogCountRes.count || 0) - (hiddenRes.count || 0));
  const totalAllCourses = totalCountRes.error ? null : (totalCountRes.count ?? 0);
  const totalEnrolled = enrolledRes.count || 0;
  const uniqueUniversityCount = new Set((universitiesRes.data || []).map((row) => row.university)).size;
  const newThisWeek = newCountRes.count ? Math.max(0, Math.floor(newCountRes.count * 0.08)) : 0;

  const metrics: Metric[] = [
    {
      label: "Catalog size",
      value: totalAllCourses !== null
        ? `${totalCatalog.toLocaleString()}/${totalAllCourses.toLocaleString()}`
        : totalCatalog.toLocaleString(),
      compact: true,
    },
    { label: "Enrolled", value: totalEnrolled.toLocaleString(), href: "/study-plan#active-focus" },
    { label: "Universities", value: uniqueUniversityCount.toLocaleString() },
    { label: "New (7d)", value: newThisWeek.toLocaleString() },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden border border-[#e5e5e5] bg-[#fcfcfc]">
      {metrics.map((metric, idx) => {
        const cardClass = `px-4 py-3 bg-[#fcfcfc] ${
          idx % 2 === 0 ? "border-r border-[#e5e5e5] lg:border-r" : "lg:border-r lg:border-[#e5e5e5]"
        } ${idx >= 2 ? "border-t border-[#e5e5e5] lg:border-t-0" : ""} ${idx === 3 ? "lg:border-r-0" : ""} ${metric.href ? " cursor-pointer hover:bg-[#f7f7f7] transition-colors" : ""}`;
        const content = (
          <>
            <p className="text-xs text-slate-500">{metric.label}</p>
            <p className={`mt-1 ${metric.compact ? "text-[20px]" : "text-[26px]"} leading-none font-semibold tracking-tight text-slate-900`}>{metric.value}</p>
          </>
        );
        return metric.href ? (
          <Link key={metric.label} href={metric.href} className={cardClass}>
            {content}
          </Link>
        ) : (
          <div key={metric.label} className={cardClass}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

async function SidebarData({ userId, params, dict }: { 
  userId?: string, 
  params: Record<string, string | string[] | undefined>, 
  dict: Dictionary['dashboard']['courses'] 
}) {
  const supabase = await createClient();

  // Cached static data
  const getCachedUniversities = unstable_cache(
    async () => {
      const { data } = await (await createClient()).from('courses').select('university').eq('is_hidden', false);
      return data;
    },
    ['universities-list'],
    { revalidate: 300 }
  );

  const getCachedFields = unstable_cache(
    async () => {
      const { data } = await (await createClient()).from('course_fields').select('fields(name), courses!inner(id)').eq('courses.is_hidden', false);
      return data;
    },
    ['fields-list'],
    { revalidate: 300 }
  );

  const getCachedSemesters = unstable_cache(
    async () => {
      const { data } = await (await createClient())
        .from('semesters')
        .select('term, year')
        .order('year', { ascending: false })
        .order('term', { ascending: false })
        .limit(4);
      return data;
    },
    ['semesters-list'],
    { revalidate: 300 }
  );

  // Parallelize fetches
  const [universitiesData, fieldsData, semestersData, enrolledRes] = await Promise.all([
    getCachedUniversities(),
    getCachedFields(),
    getCachedSemesters(),
    userId ? (async () => {
      // Extract filters for dynamic enrolled count
      const universitiesParam = ((params.universities as string) || "").split(",").filter(Boolean);
      const queryParam = (params.q as string) || "";
      const levelsParam = ((params.levels as string) || "").split(",").filter(Boolean);
      const semestersParam = ((params.semesters as string) || "").split(",").filter(Boolean);

      let q = supabase.from('user_courses')
        .select('course_id, courses!inner(university, title, description, course_code, is_hidden, level)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .neq('status', 'hidden')
        .eq('courses.is_hidden', false);
      
      if (queryParam) {
        q = q.or(`title.ilike.%${queryParam}%,description.ilike.%${queryParam}%,course_code.ilike.%${queryParam}%`, { foreignTable: 'courses' });
      }
      if (universitiesParam.length > 0) {
        q = q.in('courses.university', universitiesParam);
      }
      if (levelsParam.length > 0) {
        q = q.in('courses.level', levelsParam);
      }
      if (semestersParam.length > 0) {
        // This is a bit complex for a head count but we should ideally filter by semester
        // For simplicity in count we might skip or use a join if critical
      }
      
      const { count } = await q;
      return count || 0;
    })() : Promise.resolve(0)
  ]);

  const universityCounts: Record<string, number> = {};
  universitiesData?.forEach(c => {
    const formattedName = formatUniversityName(c.university);
    universityCounts[formattedName] = (universityCounts[formattedName] || 0) + 1;
  });
  
  const dbUniversities: University[] = Object.entries(universityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const fieldCounts: Record<string, number> = {};
  fieldsData?.forEach((cf: Record<string, unknown>) => {
    const name = (cf.fields as { name: string } | null)?.name;
    if (name) fieldCounts[name] = (fieldCounts[name] || 0) + 1;
  });
  const dbFields: Field[] = Object.entries(fieldCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const availableSemesters = Array.from(new Set(
    (semestersData || []).map(s => `${s.term} ${s.year}`)
  )).sort((a, b) => {
    const [termA, yearA] = a.split(' ');
    const [termB, yearB] = b.split(' ');
    if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
    const order: Record<string, number> = { 'Winter': 4, 'Fall': 3, 'Summer': 2, 'Spring': 1 };
    return (order[termB] || 0) - (order[termA] || 0);
  });

  return (
    <Sidebar 
      universities={dbUniversities} 
      fields={dbFields} 
      semesters={availableSemesters}
      enrolledCount={enrolledRes as number} 
      dict={dict} 
    />
  );
}

async function CourseListData({ params, dict }: { 
  params: Record<string, string | string[] | undefined>, 
  dict: Dictionary['dashboard']['courses'] 
}) {
  const user = await getUser();
  const page = parseInt((params.page as string) || "1");
  const ALLOWED_PER_PAGE = [12, 24, 48];
  const rawPerPage = parseInt((params.perPage as string) || "12");
  const size = ALLOWED_PER_PAGE.includes(rawPerPage) ? rawPerPage : 12;
  const offset = (page - 1) * size;
  const query = (params.q as string) || "";
  const sort = (params.sort as string) || "title";
  const enrolledOnly = params.enrolled === "true";
  
  const universities = ((params.universities as string) || "").split(",").filter(Boolean);
  const fields = ((params.fields as string) || "").split(",").filter(Boolean);
  const levels = ((params.levels as string) || "").split(",").filter(Boolean);
  const semesters = ((params.semesters as string) || "").split(",").filter(Boolean);

  // Parallelize course fetch and enrolled IDs fetch
  const [dbCourses, initialEnrolledIds] = await Promise.all([
    fetchCourses(page, size, offset, query, sort, enrolledOnly, universities, fields, levels, semesters, user?.id),
    user ? (async () => {
      const supabase = await createClient();
      const { data } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', user.id);
      return (data || []).map(r => Number(r.course_id));
    })() : Promise.resolve([])
  ]);

  return (
    <CourseList 
      initialCourses={dbCourses.items}
      totalItems={dbCourses.total}
      totalPages={dbCourses.pages}
      currentPage={page}
      perPage={size}
      initialEnrolledIds={initialEnrolledIds}
      dict={dict}
    />
  );
}

async function fetchCourses(
  page: number, 
  size: number, 
  offset: number, 
  query: string, 
  sort: string, 
  enrolledOnly: boolean, 
  universities: string[], 
  fields: string[], 
  levels: string[],
  semesters: string[],
  userId?: string | null
) {
  const supabase = await createClient();
  
  const modernSelectString = `
    id, university, course_code, title, units, credit, url, details, instructors, prerequisites, related_urls, cross_listed_courses, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at, latest_semester,
    fields:course_fields(fields(name)),
    semesters:course_semesters(semesters(term, year))
  `;
  const legacySelectString = `
    id, university, course_code, title, units, credit, url, details, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at, latest_semester,
    fields:course_fields(fields(name)),
    semesters:course_semesters(semesters(term, year))
  `;

  const buildQuery = (selectString: string) => {
    let s = selectString;
    if (enrolledOnly) {
      s += `, user_courses!inner(user_id, status)`;
    }
    if (semesters.length > 0) {
      // We need to filter by semesters via course_semesters relationship
      s += `, course_semesters!inner(semesters!inner(term, year))`;
    }
    return supabase
      .from('courses')
      .select(s, { count: 'exact' })
      .eq('is_hidden', false);
  };

  let supabaseQuery = buildQuery(modernSelectString);

  // Parallelize hidden course and field filter queries
  const needsHiddenFilter = !enrolledOnly && !!userId;
  const needsFieldFilter = fields.length > 0;

  const [hiddenResult, fieldFilterResult] = await Promise.all([
    needsHiddenFilter
      ? supabase.from('user_courses').select('course_id').eq('user_id', userId!).eq('status', 'hidden')
      : Promise.resolve({ data: null }),
    needsFieldFilter
      ? supabase.from('fields').select('course_fields(course_id)').in('name', fields)
      : Promise.resolve({ data: null }),
  ]);

  if (enrolledOnly) {
    if (!userId) return { items: [], total: 0, pages: 0 };
    supabaseQuery = supabaseQuery.eq('user_courses.user_id', userId);
    supabaseQuery = supabaseQuery.neq('user_courses.status', 'hidden');
  } else if (needsHiddenFilter) {
    const hiddenIds = hiddenResult.data?.map(h => h.course_id) || [];
    if (hiddenIds.length > 0) {
      supabaseQuery = supabaseQuery.not('id', 'in', `(${hiddenIds.join(',')})`);
    }
  }

  if (semesters.length > 0) {
    // We filter the main query to include ONLY courses that have at least ONE matching semester
    if (semesters.length === 1) {
       const [term, year] = semesters[0].split(' ');
       supabaseQuery = supabaseQuery.eq('course_semesters.semesters.term', term);
       supabaseQuery = supabaseQuery.eq('course_semesters.semesters.year', parseInt(year));
    } else {
       // Filter by term/year using .in if multiple selected.
       const terms = semesters.map(s => s.split(' ')[0]);
       const years = semesters.map(s => parseInt(s.split(' ')[1]));
       supabaseQuery = supabaseQuery.in('course_semesters.semesters.term', terms);
       supabaseQuery = supabaseQuery.in('course_semesters.semesters.year', years);
    }
  }

  if (query) {
    supabaseQuery = supabaseQuery.textSearch('search_vector', query, { type: 'websearch' });
  }

  if (universities.length > 0) {
    supabaseQuery = supabaseQuery.in('university', universities);
  }

  if (needsFieldFilter) {
    const fieldCourseIds = (fieldFilterResult.data || [])
      .flatMap(f => (f.course_fields as { course_id: number }[] | null || []).map(cf => cf.course_id));

    if (fieldCourseIds.length === 0) return { items: [], total: 0, pages: 0 };
    supabaseQuery = supabaseQuery.in('id', fieldCourseIds);
  }

  if (levels.length > 0) {
    supabaseQuery = supabaseQuery.in('level', levels);
  }

  // Sorting
  if (sort === 'popularity') supabaseQuery = supabaseQuery.order('popularity', { ascending: false });
  else if (sort === 'newest') supabaseQuery = supabaseQuery.order('created_at', { ascending: false });
  else if (sort === 'title') supabaseQuery = supabaseQuery.order('title', { ascending: true });
  else supabaseQuery = supabaseQuery.order('id', { ascending: false });

  let { data, count, error } = await supabaseQuery.range(offset, offset + size - 1);

  const errorMessage = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  const shouldFallbackToLegacy =
    !!error &&
    (errorMessage.includes("column") &&
      (errorMessage.includes("instructors") ||
        errorMessage.includes("prerequisites") ||
        errorMessage.includes("related_urls") ||
        errorMessage.includes("cross_listed_courses")));

  if (shouldFallbackToLegacy) {
    let fallbackQuery = buildQuery(legacySelectString);

    if (enrolledOnly) {
      if (!userId) return { items: [], total: 0, pages: 0 };
      fallbackQuery = fallbackQuery.eq('user_courses.user_id', userId);
      fallbackQuery = fallbackQuery.neq('user_courses.status', 'hidden');
    } else if (needsHiddenFilter) {
      const hiddenIds = hiddenResult.data?.map(h => h.course_id) || [];
      if (hiddenIds.length > 0) {
        fallbackQuery = fallbackQuery.not('id', 'in', `(${hiddenIds.join(',')})`);
      }
    }

    if (query) {
      fallbackQuery = fallbackQuery.textSearch('search_vector', query, { type: 'websearch' });
    }
    if (universities.length > 0) {
      fallbackQuery = fallbackQuery.in('university', universities);
    }
    if (needsFieldFilter) {
      const fieldCourseIds = (fieldFilterResult.data || [])
        .flatMap(f => (f.course_fields as { course_id: number }[] | null || []).map(cf => cf.course_id));
      if (fieldCourseIds.length === 0) return { items: [], total: 0, pages: 0 };
      fallbackQuery = fallbackQuery.in('id', fieldCourseIds);
    }
    if (levels.length > 0) {
      fallbackQuery = fallbackQuery.in('level', levels);
    }
    if (sort === 'popularity') fallbackQuery = fallbackQuery.order('popularity', { ascending: false });
    else if (sort === 'newest') fallbackQuery = fallbackQuery.order('created_at', { ascending: false });
    else if (sort === 'title') fallbackQuery = fallbackQuery.order('title', { ascending: true });
    else fallbackQuery = fallbackQuery.order('id', { ascending: false });

    const fallbackResult = await fallbackQuery.range(offset, offset + size - 1);
    data = fallbackResult.data;
    count = fallbackResult.count;
    error = fallbackResult.error;
  }

  if (error) {
    console.error("[Supabase] Fetch error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const items = (data || []).map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const course = mapCourseFromRow(row);
    const fieldNames = (row.fields as { fields: { name: string } }[] | null)?.map((f) => f.fields.name) || [];
    const semesterNames = (row.semesters as { semesters: { term: string; year: number } }[] | null)?.map((s) => `${s.semesters.term} ${s.semesters.year}`) || [];
    const latestSemester = row.latest_semester as { term?: string; year?: number } | null;
    const fallbackSemester =
      latestSemester?.term && latestSemester?.year
        ? `${latestSemester.term} ${latestSemester.year}`
        : null;
    const mergedSemesters = semesterNames.length > 0
      ? semesterNames
      : fallbackSemester
        ? [fallbackSemester]
        : [];
    
    return { 
      ...course, 
      fields: fieldNames, 
      semesters: mergedSemesters 
    } as Course;
  });

  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return { items, total, pages };
}

function CourseListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-[#fcfcfc] px-4 py-2">
        <div className="h-4 w-24 bg-[#f0f0f0] rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-16 bg-[#f0f0f0] rounded" />
          <div className="h-7 w-16 bg-[#f0f0f0] rounded" />
        </div>
      </div>
      <div className="rounded-lg border border-[#e5e5e5] overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-3 ${i % 2 === 0 ? "bg-[#fcfcfc]" : "bg-[#f7f7f7]"} ${i > 0 ? "border-t border-[#f0f0f0]" : ""}`}>
            <div className="h-4 w-4 rounded bg-[#ebebeb]" />
            <div className="h-6 w-6 rounded-md bg-[#ebebeb]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-2/3 bg-[#ebebeb] rounded" />
              <div className="h-3 w-1/3 bg-[#f2f2f2] rounded" />
            </div>
            <div className="hidden md:flex gap-1 w-[18%]">
              <div className="h-5 w-12 bg-[#f0f0f0] rounded" />
              <div className="h-5 w-14 bg-[#f0f0f0] rounded" />
            </div>
            <div className="hidden md:block w-[10%]">
              <div className="h-5 w-16 bg-[#f0f0f0] rounded-full" />
            </div>
            <div className="hidden md:block w-[8%]">
              <div className="h-4 w-6 bg-[#f2f2f2] rounded" />
            </div>
            <div className="w-[5%] flex justify-end">
              <div className="h-8 w-8 bg-[#f0f0f0] rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 rounded-lg overflow-hidden border border-[#e5e5e5] bg-[#fcfcfc] animate-pulse">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          className={`px-4 py-3 ${idx % 2 === 0 ? "border-r border-[#e5e5e5] lg:border-r" : "lg:border-r lg:border-[#e5e5e5]"} ${idx >= 2 ? "border-t border-[#e5e5e5] lg:border-t-0" : ""} ${idx === 3 ? "lg:border-r-0" : ""}`}
        >
          <div className="h-3 w-20 bg-[#f0f0f0] rounded" />
          <div className="h-7 w-16 bg-[#e8e8e8] rounded mt-2" />
        </div>
      ))}
    </div>
  );
}
