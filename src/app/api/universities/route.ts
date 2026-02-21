import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: courses, error } = await supabase
      .from('courses')
      .select('university')
      .eq('is_hidden', false);

    if (error) throw error;

    const counts: Record<string, number> = {};
    courses?.forEach(c => {
      counts[c.university] = (counts[c.university] || 0) + 1;
    });

    const rows = Object.entries(counts).map(([university, count]) => ({
      university,
      count
    })).sort((a, b) => b.count - a.count);

    const response = NextResponse.json({ universities: rows });
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=600');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=600');
    return response;
  } catch (error) {
    console.error("Error fetching universities:", error);
    return NextResponse.json({ error: "Failed to fetch universities" }, { status: 500 });
  }
}
