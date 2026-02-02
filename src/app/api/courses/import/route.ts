import { NextResponse } from 'next/server';
import { createAdminClient, getUser } from '@/lib/supabase/server';
import { ImportRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access denied" }, { status: 401 });
    }

    const body = await request.json() as ImportRequest;
    const { university, courseCode, title, description, url, level, units, credit, department, isInternal } = body;

    if (!university || !courseCode || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Check if course already exists (Note: with our new UNIQUE constraint, we could also just use upsert here)
    const { data: existing, error: checkError } = await adminSupabase
      .from('courses')
      .select('id')
      .eq('course_code', courseCode)
      .eq('university', university)
      .limit(1);

    if (checkError) {
      console.error("Database check error:", checkError);
      throw checkError;
    }
    
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Course code already registered for this university" }, { status: 409 });
    }

    const creditValue = typeof credit === 'string' ? parseFloat(credit) : credit;

    // Insert new course
    const { error: insertError } = await adminSupabase
      .from('courses')
      .insert({
        university,
        course_code: courseCode,
        title,
        description: description || "",
        url: url || "#",
        level: level || "undergraduate",
        is_internal: isInternal || false,
        units: units || "",
        credit: isNaN(creditValue as number) ? null : creditValue,
        department: department || "",
        popularity: 0
      });

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true, message: "Course successfully added to the catalog" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Import error details:", error);
    return NextResponse.json({ 
      error: "Internal server error during import", 
      details: errorMessage 
    }, { status: 500 });
  }
}