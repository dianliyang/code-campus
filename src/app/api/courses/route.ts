import { NextResponse } from 'next/server';
import { queryD1, mapCourseFromRow } from '@/lib/d1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const size = parseInt(searchParams.get('size') || '10');
  const offset = (page - 1) * size;
  
  const universitiesParam = searchParams.get('universities');
  const universities = universitiesParam ? universitiesParam.split(',').filter(Boolean) : [];

  try {
    let whereClause = '';
    const queryParams: (string | number)[] = [];

    if (universities.length > 0) {
      const placeholders = universities.map(() => '?').join(',');
      whereClause = `WHERE university IN (${placeholders})`;
      queryParams.push(...universities);
    }

    // Get total count
    const countSql = `SELECT count(*) as count FROM courses ${whereClause}`;
    const countResult = await queryD1<{ count: number }>(countSql, queryParams);
    const total = countResult[0]?.count || 0;
    const pages = Math.ceil(total / size);

    // Get paginated items
    const selectSql = `SELECT * FROM courses ${whereClause} LIMIT ? OFFSET ?`;
    const selectParams = [...queryParams, size, offset];
    
    const rows = await queryD1<Record<string, unknown>>(selectSql, selectParams);

    const items = rows.map(mapCourseFromRow);

    return NextResponse.json({
      items,
      total,
      page,
      size,
      pages
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
