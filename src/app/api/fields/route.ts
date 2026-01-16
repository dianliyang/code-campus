import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = "edge";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: fields, error } = await supabase
      .from('fields')
      .select('name, course_fields(count)');

    if (error) throw error;

    const formattedFields = (fields || []).map((f: any) => ({
      name: f.name,
      count: f.course_fields?.[0]?.count || 0
    })).sort((a, b) => b.count - a.count);

    return NextResponse.json({ fields: formattedFields });
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}
