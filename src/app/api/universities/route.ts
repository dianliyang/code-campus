import { NextResponse } from 'next/server';
import { queryD1 } from '@/lib/d1';

export async function GET() {
  try {
    const rows = await queryD1<{ university: string; count: number }>('SELECT university, count(*) as count FROM courses GROUP BY university');
    
    const universities = rows.map(r => ({
      name: r.university,
      count: Number(r.count || 0)
    })).filter(u => u.name);
    
    return NextResponse.json(universities, {
      headers: {
        'Cache-Control': 'no-store, max-age=0', // Disable caching to ensure fresh data
      },
    });
  } catch (error) {
    console.error("Error fetching universities:", error);
    return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 });
  }
}
