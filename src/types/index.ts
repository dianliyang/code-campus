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
  workload?: number;
  subdomain?: string;
  resources?: string[];
  category?: string;
  isHidden: boolean;
  isInternal?: boolean;
  createdAt?: string;
  fields: string[];
  semesters: string[];
  level?: string;
  corequisites?: string;
  instructors?: string[];
  prerequisites?: string;
  crossListedCourses?: string;
  details?: {
    prerequisites?: string;
    resources?: string[];
    crossListedCourses?: string;
    instructors?: string[];
    schedule?: Record<string, string[]>;
    internalId?: string;
    [key: string]: unknown;
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

export interface Semester {
  year: number;
  term: string;
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
  details?: Record<string, unknown>;
  corequisites?: string;
  semesters?: Semester[];
  workload?: number;
  difficulty?: number;
  subdomain?: string;
  resources?: string[];
  category?: string;
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

export interface Workout {
  id: number;
  source: string;
  courseCode: string;
  category: string;
  categoryEn: string | null;
  title: string;
  titleEn: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  locationEn: string | null;
  instructor: string | null;
  startDate: string | null;
  endDate: string | null;
  priceStudent: number | null;
  priceStaff: number | null;
  priceExternal: number | null;
  priceExternalReduced: number | null;
  bookingStatus: string | null;
  bookingUrl: string | null;
  url: string | null;
  semester: string | null;
  details: Record<string, unknown> | null;
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
