import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import CourseList from "@/components/home/CourseList";
import { Course } from "@/types";
import { getUser, createClient, mapCourseFromRow, formatUniversityName } from "@/lib/supabase/server";
import { getLanguage } from "@/actions/language";
import { getDictionary, Dictionary } from "@/lib/dictionary";
import { getDashboardPageHeaderClassName } from "@/lib/dashboard-layout";

interface PageProps {
  searchParams: Promise<{[key: string]: string | string[] | undefined;}>;
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const [lang, params] = await Promise.all([
  getLanguage(),
  searchParams]
  );
  const dict = await getDictionary(lang);

  return (
    <main className="flex min-h-full w-full flex-col gap-4 px-4 pb-4">
      <div className={getDashboardPageHeaderClassName()}>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Courses
          </h1>
          <p className="text-sm text-muted-foreground">
            Explore the catalog and enroll in courses.
          </p>
        </div>
      </div>
      <Suspense fallback={null}>
        <CourseListData params={params} dict={dict.dashboard.courses} />
      </Suspense>
    </main>);

}

async function CourseListData({ params, dict


}: {params: Record<string, string | string[] | undefined>;dict: Dictionary['dashboard']['courses'];}) {
  const user = await getUser();
  const page = parseInt(params.page as string || "1");
  const ALLOWED_PER_PAGE = [20];
  const rawPerPage = parseInt(params.perPage as string || "20");
  const size = ALLOWED_PER_PAGE.includes(rawPerPage) ? rawPerPage : 20;
  const offset = (page - 1) * size;
  const query = params.q as string || "";
  const sort = params.sort as string || "title";
  const enrolledOnly = params.enrolled === "true";

  const universities = (params.universities as string || "").split(",").filter(Boolean);
  const levels = (params.levels as string || "").split(",").filter(Boolean);
  const semesters = (params.semesters as string || "").split(",").filter(Boolean);

  // Parallelize course fetch and enrolled IDs fetch
  const getCachedUniversities = unstable_cache(
    async () => {
      const { data } = await (await createClient()).from("courses").select("university").eq("is_hidden", false);
      return data || [];
    },
    ["courses-filter-universities"],
    { revalidate: 300 }
  );
  const getCachedSemesters = unstable_cache(
    async () => {
      const { data } = await (await createClient()).
      from("semesters").
      select("term, year").
      order("year", { ascending: false }).
      order("term", { ascending: false }).
      limit(8);
      return data || [];
    },
    ["courses-filter-semesters"],
    { revalidate: 300 }
  );

  const [dbCourses, initialEnrolledIds, universitiesData, semestersData] = await Promise.all([
  fetchCourses(page, size, offset, query, sort, enrolledOnly, universities, levels, semesters, user?.id),
  user ? (async () => {
    const supabase = await createClient();
    const { data } = await supabase.
    from('user_courses').
    select('course_id').
    eq('user_id', user.id);
    return (data || []).map((r) => Number(r.course_id));
  })() : Promise.resolve([]),
  getCachedUniversities(),
  getCachedSemesters()]
  );

  const filterUniversities = Array.from(
    new Set(universitiesData.map((c) => formatUniversityName(c.university)).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const filterSemesters = Array.from(
    new Set(semestersData.map((s) => `${s.term} ${s.year}`))
  );

  return (
    <CourseList
      initialCourses={dbCourses.items}
      totalPages={dbCourses.pages}
      currentPage={page}
      perPage={size}
      initialEnrolledIds={initialEnrolledIds}
      dict={dict}
      filterUniversities={filterUniversities}
      filterSemesters={filterSemesters} />);


}

async function fetchCourses(
page: number,
size: number,
offset: number,
query: string,
sort: string,
enrolledOnly: boolean,
universities: string[],
levels: string[],
semesters: string[],
userId?: string | null)
{
  const supabase = await createClient();
  const usesLocalSort = sort === "credit" || sort === "semester";

  const modernSelectString = `
    id, university, course_code, title, units, credit, url, details, instructors, prerequisites, resources, cross_listed_courses, department, corequisites, level, difficulty, popularity, workload, subdomain, is_hidden, is_internal, created_at, latest_semester,
    fields:course_fields(fields(name)),
    semesters:course_semesters(semesters(term, year))
  `;
  const legacySelectString = `
    id, university, course_code, title, units, credit, url, details, department, corequisites, level, difficulty, popularity, workload, subdomain, is_hidden, is_internal, created_at, latest_semester,
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
    return supabase.
    from('courses').
    select(s, { count: 'exact' }).
    eq('is_hidden', false);
  };

  let supabaseQuery = buildQuery(modernSelectString);

  // Parallelize hidden course and field filter queries
  const needsHiddenFilter = !enrolledOnly && !!userId;

  const [hiddenResult] = await Promise.all([
  needsHiddenFilter ?
  supabase.from('user_courses').select('course_id').eq('user_id', userId!).eq('status', 'hidden') :
  Promise.resolve({ data: null })]
  );

  if (enrolledOnly) {
    if (!userId) return { items: [], total: 0, pages: 0 };
    supabaseQuery = supabaseQuery.eq('user_courses.user_id', userId);
    supabaseQuery = supabaseQuery.neq('user_courses.status', 'hidden');
  } else if (needsHiddenFilter) {
    const hiddenIds = hiddenResult.data?.map((h) => h.course_id) || [];
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
      const terms = semesters.map((s) => s.split(' ')[0]);
      const years = semesters.map((s) => parseInt(s.split(' ')[1]));
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

  if (levels.length > 0) {
    supabaseQuery = supabaseQuery.in('level', levels);
  }

  // Sorting
  if (sort === 'newest') supabaseQuery = supabaseQuery.order('created_at', { ascending: false });else
  if (sort === 'title') supabaseQuery = supabaseQuery.order('title', { ascending: true });else
  supabaseQuery = supabaseQuery.order('id', { ascending: false });

  let { data, count, error } = usesLocalSort
    ? await supabaseQuery
    : await supabaseQuery.range(offset, offset + size - 1);

  const errorMessage = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  const shouldFallbackToLegacy =
  !!error &&
  errorMessage.includes("column") && (
  errorMessage.includes("instructors") ||
  errorMessage.includes("prerequisites") ||
  errorMessage.includes("resources") ||
  errorMessage.includes("cross_listed_courses"));

  if (shouldFallbackToLegacy) {
    let fallbackQuery = buildQuery(legacySelectString);

    if (enrolledOnly) {
      if (!userId) return { items: [], total: 0, pages: 0 };
      fallbackQuery = fallbackQuery.eq('user_courses.user_id', userId);
      fallbackQuery = fallbackQuery.neq('user_courses.status', 'hidden');
    } else if (needsHiddenFilter) {
      const hiddenIds = hiddenResult.data?.map((h) => h.course_id) || [];
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
    if (levels.length > 0) {
      fallbackQuery = fallbackQuery.in('level', levels);
    }
    if (sort === 'newest') fallbackQuery = fallbackQuery.order('created_at', { ascending: false });else
    if (sort === 'title') fallbackQuery = fallbackQuery.order('title', { ascending: true });else
    fallbackQuery = fallbackQuery.order('id', { ascending: false });

    const fallbackResult = usesLocalSort
      ? await fallbackQuery
      : await fallbackQuery.range(offset, offset + size - 1);
    data = fallbackResult.data;
    count = fallbackResult.count;
    error = fallbackResult.error;
  }

  if (error) {
    console.error("[Supabase] Fetch error:", error);
    return { items: [], total: 0, pages: 0 };
  }

  const items = (data || []).map((row: any) => {// eslint-disable-line @typescript-eslint/no-explicit-any
    const course = mapCourseFromRow(row);
    const fieldNames = (row.fields as {fields: {name: string;};}[] | null)?.map((f) => f.fields.name) || [];
    const semesterNames = (row.semesters as {semesters: {term: string;year: number;};}[] | null)?.map((s) => `${s.semesters.term} ${s.semesters.year}`) || [];
    const latestSemester = row.latest_semester as {term?: string;year?: number;} | null;
    const fallbackSemester =
    latestSemester?.term && latestSemester?.year ?
    `${latestSemester.term} ${latestSemester.year}` :
    null;
    const mergedSemesters = semesterNames.length > 0 ?
    semesterNames :
    fallbackSemester ?
    [fallbackSemester] :
    [];

    return {
      ...course,
      fields: fieldNames,
      semesters: mergedSemesters
    } as Course;
  });

  const parseSemesterLabel = (value: string): { year: number; weight: number } | null => {
    const match = value.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (!match) return null;
    const term = match[1].toLowerCase();
    const year = Number(match[2]);
    const weightMap: Record<string, number> = { spring: 1, summer: 2, fall: 3, winter: 4 };
    return { year, weight: weightMap[term] || 0 };
  };

  const getLatestSemesterScore = (course: Course): number => {
    const parsed = (course.semesters || [])
      .map(parseSemesterLabel)
      .filter((value): value is { year: number; weight: number } => value !== null)
      .sort((left, right) => {
        if (left.year !== right.year) return right.year - left.year;
        return right.weight - left.weight;
      })[0];
    if (!parsed) return -1;
    return parsed.year * 10 + parsed.weight;
  };

  const sortedItems = usesLocalSort
    ? [...items].sort((left, right) => {
        if (sort === "credit") {
          const leftCredit = typeof left.credit === "number" ? left.credit : -1;
          const rightCredit = typeof right.credit === "number" ? right.credit : -1;
          if (leftCredit !== rightCredit) return rightCredit - leftCredit;
          return left.title.localeCompare(right.title);
        }

        const leftScore = getLatestSemesterScore(left);
        const rightScore = getLatestSemesterScore(right);
        if (leftScore !== rightScore) return rightScore - leftScore;
        return left.title.localeCompare(right.title);
      })
    : items;

  const total = usesLocalSort ? sortedItems.length : (count || 0);
  const pages = Math.max(1, Math.ceil(total / size));

  return {
    items: usesLocalSort ? sortedItems.slice(offset, offset + size) : sortedItems,
    total,
    pages,
  };
}
