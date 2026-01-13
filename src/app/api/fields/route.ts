import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function GET() {
  try {
    // Get fields and the count of courses in each
    const sql = `
      SELECT f.name, COUNT(cf.course_id) as count
      FROM fields f
      LEFT JOIN course_fields cf ON f.id = cf.field_id
      GROUP BY f.id
      ORDER BY count DESC
    `;
    const rows = await queryD1<{ name: string; count: number }>(sql);
    
    return NextResponse.json(rows.map(r => ({
      name: r.name,
      count: Number(r.count || 0)
    })));
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}
