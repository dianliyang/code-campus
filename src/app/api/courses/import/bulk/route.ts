import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ImportRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const courses = await request.json() as ImportRequest[];
    const supabase = await createClient();
    
    // Prepare courses for bulk insert
    const coursesToInsert = courses.map(course => ({
      university: course.university,
      course_code: course.courseCode,
      title: course.title,
      description: course.description || "",
      url: course.url || "#",
      level: course.level || "undergraduate",
      popularity: 0
    }));

    // Perform bulk upsert (using course_code as unique identifier if configured, 
    // otherwise just insert and handle errors)
    const { data, error } = await supabase
      .from('courses')
      .upsert(coursesToInsert, { onConflict: 'course_code' });

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      message: `Bulk operation complete. Courses processed.` 
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Batch processing failure" }, { status: 500 });
  }
}
