export interface Course {
  university: string;
  courseCode: string;
  title: string;
  units?: string;
  description?: string;
  url?: string;
  department?: string;
  corequisites?: string;
  level?: string;
  difficulty?: number;
  details?: Record<string, unknown>;
  popularity?: number;
  workload?: string;
  isHidden?: boolean;
  isInternal?: boolean;
  fields?: string[];
}
