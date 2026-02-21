import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: courseFields, error } = await supabase
      .from('course_fields')
      .select('fields(name), courses!inner(id)')
      .eq('courses.is_hidden', false);

    if (error) throw error;

    const fieldCounts: Record<string, number> = {};
    courseFields?.forEach((cf: Record<string, unknown>) => {
      const name = (cf.fields as { name: string } | null)?.name;
      if (name) fieldCounts[name] = (fieldCounts[name] || 0) + 1;
    });
    const formattedFields = Object.entries(fieldCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const response = NextResponse.json({ fields: formattedFields });
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=600');
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=600');
    return response;
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}
