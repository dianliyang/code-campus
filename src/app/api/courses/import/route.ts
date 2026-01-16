import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ImportRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json() as ImportRequest;
    const { university, courseCode, title, description, url, level } = body;

    if (!university || !courseCode || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if course already exists
    const { data: existing, error: checkError } = await supabase
      .from('courses')
      .select('id')
      .eq('course_code', courseCode)
      .limit(1);

    if (checkError) throw checkError;
    
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Course code already registered in system" }, { status: 409 });
    }

    // Insert new course
    const { error: insertError } = await supabase
      .from('courses')
      .insert({
        university,
        course_code: courseCode,
        title,
        description: description || "",
        url: url || "#",
        level: level || "undergraduate",
        popularity: 0
      });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, message: "Course successfully added to the catalog" });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "System initialization failure" }, { status: 500 });
  }
}
