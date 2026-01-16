import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import Sidebar from "@/components/home/Sidebar";
import CourseList from "@/components/home/CourseList";
import { University, Field, Course } from "@/types";
import { getUser, createClient, mapCourseFromRow } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const user = await getUser();
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  const params = await searchParams;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Hero dict={dict.dashboard} />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarData dict={dict.dashboard.courses} />
        </Suspense>
        
        <Suspense fallback={<CourseListSkeleton />}>
          <CourseListData params={params} dict={dict.dashboard.courses} />
        </Suspense>
      </div>
    </div>
  );
}

async function SidebarData({ dict }: { dict: any }) {
  const supabase = await createClient();
  
  // Use RPC or separate queries for aggregations in Supabase
  const { data: universitiesData } = await supabase
    .from('courses')
    .select('university')
    .eq('is_hidden', false);
    
  const universityCounts: Record<string, number> = {};
  universitiesData?.forEach(c => {
    universityCounts[c.university] = (universityCounts[c.university] || 0) + 1;
  });
  
  const dbUniversities: University[] = Object.entries(universityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const { data: fieldsData } = await supabase
    .from('fields')
    .select('name, course_fields(count)');
    
  // Simple mapping for fields
  const dbFields: Field[] = (fieldsData || []).map((f: any) => ({
    name: f.name,
    count: f.course_fields?.[0]?.count || 0
  })).sort((a, b) => b.count - a.count);

  return <Sidebar universities={dbUniversities} fields={dbFields} enrolledCount={0} dict={dict} />;
}

async function CourseListData({ params, dict }: { params: any, dict: any }) {
  const user = await getUser();
  const page = parseInt((params.page as string) || "1");
  const size = 10;
  const offset = (page - 1) * size;
  const query = (params.q as string) || "";
  const sort = (params.sort as string) || "relevance";
  const enrolledOnly = params.enrolled === "true";
  
  const universities = ((params.universities as string) || "").split(",").filter(Boolean);
  const fields = ((params.fields as string) || "").split(",").filter(Boolean);
  const levels = ((params.levels as string) || "").split(",").filter(Boolean);

  const supabase = await createClient();
  let initialEnrolledIds: number[] = [];
  
  if (user) {
    const { data: enrolledRows } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', user.id);
    initialEnrolledIds = (enrolledRows || []).map(r => Number(r.course_id));
  }

  const dbCourses = await fetchCourses(page, size, offset, query, sort, enrolledOnly, universities, fields, levels, user?.id);

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
  
  let supabaseQuery = supabase
    .from('courses')
    .select(`
      *,
      fields:course_fields(fields(name)),
      semesters:course_semesters(semesters(term, year))
    `, { count: 'exact' })
    .eq('is_hidden', false);

  if (enrolledOnly) {
    if (!userId) return { items: [], total: 0, pages: 0 };
    // This requires a more complex join or subquery, usually handled via filtering on the join table
    const { data: enrolledIds } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', userId);
    
    const ids = (enrolledIds || []).map(r => r.course_id);
    supabaseQuery = supabaseQuery.in('id', ids);
  }

  if (query) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,course_code.ilike.%${query}%`);
  }

  if (universities.length > 0) {
    supabaseQuery = supabaseQuery.in('university', universities);
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

  const items = (data || []).map((row: any) => {
    const course = mapCourseFromRow(row);
    const fieldNames = row.fields?.map((f: any) => f.fields.name) || [];
    const semesterNames = row.semesters?.map((s: any) => `${s.semesters.term} ${s.semesters.year}`) || [];
    
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