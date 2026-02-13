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
  const sort = searchParams.get('sort') || 'title';
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

    if (enrolledOnly) {
      response.headers.set('Cache-Control', 'private, no-store');
    } else {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    }
    
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

  const modernSelectString = `
    id, university, course_code, title, units, url, details, instructors, prerequisites, related_urls, cross_listed_courses, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at,
    fields:course_fields(fields(name)),
    semesters:course_semesters(semesters(term, year))
  `;
  const legacySelectString = `
    id, university, course_code, title, units, url, details, department, corequisites, level, difficulty, popularity, workload, is_hidden, is_internal, created_at,
    fields:course_fields(fields(name)),
    semesters:course_semesters(semesters(term, year))
  `;

  const buildQuery = (selectString: string) =>
    supabase
      .from('courses')
      .select(selectString, { count: 'exact' })
      .eq('is_hidden', false);

  // Parallelize user course status and field filter queries
  const needsUserCourses = userId && (enrolledOnly || true); // always need hidden filter for logged-in users
  const needsFieldFilter = fields.length > 0;

  const [userCoursesResult, fieldFilterResult] = await Promise.all([
    needsUserCourses
      ? supabase.from('user_courses').select('course_id, status').eq('user_id', userId)
      : Promise.resolve({ data: null }),
    needsFieldFilter
      ? supabase.from('fields').select('course_fields(course_id)').in('name', fields)
      : Promise.resolve({ data: null }),
  ]);

  const applyFilters = (baseQuery: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let q = baseQuery;
    if (enrolledOnly) {
      if (!userId) return null;
      const enrolledIds = (userCoursesResult.data || [])
        .filter(r => r.status !== 'hidden')
        .map(r => r.course_id);
      if (enrolledIds.length === 0) return null;
      q = q.in('id', enrolledIds);
    } else if (userId) {
      const hiddenIds = (userCoursesResult.data || [])
        .filter(r => r.status === 'hidden')
        .map(r => r.course_id);
      if (hiddenIds.length > 0) {
        q = q.not('id', 'in', `(${hiddenIds.join(',')})`);
      }
    }

    if (query) {
      q = q.textSearch('search_vector', query, { type: 'websearch' });
    }

    if (universities.length > 0) {
      q = q.in('university', universities);
    }

    if (needsFieldFilter) {
      const fieldCourseIds = (fieldFilterResult.data || [])
        .flatMap(f => (f.course_fields as { course_id: number }[] | null || []).map(cf => cf.course_id));

      if (fieldCourseIds.length === 0) return null;
      q = q.in('id', fieldCourseIds);
    }

    if (levels.length > 0) {
      q = q.in('level', levels);
    }

    // Sorting
    if (sort === 'popularity') q = q.order('popularity', { ascending: false });
    else if (sort === 'newest') q = q.order('created_at', { ascending: false });
    else if (sort === 'title') q = q.order('title', { ascending: true });
    else q = q.order('id', { ascending: false });
    return q;
  };

  const supabaseQuery = applyFilters(buildQuery(modernSelectString));
  if (!supabaseQuery) return { items: [], total: 0, pages: 0 };

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
    const legacyQuery = applyFilters(buildQuery(legacySelectString));
    if (!legacyQuery) return { items: [], total: 0, pages: 0 };
    const fallback = await legacyQuery.range(offset, offset + size - 1);
    data = fallback.data;
    count = fallback.count;
    error = fallback.error;
  }

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
    };
  });

  const total = count || 0;
  const pages = Math.max(1, Math.ceil(total / size));

  return { items, total, pages };
}
