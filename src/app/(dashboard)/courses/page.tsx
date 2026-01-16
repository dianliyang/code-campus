import { Suspense } from "react";
import Hero from "@/components/home/Hero";
import Sidebar from "@/components/home/Sidebar";
import CourseList from "@/components/home/CourseList";
import { queryD1, mapCourseFromRow } from "@/lib/d1";
import { University, Field, Course } from "@/types";
import { auth } from "@/auth";
import { getLanguage } from "@/actions/language";
import { getDictionary } from "@/lib/dictionary";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CoursesPage({ searchParams }: PageProps) {
  const session = await auth();
  const lang = await getLanguage();
  const dict = await getDictionary(lang);
  const params = await searchParams;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Hero dict={dict.dashboard} />
      
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarData />
        </Suspense>
        
        <Suspense fallback={<CourseListSkeleton />}>
          <CourseListData params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function SidebarData() {
  const [dbUniversities, dbFields] = await Promise.all([
    queryD1<University>('SELECT university as name, COUNT(*) as count FROM courses WHERE is_hidden = 0 GROUP BY university ORDER BY count DESC'),
    queryD1<Field>('SELECT f.name, COUNT(cf.course_id) as count FROM fields f JOIN course_fields cf ON f.id = cf.field_id GROUP BY f.id ORDER BY count DESC'),
  ]);

  return <Sidebar universities={dbUniversities} fields={dbFields} enrolledCount={0} />;
}

async function CourseListData({ params }: { params: { [key: string]: string | string[] | undefined } }) {
  const session = await auth();
  const page = parseInt((params.page as string) || "1");
  const size = 10;
  const offset = (page - 1) * size;
  const query = (params.q as string) || "";
  const sort = (params.sort as string) || "relevance";
  const enrolledOnly = params.enrolled === "true";
  
  const universities = ((params.universities as string) || "").split(",").filter(Boolean);
  const fields = ((params.fields as string) || "").split(",").filter(Boolean);
  const levels = ((params.levels as string) || "").split(",").filter(Boolean);

  let initialEnrolledIds: number[] = [];
  const email = session?.user?.email || "guest@codecampus.example.com";
  const enrolledRows = await queryD1<{ course_id: number }>(
    'SELECT course_id FROM user_courses WHERE user_id = (SELECT id FROM users WHERE email = ? LIMIT 1)',
    [email]
  );
  initialEnrolledIds = enrolledRows.map(r => r.course_id);

  const dbCourses = await fetchCourses(page, size, offset, query, sort, enrolledOnly, universities, fields, levels, email);

  return (
    <CourseList 
      initialCourses={dbCourses.items}
      totalItems={dbCourses.total}
      totalPages={dbCourses.pages}
      currentPage={page}
      initialEnrolledIds={initialEnrolledIds}
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
  userEmail?: string | null
) {
  let whereClause = 'WHERE is_hidden = 0';
  whereClause += ' AND c.id IN (SELECT MIN(id) FROM courses GROUP BY course_code)';
  const queryParams: (string | number)[] = [];

  if (enrolledOnly) {
    if (!userEmail) return { items: [], total: 0, pages: 0 };
    whereClause += ` AND c.id IN (SELECT course_id FROM user_courses WHERE user_id = (SELECT id FROM users WHERE email = ? LIMIT 1))`;
    queryParams.push(userEmail);
  }

  if (query) {
    whereClause += ` AND (c.title LIKE ? OR c.description LIKE ? OR c.course_code LIKE ?)`;
    const searchPattern = `%${query}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern);
  }

  if (universities.length > 0) {
    const placeholders = universities.map(() => '?').join(',');
    whereClause += ` AND university IN (${placeholders})`;
    queryParams.push(...universities);
  }

  if (fields.length > 0) {
    const placeholders = fields.map(() => '?').join(',');
    whereClause += ` AND c.id IN (SELECT cf.course_id FROM course_fields cf JOIN fields f ON cf.field_id = f.id WHERE f.name IN (${placeholders}))`;
    queryParams.push(...fields);
  }

  if (levels.length > 0) {
    const placeholders = levels.map(() => '?').join(',');
    whereClause += ` AND level IN (${placeholders})`;
    queryParams.push(...levels);
  }

  let orderBy = 'ORDER BY c.id DESC';
  if (sort === 'popularity') orderBy = 'ORDER BY c.popularity DESC, c.id DESC';
  else if (sort === 'newest') orderBy = 'ORDER BY c.created_at DESC';
  else if (sort === 'title') orderBy = 'ORDER BY c.title ASC';

  const countResult = await queryD1<{ count: number }>(`SELECT count(*) as count FROM courses c ${whereClause}`, queryParams);
  const total = Number(countResult[0]?.count || 0);
  const pages = Math.max(1, Math.ceil(total / size));

  const selectSql = `
    SELECT c.id, c.university, c.course_code, c.title, c.units, c.description, c.url, c.department, c.corequisites, c.level, c.difficulty, c.popularity, c.workload, c.created_at,
           (SELECT GROUP_CONCAT(f.name) FROM course_fields cf JOIN fields f ON cf.field_id = f.id WHERE cf.course_id = c.id) as field_names,
           (SELECT GROUP_CONCAT(s.term || ' ' || s.year) FROM course_semesters cs JOIN semesters s ON cs.semester_id = s.id WHERE cs.course_id = c.id) as semester_names
    FROM courses c
    ${whereClause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const rows = await queryD1<Record<string, unknown>>(selectSql, [...queryParams, size, offset]);

  const items = rows.map(row => {
    const course = mapCourseFromRow(row);
    const { ...lightCourse } = course;
    const fields = row.field_names ? (row.field_names as string).split(',') : [];
    const semesters = row.semester_names ? (row.semester_names as string).split(',') : [];
    return { ...lightCourse, fields, semesters, level: row.level as string, corequisites: row.corequisites as string } as Course;
  });

  return { items, total, pages };
}

function SidebarSkeleton() {
  return <div className="w-64 space-y-8 animate-pulse"><div className="h-4 bg-gray-100 rounded w-1/2"></div><div className="space-y-4"><div className="h-8 bg-gray-50 rounded"></div><div className="h-8 bg-gray-50 rounded"></div></div></div>;
}

function CourseListSkeleton() {
  return <div className="flex-grow space-y-4 animate-pulse"><div className="h-10 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div><div className="h-40 bg-gray-50 rounded w-full"></div></div>;
}