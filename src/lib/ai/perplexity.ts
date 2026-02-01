import { SupabaseClient } from '@supabase/supabase-js';
import { Course } from '@/types';

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
  // Fetch user's enrolled courses
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

  // Fetch enrolled course details
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
        details
      `)
      .in('id', enrolledCourseIds);

    if (coursesError) {
      console.error('Error fetching course details:', coursesError);
    } else {
      // Map course data to EnrolledCourse with enrollment info
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
          details: course.details,
          progress: enrollment?.progress || 0,
          status: enrollment?.status || 'in_progress',
          gpa: enrollment?.gpa,
          score: enrollment?.score,
        };
      });
    }
  }

  // Fetch fields from course_fields table
  const { data: fieldsData } = await supabase
    .from('course_fields')
    .select('field, course_id')
    .in('course_id', enrolledCourseIds);

  const fields = Array.from(new Set(fieldsData?.map(f => f.field) || []));

  // Add fields to enrolled courses
  if (fieldsData) {
    enrolledCourses.forEach(course => {
      const courseFields = fieldsData
        .filter(f => f.course_id === course.id)
        .map(f => f.field);
      course.fields = courseFields;
    });
  }

  // Split enrolled courses into completed and in-progress
  const completedCourses = enrolledCourses.filter(c => c.status === 'completed');
  const inProgressCourses = enrolledCourses.filter(c => c.status !== 'completed');

  // Fetch available courses (excluding enrolled ones)
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
      details
    `)
    .eq('is_hidden', false)
    .not('id', 'in', `(${enrolledCourseIds.length > 0 ? enrolledCourseIds.join(',') : '0'})`)
    .order('popularity', { ascending: false })
    .limit(100);

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

export function buildSystemPrompt(context: UserLearningContext): string {
  const { completedCourses, inProgressCourses, availableCourses, fields } = context;

  let prompt = `You are an expert academic advisor helping students plan their learning path in computer science and related fields.

## User's Current Learning Profile

### Completed Courses (${completedCourses.length})
`;

  if (completedCourses.length > 0) {
    completedCourses.forEach(c => {
      prompt += `- **${c.courseCode}**: ${c.title} (${c.university})`;
      if (c.gpa) prompt += ` - GPA: ${c.gpa}`;
      if (c.score) prompt += ` - Score: ${c.score}%`;
      prompt += `\n`;
    });
  } else {
    prompt += `No courses completed yet.\n`;
  }

  prompt += `\n### Currently Enrolled Courses (${inProgressCourses.length})\n`;

  if (inProgressCourses.length > 0) {
    inProgressCourses.forEach(c => {
      prompt += `- **${c.courseCode}**: ${c.title} (${c.university}) - Progress: ${c.progress}%\n`;
    });
  } else {
    prompt += `No courses in progress.\n`;
  }

  prompt += `\n### Fields of Interest\n`;
  if (fields.length > 0) {
    prompt += fields.map(f => `- ${f}`).join('\n') + '\n';
  } else {
    prompt += `Not yet determined.\n`;
  }

  prompt += `\n## Available Course Catalog (Top ${availableCourses.length} by popularity)

`;

  availableCourses.slice(0, 50).forEach(c => {
    prompt += `### ${c.courseCode} - ${c.title}\n`;
    prompt += `- **University**: ${c.university}\n`;
    if (c.level) prompt += `- **Level**: ${c.level}\n`;
    if (c.difficulty) prompt += `- **Difficulty**: ${c.difficulty}/10\n`;
    if (c.workload) prompt += `- **Workload**: ${c.workload}\n`;
    if (c.description) prompt += `- **Description**: ${c.description.slice(0, 200)}...\n`;
    if (c.details?.prerequisites) prompt += `- **Prerequisites**: ${c.details.prerequisites}\n`;
    prompt += `\n`;
  });

  prompt += `\n## Your Role

Provide personalized course recommendations based on:
1. The user's completed courses and current knowledge
2. Logical prerequisite progression
3. Course difficulty and workload balance
4. The user's fields of interest
5. Industry relevance and skill development

## Guidelines

- Suggest specific courses from the catalog above
- Explain why each course is recommended
- Consider prerequisite requirements
- Balance workload and difficulty
- Create realistic semester-by-semester plans when asked
- Identify knowledge gaps and suggest foundational courses
- Be conversational and encouraging
- Reference specific course codes and universities

If the user has no courses yet, suggest excellent starting points based on common CS fundamentals.`;

  return prompt;
}
