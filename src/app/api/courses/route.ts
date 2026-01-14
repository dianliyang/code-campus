import { NextResponse } from 'next/server';
import { queryD1, mapCourseFromRow } from '@/lib/d1';
import { auth } from '@/auth';

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const size = parseInt(searchParams.get('size') || '10');
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
    let whereClause = 'WHERE is_hidden = 0';
    // Deduplication subquery: only keep the row with the minimum ID for each course_code
    whereClause += ' AND c.id IN (SELECT MIN(id) FROM courses GROUP BY course_code)';
    
    const queryParams: (string | number)[] = [];

    if (enrolledOnly) {
      whereClause += ` AND c.id IN (SELECT course_id FROM user_courses WHERE user_id = (SELECT id FROM users WHERE email = ? LIMIT 1))`;
      queryParams.push(session.user?.email || "");
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
      whereClause += ` AND c.id IN (
        SELECT cf.course_id 
        FROM course_fields cf 
        JOIN fields f ON cf.field_id = f.id 
        WHERE f.name IN (${placeholders})
      )`;
      queryParams.push(...fields);
    }

    if (levels.length > 0) {
      const placeholders = levels.map(() => '?').join(',');
      whereClause += ` AND level IN (${placeholders})`;
      queryParams.push(...levels);
    }

    // Sorting logic
    let orderBy = 'ORDER BY c.id DESC';
    if (sort === 'popularity') {
      orderBy = 'ORDER BY c.popularity DESC, c.id DESC';
    } else if (sort === 'newest') {
      orderBy = 'ORDER BY c.created_at DESC';
    } else if (sort === 'title') {
      orderBy = 'ORDER BY c.title ASC';
    }

    // Get total count
    const countSql = `SELECT count(*) as count FROM courses c ${whereClause}`;
    const countResult = await queryD1<{ count: number }>(countSql, queryParams);
    const total = Number(countResult[0]?.count || 0);
    const pages = Math.max(1, Math.ceil(total / size));

    // Get paginated items
    const selectSql = `
      SELECT c.id, c.university, c.course_code, c.title, c.units, c.description, c.url, c.department, c.corequisites, c.level, c.difficulty, c.popularity, c.workload, c.created_at,
             GROUP_CONCAT(DISTINCT f.name) as field_names,
             GROUP_CONCAT(DISTINCT s.term || ' ' || s.year) as semester_names
      FROM courses c
      LEFT JOIN course_fields cf ON c.id = cf.course_id
      LEFT JOIN fields f ON cf.field_id = f.id
      LEFT JOIN course_semesters cs ON c.id = cs.course_id
      LEFT JOIN semesters s ON cs.semester_id = s.id
      ${whereClause}
      GROUP BY c.id
      ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const selectParams = [...queryParams, size, offset];
    
    const rows = await queryD1<Record<string, unknown>>(selectSql, selectParams);

    const items = rows.map(row => {
      const course = mapCourseFromRow(row);
      // Remove details and isHidden to keep response light
      const { ...lightCourse } = course;
      const fields = row.field_names ? (row.field_names as string).split(',') : [];
      const semesters = row.semester_names ? (row.semester_names as string).split(',') : [];
      return { 
        ...lightCourse, 
        fields,
        semesters,
        level: row.level as string,
        corequisites: row.corequisites as string
      };
    });

    const response = NextResponse.json({
      items,
      total,
      page,
      size,
      pages
    });

    // Add Cache-Control: s-maxage=60 (Cache on edge for 60s), stale-while-revalidate
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
