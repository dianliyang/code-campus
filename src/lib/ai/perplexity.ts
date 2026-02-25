import { SupabaseClient } from '@supabase/supabase-js';
import { Course } from '@/types';
import { applyPromptTemplate } from '@/lib/ai/runtime-config';

export interface EnrolledCourse extends Course {
  progress: number;
  status: string;
  gpa?: number;
  score?: number;
}

export interface UserLearningContext {
  userId: string;
  enrolledCourses: EnrolledCourse[];
  completedCourses: EnrolledCourse[];
  inProgressCourses: EnrolledCourse[];
  availableCourses: Course[];
  fields: string[];
}

export async function fetchUserContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserLearningContext> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('user_courses')
    .select(`
      course_id,
      progress,
      status,
      gpa,
      score
    `)
    .eq('user_id', userId);

  if (enrollError) {
    console.error('Error fetching enrollments:', enrollError);
    throw new Error('Failed to fetch user courses');
  }

  const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

  let enrolledCourses: EnrolledCourse[] = [];
  if (enrolledCourseIds.length > 0) {
    const { data: coursesData, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        course_code,
        university,
        url,
        description,
        units,
        department,
        difficulty,
        popularity,
        workload,
        is_hidden,
        is_internal,
        level,
        corequisites,
        prerequisites,
        instructors,
        details
      `)
      .in('id', enrolledCourseIds);

    if (coursesError) {
      console.error('Error fetching course details:', coursesError);
    } else {
      enrolledCourses = (coursesData || []).map(course => {
        const enrollment = enrollments?.find(e => e.course_id === course.id);
        return {
          id: course.id,
          title: course.title,
          courseCode: course.course_code,
          university: course.university,
          url: course.url,
          description: course.description,
          units: course.units || '',
          department: course.department || '',
          difficulty: course.difficulty || 0,
          popularity: course.popularity,
          workload: course.workload || '',
          isHidden: course.is_hidden,
          isInternal: course.is_internal || false,
          fields: [],
          semesters: [],
          level: course.level || '',
          corequisites: course.corequisites || '',
          prerequisites: course.prerequisites || '',
          instructors: Array.isArray(course.instructors) ? course.instructors : [],
          details: course.details,
          progress: enrollment?.progress || 0,
          status: enrollment?.status || 'in_progress',
          gpa: enrollment?.gpa,
          score: enrollment?.score,
        };
      });
    }
  }

  const { data: fieldsData } = await supabase
    .from('course_fields')
    .select('field, course_id')
    .in('course_id', enrolledCourseIds);

  const fields = Array.from(new Set(fieldsData?.map(f => f.field) || []));

  if (fieldsData) {
    enrolledCourses.forEach(course => {
      const courseFields = fieldsData
        .filter(f => f.course_id === course.id)
        .map(f => f.field);
      course.fields = courseFields;
    });
  }

  const completedCourses = enrolledCourses.filter(c => c.status === 'completed');
  const inProgressCourses = enrolledCourses.filter(c => c.status !== 'completed');

  const { data: availableData, error: availableError } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      course_code,
      university,
      url,
      description,
      units,
      department,
      difficulty,
      popularity,
      workload,
      is_hidden,
      is_internal,
      level,
      corequisites,
      prerequisites,
      instructors,
      details
    `)
    .eq('is_hidden', false)
    .not('id', 'in', `(${enrolledCourseIds.length > 0 ? enrolledCourseIds.join(',') : '0'})`)
    .order('popularity', { ascending: false })
    .limit(30);

  if (availableError) {
    console.error('Error fetching available courses:', availableError);
  }

  const availableCourses: Course[] = (availableData || []).map(course => ({
    id: course.id,
    title: course.title,
    courseCode: course.course_code,
    university: course.university,
    url: course.url,
    description: course.description,
    units: course.units || '',
    department: course.department || '',
    difficulty: course.difficulty || 0,
    popularity: course.popularity,
    workload: course.workload || '',
    isHidden: course.is_hidden,
    isInternal: course.is_internal || false,
    fields: [],
    semesters: [],
    level: course.level || '',
    corequisites: course.corequisites || '',
    prerequisites: course.prerequisites || '',
    instructors: Array.isArray(course.instructors) ? course.instructors : [],
    details: course.details,
  }));

  return {
    userId,
    enrolledCourses,
    completedCourses,
    inProgressCourses,
    availableCourses,
    fields,
  };
}

export function buildSystemPrompt(context: UserLearningContext, template: string): string {
  const completedCourses = context.completedCourses.slice(0, 20);
  const inProgressCourses = context.inProgressCourses.slice(0, 20);
  const availableCourses = context.availableCourses.slice(0, 30);

  const completedCoursesBlock = completedCourses.length > 0
    ? completedCourses.map((c) => {
        const extras = [c.gpa ? `GPA: ${c.gpa}` : "", c.score ? `Score: ${c.score}%` : ""]
          .filter(Boolean)
          .join(" | ");
        return `- ${c.courseCode}: ${c.title} (${c.university})${extras ? ` | ${extras}` : ""}`;
      }).join("\n")
    : "No courses completed yet.";

  const inProgressCoursesBlock = inProgressCourses.length > 0
    ? inProgressCourses.map((c) => `- ${c.courseCode}: ${c.title} (${c.university}) | Progress: ${c.progress}%`).join("\n")
    : "No courses in progress.";

  const fieldsBlock = context.fields.length > 0
    ? context.fields.map((f) => `- ${f}`).join("\n")
    : "Not yet determined.";

  const availableCatalogBlock = availableCourses.map((c) => {
    const lines = [
      `### ${c.courseCode} - ${c.title}`,
      `- University: ${c.university}`,
      c.level ? `- Level: ${c.level}` : "",
      c.difficulty ? `- Difficulty: ${c.difficulty}/10` : "",
      c.workload ? `- Workload: ${c.workload}` : "",
      c.description ? `- Description: ${c.description.slice(0, 100)}...` : "",
      c.prerequisites ? `- Prerequisites: ${c.prerequisites}` : "",
    ].filter(Boolean);
    return lines.join("\n");
  }).join("\n\n");

  return applyPromptTemplate(template, {
    completed_count: String(completedCourses.length),
    in_progress_count: String(inProgressCourses.length),
    available_count: String(availableCourses.length),
    completed_courses: completedCoursesBlock,
    in_progress_courses: inProgressCoursesBlock,
    fields: fieldsBlock,
    available_catalog: availableCatalogBlock,
  });
}
