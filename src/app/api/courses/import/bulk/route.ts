import { NextResponse } from 'next/server';
import { createAdminClient, getUser } from '@/lib/supabase/server';
import { ImportRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access denied" }, { status: 401 });
    }

    const courses = await request.json() as ImportRequest[];
    if (!Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({ error: "Invalid or empty course list" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    
    // Prepare courses for bulk upsert - De-duplicate locally first to avoid DB errors
    const uniqueCoursesMap = new Map<string, Record<string, unknown>>();
    
    courses.forEach(course => {
      const key = `${course.university}-${course.courseCode}`;
      if (!uniqueCoursesMap.has(key)) {
        const base: Record<string, unknown> = {
          university: course.university,
          course_code: course.courseCode,
          title: course.title,
          description: course.description || "",
          url: course.url || "#",
          level: course.level || "undergraduate",
          units: course.units || "",
          department: course.department || "",
          popularity: 0
        };
        
        const c = course as ImportRequest & { isInternal?: boolean; semester?: string; score?: number | string };
        if (c.isInternal !== undefined) {
          base.is_internal = c.isInternal;
        }
        uniqueCoursesMap.set(key, base);
      }
    });

    const coursesToUpsert = Array.from(uniqueCoursesMap.values());

    // Perform bulk upsert
    const { data: initialData, error: upsertError } = await adminSupabase
      .from('courses')
      .upsert(coursesToUpsert, { onConflict: 'university,course_code' })
      .select('id, university, course_code');

    let upsertedCourses = initialData;

    if (upsertError) {
      console.error("Bulk upsert error details:", upsertError);
      // If column is missing, try again without is_internal
      if (upsertError.message.includes('is_internal')) {
        const fallbackCourses = coursesToUpsert.map((c) => {
          const { is_internal: _isInternal, ...rest } = c; // eslint-disable-line @typescript-eslint/no-unused-vars
          return rest;
        });
        const { data: retryData, error: retryError } = await adminSupabase
          .from('courses')
          .upsert(fallbackCourses, { onConflict: 'university,course_code' })
          .select('id, university, course_code');
        
        if (retryError) throw retryError;
        upsertedCourses = retryData;
      } else {
        throw upsertError;
      }
    }

    // Process semesters and enrollments
    for (const course of courses) {
      const dbCourse = upsertedCourses?.find(c => c.university === course.university && c.course_code === course.courseCode);
      if (!dbCourse) continue;

      const c = course as ImportRequest & { semester?: string; score?: number | string };

      // 1. Connect Semester
      const semesterStr = c.semester;
      if (semesterStr) {
        const parts = semesterStr.split(' ');
        if (parts.length >= 2) {
          const yearRange = parts[0];
          const term = parts[1];
          const year = parseInt(yearRange.split('-')[0]); 

          // Upsert semester
          const { data: semData } = await adminSupabase
            .from('semesters')
            .upsert({ year, term }, { onConflict: 'year,term' })
            .select('id')
            .single();

          if (semData) {
            await adminSupabase
              .from('course_semesters')
              .upsert({ course_id: dbCourse.id, semester_id: semData.id }, { onConflict: 'course_id,semester_id' });
          }
        }
      }

      // 2. Automatic Enrollment if score exists
      const scoreValue = c.score;
      if (scoreValue !== undefined) {
        const score = typeof scoreValue === 'string' ? parseFloat(scoreValue) : scoreValue;
        const gpa = score >= 60 ? (score / 20).toFixed(2) : "0.00";
        
        await adminSupabase
          .from('user_courses')
          .upsert({
            user_id: user.id,
            course_id: dbCourse.id,
            status: 'completed',
            progress: 100,
            score: score,
            gpa: parseFloat(gpa),
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,course_id' });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${coursesToUpsert.length} courses and updated user roadmap.` 
    });
  } catch (error: unknown) {
    const e = error as { message?: string; details?: string };
    const errorMessage = e.message || e.details || String(error);
    console.error("Bulk import error:", error);
    return NextResponse.json({ 
      error: "Batch processing failure", 
      details: errorMessage
    }, { status: 500 });
  }
}