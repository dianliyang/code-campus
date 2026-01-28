import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import Sidebar from "@/components/home/Sidebar";
import CourseList from "@/components/home/CourseList";
import { University, Field, Course } from "@/types";
import { getUser, createClient, mapCourseFromRow, formatUniversityName } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";

export const dynamic = "force-dynamic";

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
    <div className="flex flex-col min-h-screen bg-white">
      <Hero dict={dict.dashboard} />
      
      <div className="flex-grow max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarData userId={user?.id} params={params} dict={dict.dashboard.courses} />
        </Suspense>
        
        <Suspense fallback={<CourseListSkeleton />}>
          <CourseListData params={params} dict={dict.dashboard.courses} />
        </Suspense>
      </div>
    </div>
  );
}

async function SidebarData({ userId, params, dict }: { 
  userId?: string, 
  params: Record<string, string | string[] | undefined>, 
  dict: Dictionary['dashboard']['courses'] 
}) {
  const supabase = await createClient();
  
  // Parallelize static and dynamic fetches
  const [universitiesRes, fieldsRes, enrolledRes] = await Promise.all([
    supabase.from('courses').select('university').eq('is_hidden', false),
    supabase.from('fields').select('name, course_fields(count)'),
    userId ? (async () => {
      // Extract filters for dynamic enrolled count
      const universitiesParam = ((params.universities as string) || "").split(",").filter(Boolean);
      const queryParam = (params.q as string) || "";
      const levelsParam = ((params.levels as string) || "").split(",").filter(Boolean);

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
      
      const { count } = await q;
      return count || 0;
    })() : Promise.resolve(0)
  ]);

  const universityCounts: Record<string, number> = {};
  universitiesRes.data?.forEach(c => {
    const formattedName = formatUniversityName(c.university);
    universityCounts[formattedName] = (universityCounts[formattedName] || 0) + 1;
  });
  
  const dbUniversities: University[] = Object.entries(universityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const dbFields: Field[] = (fieldsRes.data || []).map((f: Record<string, unknown>) => ({
    name: f.name as string,
    count: (f.course_fields as { count: number }[] | null)?.[0]?.count || 0
  })).sort((a, b) => b.count - a.count);

  return <Sidebar universities={dbUniversities} fields={dbFields} enrolledCount={enrolledRes as number} dict={dict} />;
}

async function CourseListData({ params, dict }: { 
  params: Record<string, string | string[] | undefined>, 
  dict: Dictionary['dashboard']['courses'] 
}) {
  const user = await getUser();
  const page = parseInt((params.page as string) || "1");
  const size = 12;
  const offset = (page - 1) * size;
  const query = (params.q as string) || "";
  const sort = (params.sort as string) || "relevance";
  const enrolledOnly = params.enrolled === "true";
  
  const universities = ((params.universities as string) || "").split(",").filter(Boolean);
  const fields = ((params.fields as string) || "").split(",").filter(Boolean);
  const levels = ((params.levels as string) || "").split(",").filter(Boolean);

  // Parallelize course fetch and enrolled IDs fetch
  const [dbCourses, initialEnrolledIds] = await Promise.all([
    fetchCourses(page, size, offset, query, sort, enrolledOnly, universities, fields, levels, user?.id),
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
  userId?: string | null
) {
  const supabase = await createClient();
  
  let selectString = `
    id, university, course_code, title, units, url, details, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at,
    fields:course_fields(fields(name)),
    semesters:course_semesters(semesters(term, year))
  `;

  if (enrolledOnly) {
    selectString += `, user_courses!inner(user_id, status)`;
  }

  let supabaseQuery = supabase
    .from('courses')
    .select(selectString, { count: 'exact' })
    .eq('is_hidden', false);

  if (enrolledOnly) {
    if (!userId) return { items: [], total: 0, pages: 0 };
    supabaseQuery = supabaseQuery.eq('user_courses.user_id', userId);
    supabaseQuery = supabaseQuery.neq('user_courses.status', 'hidden');
  } else if (userId) {
     const { data: hiddenData } = await supabase
       .from('user_courses')
       .select('course_id')
       .eq('user_id', userId)
       .eq('status', 'hidden');
     const hiddenIds = hiddenData?.map(h => h.course_id) || [];
     if (hiddenIds.length > 0) {
        supabaseQuery = supabaseQuery.not('id', 'in', `(${hiddenIds.join(',')})`);
     }
  }

  if (query) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,course_code.ilike.%${query}%`);
  }

  if (universities.length > 0) {
    supabaseQuery = supabaseQuery.in('university', universities);
  }

  if (fields.length > 0) {
    // Keep this as is for now as it's efficient enough with a small set of IDs
    const { data: fieldData } = await supabase
      .from('fields')
      .select('course_fields(course_id)')
      .in('name', fields);
    
    const fieldCourseIds = (fieldData || [])
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

  const { data, count, error } = await supabaseQuery
    .range(offset, offset + size - 1);

  if (error) {
    console.error("[Supabase] Fetch error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const items = (data || []).map((row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const course = mapCourseFromRow(row);
    const fieldNames = (row.fields as { fields: { name: string } }[] | null)?.map((f) => f.fields.name) || [];
    const semesterNames = (row.semesters as { semesters: { term: string; year: number } }[] | null)?.map((s) => `${s.semesters.term} ${s.semesters.year}`) || [];
    
    return { 
      ...course, 
      fields: fieldNames, 
      semesters: semesterNames 
    } as Course;
  });

  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return { items, total, pages };
}

function SidebarSkeleton() {
  return <div className="w-64 space-y-8 animate-pulse"><div className="h-4 bg-gray-100 rounded w-1/2"></div><div className="space-y-4"><div className="h-8 bg-gray-50 rounded"></div><div className="h-8 bg-gray-50 rounded"></div></div></div>;
}

function CourseListSkeleton() {
  return <div className="flex-grow space-y-4 animate-pulse"><div className="h-10 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div></div>;
}