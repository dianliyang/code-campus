export interface Course {
  id: number;
  title: string;
  courseCode: string;
  university: string;
  url: string;
  description: string;
  units?: string;
  credit?: number;
  department?: string;
  difficulty?: number;
  popularity: number;
  workload: string;
  isHidden: boolean;
  isInternal?: boolean;
  fields: string[];
  semesters: string[];
  level?: string;
  corequisites?: string;
  details?: {
    prerequisites?: string;
    relatedUrls?: string[];
    crossListedCourses?: string;
  };
  enrolled?: boolean;
  status?: string;
  progress?: number;
}

export interface University {
  name: string;
  count: number;
}

export interface Field {
  name: string;
  count: number;
}

export interface EnrollRequest {
  courseId: number;
  action: 'enroll' | 'unenroll' | 'update_progress' | 'hide';
  progress?: number;
  gpa?: number;
  score?: number;
}

export interface ImportRequest {
  university: string;
  courseCode: string;
  title: string;
  description?: string;
  url?: string;
  level?: string;
  isInternal?: boolean;
  units?: string;
  credit?: string | number;
  department?: string;
}

export interface EnrolledCoursesResponse {
  enrolledIds: number[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
}

export interface AILearningPathRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
}

export interface CourseRecommendation {
  courseId: number;
  title: string;
  university: string;
  courseCode: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  prerequisites: string[];
}
