import { NextResponse } from 'next/server';
import { runD1, queryD1 } from '@/lib/d1';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { university, courseCode, title, description, url, level } = body;

    if (!university || !courseCode || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if course already exists
    const existing = await queryD1('SELECT id FROM courses WHERE course_code = ? LIMIT 1', [courseCode]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Course code already registered in system" }, { status: 409 });
    }

    // Insert new course
    await runD1(`
      INSERT INTO courses (university, course_code, title, description, url, level, popularity)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `, [university, courseCode, title, description || "", url || "#", level || "undergraduate"]);

    return NextResponse.json({ success: true, message: "Course successfully added to the catalog" });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "System initialization failure" }, { status: 500 });
  }
}
