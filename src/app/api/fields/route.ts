import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


export async function GET() {
  try {
    const supabase = await createClient();
    const { data: fields, error } = await supabase
      .from('fields')
      .select('name, course_fields(count)');

    if (error) throw error;

    const formattedFields = (fields || []).map((f: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      name: f.name as string,
      count: (f.course_fields as { count: number }[] | null)?.[0]?.count || 0
    })).sort((a, b) => b.count - a.count);

    return NextResponse.json({ fields: formattedFields });
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}
