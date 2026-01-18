import { NextResponse } from 'next/server';
import { getUser, createClient, mapCourseFromRow } from '@/lib/supabase/server';


export async function GET(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const size = parseInt(searchParams.get('size') || '12');
  const offset = (page - 1) * size;
  
  const universitiesParam = searchParams.get('universities');
  const universities = universitiesParam ? universitiesParam.split(',').filter(Boolean) : [];

  const fieldsParam = searchParams.get('fields');
  const fields = fieldsParam ? fieldsParam.split(',').filter(Boolean) : [];

  const levelsParam = searchParams.get('levels');
  const levels = levelsParam ? levelsParam.split(',').filter(Boolean) : [];

  const enrolledOnly = searchParams.get('enrolled') === 'true';
  const sort = searchParams.get('sort') || 'relevance';
  const query = searchParams.get('q') || '';

  try {
    const dbCourses = await fetchCourses(page, size, offset, query, sort, enrolledOnly, universities, fields, levels, user.id);

    const response = NextResponse.json({
      items: dbCourses.items,
      total: dbCourses.total,
      page,
      size,
      pages: dbCourses.pages
    });

    // Add Cache-Control: s-maxage=60 (Cache on edge for 60s), stale-while-revalidate
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
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
      id, university, course_code, title, units, url, details, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at,
      fields:course_fields(fields(name)),
      semesters:course_semesters(semesters(term, year))
    `, { count: 'exact' })
    .eq('is_hidden', false);

  if (enrolledOnly) {
    if (!userId) return { items: [], total: 0, pages: 0 };
    const { data: enrolledIds } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', userId);
    
    const ids = (enrolledIds || []).map(r => r.course_id);
    if (ids.length === 0) return { items: [], total: 0, pages: 0 };
    supabaseQuery = supabaseQuery.in('id', ids);
  }

  if (query) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,course_code.ilike.%${query}%`);
  }

  if (universities.length > 0) {
    supabaseQuery = supabaseQuery.in('university', universities);
  }

  if (fields.length > 0) {
    // Filter courses that have at least one of the selected fields
    const { data: fieldData } = await supabase
      .from('fields')
      .select('course_fields(course_id)')
      .in('name', fields);
    
    const fieldCourseIds = (fieldData || [])
      .flatMap(f => (f.course_fields as any[] || []).map(cf => cf.course_id));
    
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

  const items = (data || []).map((row: any) => {
    const course = mapCourseFromRow(row);
    const fieldNames = row.fields?.map((f: any) => f.fields.name) || [];
    const semesterNames = row.semesters?.map((s: any) => `${s.semesters.term} ${s.semesters.year}`) || [];
    
    return { 
      ...course, 
      fields: fieldNames, 
      semesters: semesterNames 
    };
  });

  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return { items, total, pages };
}
