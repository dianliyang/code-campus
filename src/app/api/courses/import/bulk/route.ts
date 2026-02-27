import { NextResponse } from 'next/server';
import { createAdminClient, getUser } from '@/lib/supabase/server';
import { ImportRequest } from '@/types';
import { rateLimit } from '@/lib/rate-limit';
import { TablesInsert, Json } from '@/lib/supabase/database.types';

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized access denied" }, { status: 401 });
    }

    // Rate limit: 5 requests per 60 seconds per user
    const { success: withinLimit } = rateLimit(`bulk:${user.id}`, 5, 60_000);
    if (!withinLimit) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again in a moment." }, { status: 429 });
    }

    const courses = await request.json() as ImportRequest[];
    if (!Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json({ error: "Invalid or empty course list" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    
    // Prepare courses for bulk upsert - De-duplicate locally first to avoid DB errors
    const uniqueCoursesMap = new Map<string, TablesInsert<'courses'>>();

    courses.forEach(course => {
      const key = `${course.university}-${course.courseCode}`;
      if (!uniqueCoursesMap.has(key)) {
        const base: TablesInsert<'courses'> = {
          university: course.university,
          course_code: course.courseCode,
          title: course.title,
          description: course.description || "",
          url: course.url || "#",
          level: course.level || "undergraduate",
          units: course.units || "",
          department: course.department || "",
          popularity: 0,
          details: (course.details as Json) || {},
          corequisites: course.corequisites || "",
          workload: course.workload || 0,
          difficulty: course.difficulty || 0
        };

        const c = course as ImportRequest & { isInternal?: boolean; semester?: string; score?: number | string };
        if (c.isInternal !== undefined) {
          base.is_internal = c.isInternal;
        }
        
        const credit = c.credit;
        if (credit !== undefined) {
             base.credit = typeof credit === 'string' ? parseFloat(credit) : credit;
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
          return rest as TablesInsert<'courses'>;
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

    // Collect all semesters, course-semester links, and enrollments for batch processing
    const courseMap = new Map(
      (upsertedCourses || []).map(c => [`${c.university}-${c.course_code}`, c])
    );

    const uniqueSemesters = new Map<string, { year: number; term: string }>();
    const semesterCourseLinks: { semKey: string; courseId: number }[] = [];
    const enrollments: TablesInsert<'user_courses'>[] = [];
    const now = new Date().toISOString();

    for (const course of courses) {
      const dbCourse = courseMap.get(`${course.university}-${course.courseCode}`);
      if (!dbCourse) continue;

      const c = course as ImportRequest & { semester?: string; score?: number | string; semesters?: { term: string; year: number }[] };

      // Collect semester data (String format)
      if (c.semester) {
        const parts = c.semester.split(' ');
        if (parts.length >= 2) {
          const year = parseInt(parts[0].split('-')[0]);
          const term = parts[1];
          const semKey = `${year}-${term}`;
          uniqueSemesters.set(semKey, { year, term });
          semesterCourseLinks.push({ semKey, courseId: dbCourse.id });
        }
      }
      
      // Collect semester data (Array format)
      if (c.semesters && Array.isArray(c.semesters)) {
          c.semesters.forEach(s => {
              if (s.year && s.term) {
                  const semKey = `${s.year}-${s.term}`;
                  uniqueSemesters.set(semKey, { year: s.year, term: s.term });
                  semesterCourseLinks.push({ semKey, courseId: dbCourse.id });
              }
          });
      }

      // Collect enrollment data
      if (c.score !== undefined) {
        const score = typeof c.score === 'string' ? parseFloat(c.score) : c.score;
        enrollments.push({
          user_id: user.id,
          course_id: dbCourse.id,
          status: 'completed',
          progress: 100,
          score,
          gpa: parseFloat(score >= 60 ? (score / 20).toFixed(2) : "0.00"),
          updated_at: now
        });
      }
    }

    // Batch upsert semesters
    if (uniqueSemesters.size > 0) {
      const { data: semData } = await adminSupabase
        .from('semesters')
        .upsert(Array.from(uniqueSemesters.values()), { onConflict: 'year,term' })
        .select('id, year, term');

      // Batch upsert course-semester links
      if (semData && semesterCourseLinks.length > 0) {
        const semIdMap = new Map(semData.map(s => [`${s.year}-${s.term}`, s.id]));
        const links = semesterCourseLinks
          .map(({ semKey, courseId }) => {
            const semesterId = semIdMap.get(semKey);
            return semesterId ? { course_id: courseId, semester_id: semesterId } : null;
          })
          .filter((l): l is { course_id: number; semester_id: number } => l !== null);

        if (links.length > 0) {
          await adminSupabase
            .from('course_semesters')
            .upsert(links, { onConflict: 'course_id,semester_id' });
        }
      }
    }

    // Batch upsert enrollments
    if (enrollments.length > 0) {
      await adminSupabase
        .from('user_courses')
        .upsert(enrollments, { onConflict: 'user_id,course_id' });
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