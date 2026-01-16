export interface Course {
  id: number;
  title: string;
  courseCode: string;
  university: string;
  url: string;
  description: string;
  popularity: number;
  workload: string;
  isHidden: boolean;
  isInternal?: boolean;
  fields: string[];
  semesters: string[];
  level?: string;
  corequisites?: string;
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
  action: 'enroll' | 'unenroll' | 'update_progress';
  progress?: number;
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
