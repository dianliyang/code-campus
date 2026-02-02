export interface Course {
  university: string;
  courseCode: string;
  title: string;
  units?: string;
  credit?: number;
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
  semesters?: { term: string; year: number }[];
}
